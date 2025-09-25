// src/store/modules/resume.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { request } from "@/utils";

// --- 原有逻辑：用户提交简历相关 ---
// 获取字段定义
export const fetchResumeFields = createAsyncThunk(
  "resume/fetchResumeFields",
  async (cycleId, { rejectWithValue }) => {
    try {
      const res = await request.get(`/api/resumes/fields/${cycleId}`);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// 获取或创建简历
export const fetchOrCreateResume = createAsyncThunk(
  "resume/fetchOrCreateResume",
  async (cycleId, { rejectWithValue }) => {
    try {
      const res = await request.get(`/api/resumes/cycle/${cycleId}`);
      return res.data;
    } catch (error) {
      // 如果简历不存在，创建新简历
      if (error.response?.status === 404) {
        try {
          const createRes = await request.post(`/api/resumes/cycle/${cycleId}`);
          return createRes.data;
        } catch (createError) {
          return rejectWithValue(
            createError.response?.data?.message || createError.message
          );
        }
      }
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// 获取字段值
export const fetchFieldValues = createAsyncThunk(
  "resume/fetchFieldValues",
  async (cycleId, { rejectWithValue }) => {
    try {
      const res = await request.get(
        `/api/resumes/cycle/${cycleId}/field-values`
      );
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// 保存字段值
export const saveFieldValues = createAsyncThunk(
  "resume/saveFieldValues",
  async ({ cycleId, fieldValues, resumeId }, { rejectWithValue }) => {
    try {
      if (!resumeId) {
        return rejectWithValue("简历ID不存在");
      }
      // 过滤掉空值并确保每个字段值都包含resumeId
      const fieldValuesWithResumeId = fieldValues
        .filter(
          (item) => item.fieldValue !== null && item.fieldValue !== undefined
        )
        .map((item) => ({
          ...item,
          resumeId: resumeId,
        }));
      const res = await request.post(
        `/api/resumes/cycle/${cycleId}/field-values`,
        fieldValuesWithResumeId
      );
      return res.data;
    } catch (error) {
      console.error("保存字段值错误:", error.response?.data || error.message);
      return rejectWithValue(
        error.response?.data?.message || "保存失败，请检查数据格式"
      );
    }
  }
);

// 提交简历
export const submitResume = createAsyncThunk(
  "resume/submitResume",
  async ({ cycleId, resumeId }, { rejectWithValue }) => {
    try {
      const res = await request.post(`/api/resumes/cycle/${cycleId}/submit`, {
        resumeId: resumeId,
      });
      return res.data;
    } catch (error) {
      if (
        error.response?.status === 400 &&
        error.response?.data?.code === 3002
      ) {
        return rejectWithValue("您已经提交过简历，无法重复提交");
      }
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// 更新简历
export const updateResume = createAsyncThunk(
  "resume/updateResume",
  async ({ cycleId, fieldValues, resumeId }, { rejectWithValue }) => {
    try {
      if (!resumeId) {
        return rejectWithValue("简历ID不存在");
      }
      // 准备批量更新的数据
      const updateData = fieldValues
        .filter(
          (item) => item.fieldValue !== null && item.fieldValue !== undefined
        )
        .map((item) => {
          // 确保字段值是正确的格式
          let fieldValue = item.fieldValue;
          // 如果已经是字符串化的JSON，保持原样
          // 如果是对象，则字符串化
          if (typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
            fieldValue = JSON.stringify(fieldValue);
          }
          // 如果是数组（如技术栈），也字符串化
          if (Array.isArray(fieldValue)) {
            fieldValue = JSON.stringify(fieldValue);
          }
          return {
            fieldId: item.fieldId,
            fieldValue: fieldValue,
            valueId: item.valueId || null, // 如果有valueId就传，没有就null
            resumeId: resumeId
          };
        });
      console.log('批量更新数据:', updateData);
      // 直接发送字段值数组，而不是包裹在对象中
      const res = await request.put(
        `/api/resumes/cycle/${cycleId}`, // 假设后端有批量更新接口
        updateData  // 直接发送数组
      );
      return res.data;
    } catch (error) {
      console.error("更新简历错误:", error.response?.data || error.message);
      return rejectWithValue(
        error.response?.data?.message || error.message || "系统异常"
      );
    }
  }
);

// --- 新增逻辑：管理员管理简历相关 ---
// 获取简历列表 (管理员)
export const fetchResumes = createAsyncThunk(
  'resume/fetchResumes',
  async (searchParams = {}, { rejectWithValue }) => {
    try {
      // 构建查询字符串
      const queryParams = new URLSearchParams();
      // 添加所有参数
      Object.keys(searchParams).forEach(key => {
        if (searchParams[key] !== undefined && searchParams[key] !== null && searchParams[key] !== '') {
          queryParams.append(key, searchParams[key]);
        }
      });
      // 如果没有设置状态筛选，默认只显示已提交及之后的简历(status>=2)
      if (!searchParams.status) {
        queryParams.append('status', '2,3,4,5');
      }
      const queryString = queryParams.toString();
      const url = `/api/resumes/search${queryString ? `?${queryString}` : ''}`;
      console.log(`Fetching resumes with URL: ${url}`); // 调试日志
      const res = await request.get(url);
      console.log('Fetched resumes response:', res); // 调试日志
      // 根据接口文档，后端返回分页数据格式
      if (res.code === 200) {
        // 返回分页数据和参数
        return { 
          params: searchParams, 
          data: res.data.content || [], // 简历列表
          total: res.data.totalElements || 0, // 总条数
          page: searchParams.page || 0, // 当前页码（后端从0开始）
          size: res.data.size || 9 // 每页大小
        };
      } else {
        throw new Error(res.message || '获取简历列表失败');
      }
    } catch (error) {
      console.error('Fetch resumes error:', error);
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// 获取单个简历详情 (管理员)
export const fetchResumeById = createAsyncThunk(
  'resume/fetchResumeById',
  async (resumeId, { rejectWithValue }) => {
    try {
      // --- 修改：使用更常见的根据 resumeId 获取详情的接口 ---
      // 根据 OpenAPI 文档，可能是 `/api/resumes/{id}`
      const res = await request.get(`/api/resumes/${resumeId}`); // <--- 修改路径
      if (res.code === 200) {
        return res.data;
      } else {
        throw new Error(res.message || '获取简历详情失败');
      }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// 更新简历状态 (管理员) - 单个
export const updateResumeStatus = createAsyncThunk(
  'resume/updateResumeStatus',
  async ({ resumeId, status }, { rejectWithValue, dispatch }) => {
    try {
      // 根据 club-official.md 接口文档，PUT /api/resumes/{resumeId}/status/{status}
      const res = await request.put(`/api/resumes/${resumeId}/status/${status}`);
      if (res.code === 200) {
        // 可选：成功后刷新列表
        // dispatch(fetchResumes());
        return { resumeId, status }; // 返回更新信息供 reducer 使用
      } else {
        throw new Error(res.message || '更新状态失败');
      }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// --- 修改：下载简历 PDF (管理员) ---
export const downloadResumePDF = createAsyncThunk(
  'resume/downloadResumePDF',
  async (resumeId, { rejectWithValue }) => {
    try {
      // 根据 club-official.md 接口文档，GET /api/resumes/export/pdf/{resumeId}
      // 需要设置 responseType: 'blob' 来处理文件流
      const response = await request.get(`/api/resumes/export/pdf/${resumeId}`, {
        responseType: 'blob' // 关键：指定响应类型为 blob
      });

      // --- 处理 Blob 并触发浏览器下载 ---
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      // 尝试从响应头获取文件名，如果没有则使用默认
      const contentDisposition = response.headers['content-disposition'];
      let filename = `resume_${resumeId}.pdf`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch && filenameMatch.length === 2) { // 修复潜在的 undefined 访问
          filename = filenameMatch[1];
        }
      }
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      // --- 下载处理结束 ---

      return { resumeId, message: '下载成功' }; // 可以返回一些信息
    } catch (error) {
      console.error('Download PDF error:', error);
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);
// --- ---

// --- 移除 batchUpdateResumeStatus Thunk ---
// 因为后端没有提供批量更新的 API，所以移除这个 thunk。
// 我们将通过循环调用 updateResumeStatus 来实现批量更新。
// --- ---

const resumeSlice = createSlice({
  name: "resume",
  initialState: {
    // 原有状态：用于用户提交简历
    cycleId: 2,
    fields: [],
    fieldDefinitions: [],
    resume: null,
    fieldValues: [],
    loading: false,
    submitting: false,
    updating: false,
    error: null,
    // 新增状态：用于管理员管理简历
    //分页相关状态
     pagination: {
      current: 1, // 前端当前页码（从1开始）
      pageSize: 9, // 每页大小
      total: 0, // 总条数
    },
    resumes: [], // 简历列表
    currentResume: null, // 当前查看的简历详情
    adminLoading: false, // 管理员操作的加载状态
    detailLoading: false, // 获取详情的加载状态
    adminError: null, // 管理员操作的错误
    detailError: null, // 获取详情的错误
  },
  reducers: {
    // 原有 reducers
    setFieldValue: (state, action) => {
      const { fieldId, value } = action.payload;
      const existingIndex = state.fieldValues.findIndex(
        (item) => item.fieldId === fieldId
      );
      if (existingIndex >= 0) {
        state.fieldValues[existingIndex].fieldValue = value;
      } else {
        state.fieldValues.push({ fieldId, fieldValue: value });
      }
    },
    setFieldDefinitions: (state, action) => {
      state.fieldDefinitions = action.payload;
    },
    resetError: (state) => {
      state.error = null;
    },
    resetResume: (state) => {
      state.fieldValues = [];
    },
    initializeFieldValuesFromResume: (state, action) => {
      const resumeData = action.payload;
      if (resumeData && resumeData.simpleFields) {
        state.fieldValues = resumeData.simpleFields.map((field) => ({
          fieldId: field.fieldId,
          fieldValue: field.fieldValue,
          valueId: field.valueId, // 保存valueId用于更新
        }));
      }
    },
    setResumeEditable: (state) => {
      if (state.resume) {
        state.resume.status = 1;
      }
    },
    // 设置简历ID
    setResumeId: (state, action) => {
      if (state.resume) {
        state.resume.resume_id = action.payload;
        state.resume.id = action.payload;
      } else {
        state.resume = {
          resume_id: action.payload,
          id: action.payload,
        };
      }
    },
    // 设置简历状态
    setResumeStatus: (state, action) => {
      if (state.resume) {
        state.resume.status = action.payload;
      }
    },
    // 清空字段值
    clearFieldValues: (state) => {
      state.fieldValues = [];
    },
    // 新增 reducers：用于管理员功能的状态清理
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
    // 新增：设置分页信息
    setPagination: (state, action) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    // 修改：清空简历列表（不再需要清空所有数据）
    clearResumesAndErrors: (state) => {
      state.resumes = [];
      state.adminError = null;
      state.pagination.total = 0;
    }
  },
  extraReducers: (builder) => {
    builder
      // --- 原有 extraReducers ---
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
        state.error = action.payload;
      })
      .addCase(fetchOrCreateResume.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrCreateResume.fulfilled, (state, action) => {
        state.loading = false;
        const responseData = action.payload;
        console.log("fetchOrCreateResume response:", responseData);
        // 处理不同的响应格式
        let resumeData;
        if (responseData && responseData.data) {
          // 格式: {data: {...}}
          resumeData = responseData.data;
        } else if (
          responseData &&
          (responseData.resumeId || responseData.resume_id)
        ) {
          // 格式: {resumeId: ..., ...} (直接简历对象)
          resumeData = responseData;
        }
        if (resumeData) {
          console.log("resumeData:", resumeData);
          state.resume = {
            ...resumeData,
            resume_id:
              resumeData.resumeId || resumeData.resume_id || resumeData.id,
            id: resumeData.resumeId || resumeData.resume_id || resumeData.id,
            status: resumeData.status || 1,
          };
          console.log("state.resume after setting:", state.resume);
          // 初始化字段值 - 处理不同的字段值格式
          if (resumeData.simpleFields) {
            state.fieldValues = resumeData.simpleFields.map((field) => ({
              fieldId: field.fieldId,
              fieldValue: field.fieldValue,
              valueId: field.valueId,
            }));
          }
        } else {
          console.warn("No valid resume data found in response:", responseData);
          // 创建一个空的简历对象，避免后续错误
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
        state.error = action.payload;
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
        state.error = action.payload;
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
        state.error = action.payload;
      })
      .addCase(submitResume.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(submitResume.fulfilled, (state, action) => {
        state.submitting = false;
        if (action.payload.data) {
          state.resume = {
            ...state.resume,
            ...action.payload.data,
            status: 2, // 设置为已提交状态
          };
        }
      })
      .addCase(submitResume.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      })
      .addCase(updateResume.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(updateResume.fulfilled, (state, action) => {
        state.updating = false;
        if (action.payload.data) {
          state.resume = {
            ...state.resume,
            ...action.payload.data,
            status: 2, // 保持已提交状态
          };
        }
      })
      .addCase(updateResume.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload;
      })
      // --- 新增 extraReducers：管理员功能 ---
      // Fetch Resumes (List)
       .addCase(fetchResumes.pending, (state) => {
        state.adminLoading = true;
      })
      // 在 resumeSlice.js 的 fetchResumes.fulfilled 中修改：
.addCase(fetchResumes.fulfilled, (state, action) => {
  state.adminLoading = false;
  const { data, total, page, size, params } = action.payload;
  // 更新简历列表和分页信息
  state.resumes = data || [];
  // 修复：安全地访问 params 对象，避免空指针错误
  let requestedPage = 1; // 默认第一页
  let requestedSize = 9; // 默认每页大小
  if (params && params.size !== undefined && params.size !== null) {
    // 优先使用请求参数中的 size
    requestedSize = parseInt(params.size);
  } else if (size !== undefined && size !== null) {
    // 其次使用后端返回的 size
    requestedSize = parseInt(size);
  }
  if (params && params.page !== undefined && params.page !== null) {
    // 使用请求参数中的页码
    requestedPage = parseInt(params.page) + 1;
  } else if (page !== undefined && page !== null) {
    // 使用后端返回的页码
    requestedPage = parseInt(page) + 1;
  }
  state.pagination = {
    current: requestedPage, // 使用正确的页码
    pageSize: requestedSize, // 使用正确的每页大小
    total: total || 0
  };
  state.adminError = null;
})
      .addCase(fetchResumes.rejected, (state, action) => {
        state.adminLoading = false;
        state.adminError = action.payload;
        state.resumes = [];
        state.pagination.total = 0;
      })
      // Fetch Resume Detail
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
        state.detailError = action.payload;
        state.currentResume = null;
      })
      // Update Resume Status (Single)
      .addCase(updateResumeStatus.pending, (state) => {
        state.adminLoading = true; // 可以复用 adminLoading 或创建新的 statusLoading
        state.adminError = null;
      })
      .addCase(updateResumeStatus.fulfilled, (state, action) => {
        state.adminLoading = false;
        const { resumeId, status } = action.payload;
        // 更新列表中的状态
        const index = state.resumes.findIndex(r => r.resumeId === resumeId); // 修复字段名
        if (index !== -1) {
          state.resumes[index].status = status;
        }
        // 如果当前详情页是这个简历，也更新详情状态
        if (state.currentResume && state.currentResume.resumeId === resumeId) { // 修复字段名
          state.currentResume.status = status;
        }
        state.adminError = null;
      })
      .addCase(updateResumeStatus.rejected, (state, action) => {
        state.adminLoading = false;
        state.adminError = action.payload;
      })
      // Download Resume PDF (Optional state management)
      .addCase(downloadResumePDF.pending, (state) => {
        state.adminLoading = true; // 可以复用或创建 downloadLoading
        state.adminError = null;
      })
      .addCase(downloadResumePDF.fulfilled, (state, action) => {
        state.adminLoading = false;
        // 下载成功，通常不需要更新 state，但可以记录日志或提示
        console.log("Download success:", action.payload.message);
        state.adminError = null;
      })
      .addCase(downloadResumePDF.rejected, (state, action) => {
        state.adminLoading = false;
        state.adminError = action.payload;
      });
      // --- ---
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
  clearResumesAndErrors // 导出新 action
} = resumeSlice.actions;

// 导出所有 async actions (原有 + 新增)
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
  downloadResumePDF,   // --- 新增 ---
  // --- 注意：这里不再导出 batchUpdateResumeStatus ---
  // --- ---
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
  clearResumesAndErrors 
};

export default resumeSlice.reducer;