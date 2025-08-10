import { createSlice } from '@reduxjs/toolkit';
import { request } from '@/utils';
import { setToken as _setToken, getToken ,removeToken} from '@/utils';

// 从localStorage初始化token
const initialState = {
  token: getToken() || '', // 初始化时读取本地存储
  loading: false,
  error: null
};

const userStore = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setToken(state, action) {
      state.token = action.payload;
      state.loading = false;
      state.error = null;
      _setToken(action.payload) // 存储到localStorage
    },
    clearToken(state) {
      state.token = '';
      removeToken(); // 清除本地存储
    },
    setLoading(state) {
      state.loading = true;
      state.error = null;
    },
    setError(state, action) {
      state.loading = false;
      state.error = action.payload;
    }
  }
});

const { setToken, clearToken, setLoading, setError } = userStore.actions;
const userReducer = userStore.reducer;

// 异步登录方法
const fetchLogin = (loginForm) => {
  return async (dispatch) => {
    try {
      dispatch(setLoading());
      const res = await request.post('/api/auth/login', loginForm); // 注意修正API地址
      dispatch(setToken(res.data.token));
      return res.data;
    } catch (error) {
      dispatch(setError(error.message));
      throw error;
    }
  };
};

// 登出方法
const fetchLogout = () => {
  return (dispatch) => {
    dispatch(clearToken());
  };
};
// 添加注册action
const fetchRegister = (registerData) => {
  return async (dispatch) => {
    try {
      dispatch(setLoading());
      const res = await request.post('/api/auth/register', registerData);
      dispatch(setToken(res.data.token));
      return res.data;
    } catch (error) {
      dispatch(setError(error.message));
      throw error;
    }
  };
};

// 添加重置密码action
const fetchResetPassword = (resetData) => {
  return async (dispatch) => {
    try {
      dispatch(setLoading());
      const res = await request.post('/api/auth/reset-password', resetData);
      return res.data;
    } catch (error) {
      dispatch(setError(error.message));
      throw error;
    }
  };
};

export { fetchLogin, fetchLogout, setToken, clearToken, setLoading, setError, fetchRegister, fetchResetPassword };
export default userReducer;