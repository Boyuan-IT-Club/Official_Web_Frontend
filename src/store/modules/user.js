// store/modules/user.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { request } from '@/utils';
import { setToken as _setToken, getToken, removeToken } from '@/utils';

// 异步thunk actions
export const fetchLogin = createAsyncThunk(
  'user/fetchLogin',
  async (loginForm, { rejectWithValue }) => {
    try {
      const res = await request.post('/api/auth/login', loginForm);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const fetchRegister = createAsyncThunk(
  'user/fetchRegister',
  async (registerData, { rejectWithValue }) => {
    try {
      const res = await request.post('/api/auth/register', registerData);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const fetchUserInfo = createAsyncThunk(
  'user/fetchUserInfo',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      const res = await request.get('/api/user/me');
      return res.data.user;
    } catch (error) {
      if (error.response?.status === 401) {
        dispatch(clearToken());
      }
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const fetchResetPassword = createAsyncThunk(
  'user/fetchResetPassword',
  async (resetData, { rejectWithValue }) => {
    try {
      const res = await request.post('/api/auth/reset-password', resetData);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const updateUserInfo = createAsyncThunk(
  'user/updateUserInfo',
  async (userData, { rejectWithValue, dispatch }) => {
    try {
      await request.put('/api/user/me', userData);
      const res = await dispatch(userActions.fetchUserInfo()).unwrap();
      return res;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const uploadAvatar = createAsyncThunk(
  'user/uploadAvatar',
  async (file, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      console.log('上传文件:', file.name, file.type, file.size);
      
      const res = await request.post('/api/user/avatar', formData);
      
      console.log('上传响应:', res);
      
      if (res.code === 200) {
        return res.data.fullHttpPath;
      } else {
        throw new Error(res.message || '上传失败');
      }
    } catch (error) {
      console.error('上传错误:', error);
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// 根据用户ID获取获奖经历
export const fetchUserAwards = createAsyncThunk(
  'user/fetchUserAwards',
  async (userId, { rejectWithValue }) => {
    try {
      const res = await request.get(`/api/awards/user/${userId}`);
      
      // 确保返回的是获奖数组
      if (res.code === 200) {
        return res.data; // 这里应该是获奖数组
      } else {
        throw new Error(res.message || '获取获奖经历失败');
      }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// 辅助函数：将日期格式化为 "YYYY-MM-DD HH:mm:ss"
function formatDateTime(dateString) {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return null;
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('日期格式化错误:', error);
    return null;
  }
}

// 添加获奖经历
export const addAward = createAsyncThunk(
  'user/addAward',
  async (awardData, { rejectWithValue, getState }) => {
    try {
      const { userInfo } = getState().user;
      
      // 格式化数据以匹配后端期望的格式
      const formattedData = {
        userId: userInfo.userId,
        awardName: awardData.awardName,
        awardTime: formatDateTime(awardData.awardTime) || '2024-12-01', // 默认值防止空值
        description: awardData.description
      };
      
      console.log('发送获奖数据:', formattedData);
      
      const res = await request.post('/api/awards', formattedData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (res.code === 200) {
        // 返回完整的获奖信息
        return {
          awardId: res.data.award_id,
          awardName: formattedData.awardName,
          awardTime: formattedData.awardTime,
          description: formattedData.description
        };
      } else {
        throw new Error(res.message || '添加获奖经历失败');
      }
    } catch (error) {
      console.error('添加获奖经历完整错误:', error);
      console.error('错误响应:', error.response?.data);
      console.error('错误状态:', error.response?.status);
      
      let errorMessage = '操作失败，请重试';
      if (error.response?.data) {
        const responseData = error.response.data;
        if (typeof responseData === 'object') {
          errorMessage = responseData.message || JSON.stringify(responseData);
        } else {
          errorMessage = responseData;
        }
      } else if (error.response?.status === 500) {
        errorMessage = '服务器内部错误，请联系管理员';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return rejectWithValue(errorMessage);
    }
  }
);

// 修改获奖经历
export const updateAward = createAsyncThunk(
  'user/updateAward',
  async (awardData, { rejectWithValue }) => {
    try {
      // 格式化数据
      const formattedData = {
        awardId: awardData.awardId,
        awardName: awardData.awardName,
        awardTime: formatDateTime(awardData.awardTime) || awardData.awardTime,
        description: awardData.description
      };
      
      console.log('更新获奖数据:', formattedData);
      
      const res = await request.put('/api/awards', formattedData);
      
      if (res.code === 200) {
        // 返回完整的获奖信息，确保包含 awardId
        return {
          awardId: awardData.awardId, // 确保返回 awardId
          awardName: formattedData.awardName,
          awardTime: formattedData.awardTime,
          description: formattedData.description
        };
      } else {
        throw new Error(res.message || '更新获奖经历失败');
      }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);
// 删除获奖经历
export const deleteAward = createAsyncThunk(
  'user/deleteAward',
  async (awardId, { rejectWithValue }) => {
    try {
      await request.delete(`/api/awards/${awardId}`);
      return awardId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState: {
    token: getToken() || '',
    userInfo: {},
    awards: [],
    loading: false,
    error: null,
    avatarUploading: false,
  },
  reducers: {
    setToken: (state, action) => {
      state.token = action.payload;
      _setToken(action.payload);
    },
    clearToken: (state) => {
      state.token = '';
      state.userInfo = {};
      state.awards = [];
      removeToken();
    },
    setUserInfo: (state, action) => {
      state.userInfo = action.payload;
    },
    resetError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // 登录状态处理
      .addCase(fetchLogin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLogin.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        _setToken(action.payload.token);
      })
      .addCase(fetchLogin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // 用户信息状态处理
      .addCase(fetchUserInfo.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserInfo.fulfilled, (state, action) => {
        state.loading = false;
        const userInfo = { ...action.payload };
        
        // 统一转换头像路径为完整URL
        if (userInfo.avatar) {
          if (userInfo.avatar.startsWith('http')) {
            // 不做任何处理
          } else if (userInfo.avatar.startsWith('/')) {
            userInfo.avatar = `https://official.boyuan.club${userInfo.avatar}`;
          } else {
            userInfo.avatar = `https://official.boyuan.club/uploads/avatars/${userInfo.avatar}`;
          }
        }
        
        state.userInfo = userInfo;
      })
      .addCase(fetchUserInfo.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // 获奖经历状态处理
      .addCase(fetchUserAwards.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserAwards.fulfilled, (state, action) => {
        state.loading = false;
        state.awards = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchUserAwards.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // 添加获奖经历
      .addCase(addAward.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addAward.fulfilled, (state, action) => {
        state.loading = false;
        state.awards.push(action.payload);
      })
      .addCase(addAward.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // 修改获奖经历
      .addCase(updateAward.pending, (state) => {
      state.loading = true;
      state.error = null;
    })
    .addCase(updateAward.fulfilled, (state, action) => {
      state.loading = false;
      // 添加空值检查
      if (action.payload && action.payload.awardId) {
        const index = state.awards.findIndex(a => a.awardId === action.payload.awardId);
        if (index !== -1) {
          state.awards[index] = { ...state.awards[index], ...action.payload };
        }
      }
    })
    .addCase(updateAward.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload;
    })

      // 删除获奖经历
      .addCase(deleteAward.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteAward.fulfilled, (state, action) => {
        state.loading = false;
        state.awards = state.awards.filter(a => a.awardId !== action.payload);
      })
      .addCase(deleteAward.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // 头像上传状态处理
      .addCase(uploadAvatar.pending, (state) => {
        state.avatarUploading = true;
        state.error = null;
      })
      .addCase(uploadAvatar.fulfilled, (state, action) => {
        state.avatarUploading = false;
        state.userInfo.avatar = action.payload;
      })
      .addCase(uploadAvatar.rejected, (state, action) => {
        state.avatarUploading = false;
        state.error = action.payload;
      });
  }
});

// 同步actions
export const { setToken, clearToken, setUserInfo, resetError } = userSlice.actions;

// 异步actions集合
export const userActions = {
  fetchLogin,
  fetchRegister,
  fetchUserInfo,
  fetchUserAwards,
  fetchResetPassword,
  updateUserInfo,
  uploadAvatar,
  addAward,
  updateAward,
  deleteAward,
  setToken,
  clearToken,
  setUserInfo,
  resetError
};

export default userSlice.reducer;