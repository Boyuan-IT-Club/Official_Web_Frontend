import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { request } from "@/utils";

/** ===== Types ===== */

export type ID = string | number;

export interface FieldValueItem {
  fieldId: ID;
  fieldValue: unknown; // 这里先用 unknown，后续你可以按字段定义细化成 string | number | string[] | object...
  valueId?: ID | null;
  resumeId?: ID;
}

export interface ResumeEntity {
  resume_id: ID | null;
  id: ID | null;
  status: number;
  submittedAt?: string | null;
  // 你在 initializeFieldValuesFromResume 里用到了 simpleFields
  simpleFields?: Array<{
    fieldId: ID;
    fieldValue: unknown;
    valueId?: ID | null;
  }>;
  // 其他字段先不强约束，避免卡迁移
  [key: string]: unknown;
}

export interface PaginationState {
  current: number; // 前端从1开始
  pageSize: number;
  total: number;
}

export interface SearchParamsState {
  searchText: string;
  searchType: "name" | "major";
  expectedDepartment: string;
  statusFilter: string;
  sortBy: string;
  sortOrder: "ASC" | "DESC";
}

export interface AdminFetchResumesParams {
  // 你代码里会遍历 keys 并 append，值可能是 string/number
  [key: string]: string | number | undefined | null;
  page?: number | string;
  size?: number | string;
  status?: string;
  name?: string;
  major?: string;
  expectedDepartment?: string;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC" | string;
}

export interface AdminFetchResumesResult {
  params: AdminFetchResumesParams;
  data: any[]; // 列表项结构没给接口文档，这里先 any
  total: number;
  page: number;
  size: number;
}

export interface ResumeState {
  // 用户提交简历相关
  cycleId: number;
  fields: any[];
  fieldDefinitions: any[];
  resume: ResumeEntity | null;
  fieldValues: FieldValueItem[];
  loading: boolean;
  submitting: boolean;
  updating: boolean;
  error: string | null;

  // 管理员相关
  pagination: PaginationState;
  resumes: any[];
  currentResume: any | null;
  adminLoading: boolean;
  detailLoading: boolean;
  adminError: string | null;
  detailError: string | null;
  searchParams: SearchParamsState;
}

/** 为 createAsyncThunk 统一约束 rejectValue 类型 */
type ThunkApiConfig = { rejectValue: string };

/** ===== Thunks（参数类型先收紧，返回值先宽松） ===== */

// 获取字段定义
export const fetchResumeFields = createAsyncThunk<any, ID, ThunkApiConfig>(
  "resume/fetchResumeFields",
  async (cycleId, { rejectWithValue }) => {
    try {
      const res = await request.get(`/api/resumes/fields/${cycleId}`);
      return res.data;
    } catch (error: any) {
      return rejectWithValue(
        error?.response?.data?.message || error?.message || "请求失败",
      );
    }
  },
);

// 获取或创建简历
export const fetchOrCreateResume = createAsyncThunk<any, ID, ThunkApiConfig>(
  "resume/fetchOrCreateResume",
  async (cycleId, { rejectWithValue }) => {
    try {
      const res = await request.get(`/api/resumes/cycle/${cycleId}`);
      return res.data;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        try {
          const createRes = await request.post(`/api/resumes/cycle/${cycleId}`);
          return createRes.data;
        } catch (createError: any) {
          return rejectWithValue(
            createError?.response?.data?.message ||
              createError?.message ||
              "创建失败",
          );
        }
      }
      return rejectWithValue(
        error?.response?.data?.message || error?.message || "请求失败",
      );
    }
  },
);

// 获取字段值
export const fetchFieldValues = createAsyncThunk<any, ID, ThunkApiConfig>(
  "resume/fetchFieldValues",
  async (cycleId, { rejectWithValue }) => {
    try {
      const res = await request.get(
        `/api/resumes/cycle/${cycleId}/field-values`,
      );
      return res.data;
    } catch (error: any) {
      return rejectWithValue(
        error?.response?.data?.message || error?.message || "请求失败",
      );
    }
  },
);

// 保存字段值
export const saveFieldValues = createAsyncThunk<
  any,
  {
    cycleId: ID;
    fieldValues: FieldValueItem[];
    resumeId: ID | null | undefined;
  },
  ThunkApiConfig
>(
  "resume/saveFieldValues",
  async ({ cycleId, fieldValues, resumeId }, { rejectWithValue }) => {
    try {
      if (!resumeId) return rejectWithValue("简历ID不存在");

      const fieldValuesWithResumeId = fieldValues
        .filter(
          (item) => item.fieldValue !== null && item.fieldValue !== undefined,
        )
        .map((item) => ({ ...item, resumeId }));

      const res = await request.post(
        `/api/resumes/cycle/${cycleId}/field-values`,
        fieldValuesWithResumeId,
      );
      return res.data;
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error("保存字段值错误:", error?.response?.data || error?.message);
      return rejectWithValue(
        error?.response?.data?.message || "保存失败，请检查数据格式",
      );
    }
  },
);

// 提交简历
export const submitResume = createAsyncThunk<
  any,
  { cycleId: ID; resumeId: ID | null | undefined },
  ThunkApiConfig
>("resume/submitResume", async ({ cycleId, resumeId }, { rejectWithValue }) => {
  try {
    const res = await request.post(`/api/resumes/cycle/${cycleId}/submit`, {
      resumeId,
    });
    return res.data;
  } catch (error: any) {
    if (
      error?.response?.status === 400 &&
      error?.response?.data?.code === 3002
    ) {
      return rejectWithValue("您已经提交过简历，无法重复提交");
    }
    return rejectWithValue(
      error?.response?.data?.message || error?.message || "提交失败",
    );
  }
});

// 更新简历（批量更新）
export const updateResume = createAsyncThunk<
  any,
  {
    cycleId: ID;
    fieldValues: FieldValueItem[];
    resumeId: ID | null | undefined;
  },
  ThunkApiConfig
>(
  "resume/updateResume",
  async ({ cycleId, fieldValues, resumeId }, { rejectWithValue }) => {
    try {
      if (!resumeId) return rejectWithValue("简历ID不存在");

      const updateData = fieldValues
        .filter(
          (item) => item.fieldValue !== null && item.fieldValue !== undefined,
        )
        .map((item) => {
          let fieldValue = item.fieldValue;

          if (
            typeof fieldValue === "object" &&
            fieldValue !== null &&
            !Array.isArray(fieldValue)
          ) {
            fieldValue = JSON.stringify(fieldValue);
          }
          if (Array.isArray(fieldValue)) {
            fieldValue = JSON.stringify(fieldValue);
          }

          return {
            fieldId: item.fieldId,
            fieldValue,
            valueId: item.valueId || null,
            resumeId,
          };
        });

      // eslint-disable-next-line no-console
      console.log("批量更新数据:", updateData);

      const res = await request.put(
        `/api/resumes/cycle/${cycleId}`,
        updateData,
      );
      return res.data;
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error("更新简历错误:", error?.response?.data || error?.message);
      return rejectWithValue(
        error?.response?.data?.message || error?.message || "系统异常",
      );
    }
  },
);

// 获取简历列表 (管理员)
export const fetchResumes = createAsyncThunk<
  AdminFetchResumesResult,
  AdminFetchResumesParams | undefined,
  ThunkApiConfig
>("resume/fetchResumes", async (searchParams = {}, { rejectWithValue }) => {
  try {
    const queryParams = new URLSearchParams();
    Object.keys(searchParams).forEach((key) => {
      const v = searchParams[key];
      if (v !== undefined && v !== null && v !== "") {
        queryParams.append(key, String(v));
      }
    });

    if (!searchParams.status) {
      queryParams.append("status", "2,3,4,5");
    }

    const queryString = queryParams.toString();
    const url = `/api/resumes/search${queryString ? `?${queryString}` : ""}`;

    // eslint-disable-next-line no-console
    console.log(`Fetching resumes with URL: ${url}`);

    const res: any = await request.get(url);

    // eslint-disable-next-line no-console
    console.log("Fetched resumes response:", res);

    if (res.code === 200) {
      return {
        params: searchParams,
        data: res.data?.content || [],
        total: res.data?.totalElements || 0,
        page: (searchParams.page as any) ?? 0,
        size: res.data?.size || 9,
      };
    }

    throw new Error(res.message || "获取简历列表失败");
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error("Fetch resumes error:", error);
    return rejectWithValue(
      error?.response?.data?.message || error?.message || "获取失败",
    );
  }
});

// 获取单个简历详情 (管理员)
export const fetchResumeById = createAsyncThunk<any, ID, ThunkApiConfig>(
  "resume/fetchResumeById",
  async (resumeId, { rejectWithValue }) => {
    try {
      const res: any = await request.get(`/api/resumes/${resumeId}`);
      if (res.code === 200) return res.data;
      throw new Error(res.message || "获取简历详情失败");
    } catch (error: any) {
      return rejectWithValue(
        error?.response?.data?.message || error?.message || "获取失败",
      );
    }
  },
);

// 更新简历状态 (管理员) - 单个
export const updateResumeStatus = createAsyncThunk<
  { resumeId: ID; status: number },
  { resumeId: ID; status: number },
  ThunkApiConfig
>(
  "resume/updateResumeStatus",
  async ({ resumeId, status }, { rejectWithValue }) => {
    try {
      const res: any = await request.put(
        `/api/resumes/${resumeId}/status/${status}`,
      );
      if (res.code === 200) return { resumeId, status };
      throw new Error(res.message || "更新状态失败");
    } catch (error: any) {
      return rejectWithValue(
        error?.response?.data?.message || error?.message || "更新失败",
      );
    }
  },
);

// 下载简历 PDF (管理员)
export const downloadResumePDF = createAsyncThunk<
  { resumeId: ID; message: string },
  ID,
  ThunkApiConfig
>("resume/downloadResumePDF", async (resumeId, { rejectWithValue }) => {
  try {
    const response: any = await request.get(
      `/api/resumes/export/pdf/${resumeId}`,
      {
        responseType: "blob",
      },
    );

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;

    const contentDisposition = response.headers?.["content-disposition"];
    let filename = `resume_${resumeId}.pdf`;
    if (contentDisposition) {
      const filenameMatch =
        String(contentDisposition).match(/filename="?([^"]+)"?/);
      if (filenameMatch && filenameMatch.length === 2) {
        filename = filenameMatch[1];
      }
    }

    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return { resumeId, message: "下载成功" };
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error("Download PDF error:", error);
    return rejectWithValue(
      error?.response?.data?.message || error?.message || "下载失败",
    );
  }
});

/** ===== Slice ===== */

const initialState: ResumeState = {
  cycleId: 2,
  fields: [],
  fieldDefinitions: [],
  resume: null,
  fieldValues: [],
  loading: false,
  submitting: false,
  updating: false,
  error: null,

  pagination: { current: 1, pageSize: 9, total: 0 },
  resumes: [],
  currentResume: null,
  adminLoading: false,
  detailLoading: false,
  adminError: null,
  detailError: null,
  searchParams: {
    searchText: "",
    searchType: "name",
    expectedDepartment: "",
    statusFilter: "2,3,4,5",
    sortBy: "submitted_at",
    sortOrder: "DESC",
  },
};

const resumeSlice = createSlice({
  name: "resume",
  initialState,
  reducers: {
    setFieldValue: (
      state,
      action: PayloadAction<{ fieldId: ID; value: unknown }>,
    ) => {
      const { fieldId, value } = action.payload;
      const existingIndex = state.fieldValues.findIndex(
        (item) => item.fieldId === fieldId,
      );
      if (existingIndex >= 0) {
        state.fieldValues[existingIndex].fieldValue = value;
      } else {
        state.fieldValues.push({ fieldId, fieldValue: value });
      }
    },
    setFieldDefinitions: (state, action: PayloadAction<any[]>) => {
      state.fieldDefinitions = action.payload;
    },
    resetError: (state) => {
      state.error = null;
    },
    resetResume: (state) => {
      state.fieldValues = [];
    },
    initializeFieldValuesFromResume: (state, action: PayloadAction<any>) => {
      const resumeData = action.payload;
      if (resumeData && resumeData.simpleFields) {
        state.fieldValues = resumeData.simpleFields.map((field: any) => ({
          fieldId: field.fieldId,
          fieldValue: field.fieldValue,
          valueId: field.valueId,
        }));
      }
    },
    setResumeEditable: (state) => {
      if (state.resume) state.resume.status = 1;
    },
    setResumeId: (state, action: PayloadAction<ID>) => {
      if (state.resume) {
        state.resume.resume_id = action.payload;
        state.resume.id = action.payload;
      } else {
        state.resume = {
          resume_id: action.payload,
          id: action.payload,
          status: 1,
        };
      }
    },
    setResumeStatus: (state, action: PayloadAction<number>) => {
      if (state.resume) state.resume.status = action.payload;
    },
    clearFieldValues: (state) => {
      state.fieldValues = [];
    },

    clearCurrentResume: (state) => {
      state.currentResume = null;
      state.detailError = null;
    },
    resetAdminError: (state) => {
      state.adminError = null;
    },
    resetDetailError: (state) => {
      state.detailError = null;
    },
    setPagination: (state, action: PayloadAction<Partial<PaginationState>>) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    clearResumesAndErrors: (state) => {
      state.resumes = [];
      state.adminError = null;
      state.pagination.total = 0;
    },
    setSearchParams: (
      state,
      action: PayloadAction<Partial<SearchParamsState>>,
    ) => {
      state.searchParams = { ...state.searchParams, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchResumeFields.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchResumeFields.fulfilled, (state, action) => {
        state.loading = false;
        state.fields = action.payload;
        state.fieldDefinitions = action.payload;
      })
      .addCase(fetchResumeFields.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "请求失败";
      })

      .addCase(fetchOrCreateResume.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrCreateResume.fulfilled, (state, action) => {
        state.loading = false;
        const responseData: any = action.payload;

        let resumeData: any;
        if (responseData && responseData.data) {
          resumeData = responseData.data;
        } else if (
          responseData &&
          (responseData.resumeId || responseData.resume_id)
        ) {
          resumeData = responseData;
        }

        if (resumeData) {
          state.resume = {
            ...resumeData,
            resume_id:
              resumeData.resumeId || resumeData.resume_id || resumeData.id,
            id: resumeData.resumeId || resumeData.resume_id || resumeData.id,
            status: resumeData.status || 1,
          };

          if (resumeData.simpleFields) {
            state.fieldValues = resumeData.simpleFields.map((field: any) => ({
              fieldId: field.fieldId,
              fieldValue: field.fieldValue,
              valueId: field.valueId,
            }));
          }
        } else {
          state.resume = {
            resume_id: null,
            id: null,
            status: 1,
            submittedAt: null,
          };
        }
      })
      .addCase(fetchOrCreateResume.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "请求失败";
      })

      .addCase(fetchFieldValues.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFieldValues.fulfilled, (state, action) => {
        state.loading = false;
        state.fieldValues = action.payload;
      })
      .addCase(fetchFieldValues.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "请求失败";
      })

      .addCase(saveFieldValues.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(saveFieldValues.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(saveFieldValues.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "保存失败";
      })

      .addCase(submitResume.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(submitResume.fulfilled, (state, action) => {
        state.submitting = false;
        if ((action.payload as any)?.data) {
          state.resume = {
            ...(state.resume || {}),
            ...(action.payload as any).data,
            status: 2,
          } as any;
        }
      })
      .addCase(submitResume.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload ?? "提交失败";
      })

      .addCase(updateResume.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(updateResume.fulfilled, (state, action) => {
        state.updating = false;
        if ((action.payload as any)?.data) {
          state.resume = {
            ...(state.resume || {}),
            ...(action.payload as any).data,
            status: 2,
          } as any;
        }
      })
      .addCase(updateResume.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload ?? "更新失败";
      })

      // 管理员列表
      .addCase(fetchResumes.pending, (state) => {
        state.adminLoading = true;
      })
      .addCase(fetchResumes.fulfilled, (state, action) => {
        state.adminLoading = false;

        const { data, total, page, size, params } = action.payload;

        state.resumes = data || [];

        let requestedPage = 1;
        let requestedSize = 9;

        if (params && params.size !== undefined && params.size !== null) {
          requestedSize = parseInt(String(params.size), 10);
        } else if (size !== undefined && size !== null) {
          requestedSize = parseInt(String(size), 10);
        }

        if (params && params.page !== undefined && params.page !== null) {
          requestedPage = parseInt(String(params.page), 10) + 1;
        } else if (page !== undefined && page !== null) {
          requestedPage = parseInt(String(page), 10) + 1;
        }

        state.pagination = {
          current: requestedPage,
          pageSize: requestedSize,
          total: total || 0,
        };

        if (params) {
          const { name, major, expectedDepartment, status, sortBy, sortOrder } =
            params as any;
          state.searchParams = {
            ...state.searchParams,
            ...(name !== undefined && {
              searchText: name,
              searchType: "name" as const,
            }),
            ...(major !== undefined && {
              searchText: major,
              searchType: "major" as const,
            }),
            expectedDepartment: expectedDepartment || "",
            statusFilter: status || "2,3,4,5",
            sortBy: sortBy || "submitted_at",
            sortOrder: (sortOrder || "DESC") as "ASC" | "DESC",
          };
        }

        state.adminError = null;
      })
      .addCase(fetchResumes.rejected, (state, action) => {
        state.adminLoading = false;
        state.adminError = action.payload ?? "获取失败";
        state.resumes = [];
        state.pagination.total = 0;
      })

      // 详情
      .addCase(fetchResumeById.pending, (state) => {
        state.detailLoading = true;
        state.detailError = null;
      })
      .addCase(fetchResumeById.fulfilled, (state, action) => {
        state.detailLoading = false;
        state.currentResume = action.payload;
        state.detailError = null;
      })
      .addCase(fetchResumeById.rejected, (state, action) => {
        state.detailLoading = false;
        state.detailError = action.payload ?? "获取失败";
        state.currentResume = null;
      })

      // 更新状态
      .addCase(updateResumeStatus.pending, (state) => {
        state.adminLoading = true;
        state.adminError = null;
      })
      .addCase(updateResumeStatus.fulfilled, (state, action) => {
        state.adminLoading = false;
        const { resumeId, status } = action.payload;

        const index = state.resumes.findIndex(
          (r: any) => r.resumeId === resumeId,
        );
        if (index !== -1) state.resumes[index].status = status;

        if (
          state.currentResume &&
          (state.currentResume as any).resumeId === resumeId
        ) {
          (state.currentResume as any).status = status;
        }

        state.adminError = null;
      })
      .addCase(updateResumeStatus.rejected, (state, action) => {
        state.adminLoading = false;
        state.adminError = action.payload ?? "更新失败";
      })

      // 下载 PDF
      .addCase(downloadResumePDF.pending, (state) => {
        state.adminLoading = true;
        state.adminError = null;
      })
      .addCase(downloadResumePDF.fulfilled, (state, action) => {
        state.adminLoading = false;
        // eslint-disable-next-line no-console
        console.log("Download success:", action.payload.message);
        state.adminError = null;
      })
      .addCase(downloadResumePDF.rejected, (state, action) => {
        state.adminLoading = false;
        state.adminError = action.payload ?? "下载失败";
      });
  },
});

export const {
  setFieldValue,
  setFieldDefinitions,
  resetError,
  resetResume,
  initializeFieldValuesFromResume,
  setResumeEditable,
  setResumeId,
  setResumeStatus,
  clearFieldValues,
  clearCurrentResume,
  resetAdminError,
  resetDetailError,
  setPagination,
  clearResumesAndErrors,
  setSearchParams,
} = resumeSlice.actions;

/** 可选：保持你原来的 resumeActions 聚合导出习惯 */
export const resumeActions = {
  fetchResumeFields,
  fetchOrCreateResume,
  fetchFieldValues,
  saveFieldValues,
  submitResume,
  updateResume,
  fetchResumes,
  fetchResumeById,
  updateResumeStatus,
  downloadResumePDF,

  setFieldValue,
  setFieldDefinitions,
  resetError,
  resetResume,
  initializeFieldValuesFromResume,
  setResumeEditable,
  setResumeId,
  setResumeStatus,
  clearFieldValues,
  clearCurrentResume,
  resetAdminError,
  resetDetailError,
  setPagination,
  clearResumesAndErrors,
  setSearchParams,
};

export default resumeSlice.reducer;
