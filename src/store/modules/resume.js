// store/modules/resume.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { request } from '@/utils';

// 获取字段定义
export const fetchResumeFields = createAsyncThunk(
  'resume/fetchResumeFields',
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
  'resume/fetchOrCreateResume',
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
          return rejectWithValue(createError.response?.data?.message || createError.message);
        }
      }
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// 获取字段值
export const fetchFieldValues = createAsyncThunk(
  'resume/fetchFieldValues',
  async (cycleId, { rejectWithValue }) => {
    try {
      const res = await request.get(`/api/resumes/cycle/${cycleId}/field-values`);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// 保存字段值
export const saveFieldValues = createAsyncThunk(
  'resume/saveFieldValues',
  async ({ cycleId, fieldValues, resumeId }, { rejectWithValue }) => {
    try {
      if (!resumeId) {
        return rejectWithValue('简历ID不存在');
      }

      // 过滤掉空值并确保每个字段值都包含resumeId
      const fieldValuesWithResumeId = fieldValues
        .filter(item => item.fieldValue !== null && item.fieldValue !== undefined)
        .map(item => ({
          ...item,
          resumeId: resumeId
        }));

      const res = await request.post(
        `/api/resumes/cycle/${cycleId}/field-values`, 
        fieldValuesWithResumeId
      );
      
      return res.data;
    } catch (error) {
      console.error('保存字段值错误:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || '保存失败，请检查数据格式');
    }
  }
);

// 提交简历
export const submitResume = createAsyncThunk(
  'resume/submitResume',
  async ({ cycleId, resumeId }, { rejectWithValue }) => {
    try {
      const res = await request.post(`/api/resumes/cycle/${cycleId}/submit`, {
        resumeId: resumeId
      });
      return res.data;
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.code === 3002) {
        return rejectWithValue('您已经提交过简历，无法重复提交');
      }
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// 更新简历
export const updateResume = createAsyncThunk(
  'resume/updateResume',
  async ({ cycleId, fieldValues, resumeId }, { rejectWithValue }) => {
    try {
      // 先保存字段值
      const fieldValuesWithResumeId = fieldValues
        .filter(item => item.fieldValue !== null && item.fieldValue !== undefined)
        .map(item => ({
          ...item,
          resumeId: resumeId
        }));

      await request.post(
        `/api/resumes/cycle/${cycleId}/field-values`,
        fieldValuesWithResumeId
      );

      // 然后调用更新接口
      const res = await request.put(`/api/resumes/cycle/${cycleId}`, {
        resumeId: resumeId
      });
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

const resumeSlice = createSlice({
  name: 'resume',
  initialState: {
    cycleId: 2,
    fields: [],
    fieldDefinitions: [],
    resume: null,
    fieldValues: [],
    loading: false,
    submitting: false,
    updating: false,
    error: null,
  },
  reducers: {
    setFieldValue: (state, action) => {
      const { fieldId, value } = action.payload;
      const existingIndex = state.fieldValues.findIndex(item => item.fieldId === fieldId);

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
        state.fieldValues = resumeData.simpleFields.map(field => ({
          fieldId: field.fieldId,
          fieldValue: field.fieldValue,
          valueId: field.valueId // 保存valueId用于更新
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
          id: action.payload 
        };
      }
    },
    // 设置简历状态
    setResumeStatus: (state, action) => {
      if (state.resume) {
        state.resume.status = action.payload;
      }
    }
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
        state.error = action.payload;
      })
      .addCase(fetchOrCreateResume.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrCreateResume.fulfilled, (state, action) => {
  state.loading = false;
  const responseData = action.payload;
  
  console.log('fetchOrCreateResume response:', responseData);
  
  // 处理不同的响应格式
  let resumeData;
  if (responseData && responseData.data) {
    // 格式: {data: {...}}
    resumeData = responseData.data;
  } else if (responseData && (responseData.resumeId || responseData.resume_id)) {
    // 格式: {resumeId: ..., ...} (直接简历对象)
    resumeData = responseData;
  }
  
  if (resumeData) {
    console.log('resumeData:', resumeData);
    
    state.resume = {
      ...resumeData,
      resume_id: resumeData.resumeId || resumeData.resume_id || resumeData.id,
      id: resumeData.resumeId || resumeData.resume_id || resumeData.id,
      status: resumeData.status || 1
    };
    
    console.log('state.resume after setting:', state.resume);
    
    // 初始化字段值 - 处理不同的字段值格式
    if (resumeData.simpleFields) {
      state.fieldValues = resumeData.simpleFields.map(field => ({
        fieldId: field.fieldId,
        fieldValue: field.fieldValue,
        valueId: field.valueId
      }));
    }
  } else {
    console.warn('No valid resume data found in response:', responseData);
    // 创建一个空的简历对象，避免后续错误
    state.resume = {
      resume_id: null,
      id: null,
      status: 1,
      submittedAt: null
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
            status: 2 // 设置为已提交状态
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
            ...action.payload.data
          };
        }
      })
      .addCase(updateResume.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload;
      });
  }
});

export const {
  setFieldValue,
  setFieldDefinitions,
  resetError,
  resetResume,
  initializeFieldValuesFromResume,
  setResumeEditable,
  setResumeId,
  setResumeStatus
} = resumeSlice.actions;

export default resumeSlice.reducer;