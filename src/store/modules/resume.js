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
  async ({ cycleId, fieldValues }, { rejectWithValue }) => {
    try {
      const res = await request.post(`/api/resumes/cycle/${cycleId}/field-values`, fieldValues);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// 提交简历
export const submitResume = createAsyncThunk(
  'resume/submitResume',
  async (cycleId, { rejectWithValue }) => {
    try {
      const res = await request.post(`/api/resumes/cycle/${cycleId}/submit`);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

const resumeSlice = createSlice({
  name: 'resume',
  initialState: {
    cycleId: 2024,
    fields: [],
    resume: null,
    fieldValues: [],
    loading: false,
    saving: false,
    submitting: false,
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
    resetError: (state) => {
      state.error = null;
    },
    resetResume: (state) => {
      state.fieldValues = [];
    }
  },
  extraReducers: (builder) => {
    builder
      // 获取字段定义
      .addCase(fetchResumeFields.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchResumeFields.fulfilled, (state, action) => {
        state.loading = false;
        state.fields = action.payload;
      })
      .addCase(fetchResumeFields.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // 获取或创建简历
      .addCase(fetchOrCreateResume.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrCreateResume.fulfilled, (state, action) => {
        state.loading = false;
        state.resume = action.payload;
      })
      .addCase(fetchOrCreateResume.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // 获取字段值
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

      // 保存字段值
      .addCase(saveFieldValues.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(saveFieldValues.fulfilled, (state, action) => {
        state.saving = false;
        // 更新本地字段值
        state.fieldValues = action.payload;
      })
      .addCase(saveFieldValues.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })

      // 提交简历
      .addCase(submitResume.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(submitResume.fulfilled, (state, action) => {
        state.submitting = false;
        if (state.resume) {
          state.resume.status = 3; // 已提交状态
          state.resume.submittedAt = new Date().toISOString();
        }
      })
      .addCase(submitResume.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      });
  }
});

export const { setFieldValue, resetError, resetResume } = resumeSlice.actions;
export default resumeSlice.reducer;