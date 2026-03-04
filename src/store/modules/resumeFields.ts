// src/store/modules/resumeFields.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getResumeFields, updateResumeFields } from '@/api/resume';

export interface ResumeField {
  key: string;
  label: string;
  type: 'input' | 'textarea' | 'radio' | 'checkbox' | 'select' | 'custom';
  required: boolean;
  enabled: boolean;
  options?: string[];
  placeholder?: string;
  fieldId?: number;
  order?: number;
}

interface ResumeFieldsState {
  fields: ResumeField[];
  loading: boolean;
  error: string | null;
}

const initialState: ResumeFieldsState = {
  fields: [],
  loading: false,
  error: null,
};

// 获取字段配置
export const fetchResumeFieldsConfig = createAsyncThunk(
  'resumeFields/fetchConfig',
  async (cycleId: number, { rejectWithValue }) => {
    try {
      const response = await getResumeFields(cycleId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || '获取字段配置失败');
    }
  }
);

// 更新字段配置
export const saveResumeFieldsConfig = createAsyncThunk(
  'resumeFields/saveConfig',
  async ({ cycleId, fields }: { cycleId: number; fields: ResumeField[] }, { rejectWithValue }) => {
    try {
      const response = await updateResumeFields(cycleId, fields);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || '保存字段配置失败');
    }
  }
);

const resumeFieldsSlice = createSlice({
  name: 'resumeFields',
  initialState,
  reducers: {
    setFields: (state, action) => {
      state.fields = action.payload;
    },
    clearFields: (state) => {
      state.fields = [];
      state.error = null;
    },
    updateField: (state, action) => {
      const { index, field } = action.payload;
      if (state.fields[index]) {
        state.fields[index] = { ...state.fields[index], ...field };
      }
    },
    addField: (state, action) => {
      state.fields.push(action.payload);
    },
    removeField: (state, action) => {
      const index = action.payload;
      state.fields.splice(index, 1);
    },
  },
  extraReducers: (builder) => {
    builder
      // 获取配置
      .addCase(fetchResumeFieldsConfig.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchResumeFieldsConfig.fulfilled, (state, action) => {
        state.loading = false;
        state.fields = action.payload || [];
      })
      .addCase(fetchResumeFieldsConfig.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // 保存配置
      .addCase(saveResumeFieldsConfig.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(saveResumeFieldsConfig.fulfilled, (state, action) => {
        state.loading = false;
        state.fields = action.payload || state.fields;
      })
      .addCase(saveResumeFieldsConfig.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setFields, clearFields, updateField, addField, removeField } = resumeFieldsSlice.actions;
export default resumeFieldsSlice.reducer;