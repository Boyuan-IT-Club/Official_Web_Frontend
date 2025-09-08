// axios的封装处理
import axios from 'axios';
import { getToken, removeToken } from './token';

// 全局变量标记是否已设置拦截器
let isInterceptorSet = false;

const request = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://official.boyuan.club',
  timeout: 10000,
  // 移除默认的Content-Type设置，让axios根据数据类型自动设置
});

/**
 * 设置请求拦截器（确保只设置一次）
 */
const setupRequestInterceptor = () => {
  if (isInterceptorSet) return;
  isInterceptorSet = true;

  // 添加请求拦截器
  request.interceptors.request.use(
    (config) => {
      // 在发送请求之前做些什么
      const token = getToken();
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`; // 添加token到请求头
      }
      
      // 如果是FormData，让浏览器自动设置Content-Type（包括boundary）
      if (config.data instanceof FormData) {
        delete config.headers['Content-Type']; // 删除可能存在的Content-Type设置
      }
      
      return config;
    },
    (error) => {
      // 对请求错误做些什么
      return Promise.reject(error);
    }
  );

  // 添加响应拦截器
  request.interceptors.response.use(
    (response) => {
      // 对响应数据做点什么
      return response.data;
    },
    (error) => {
      // 对响应错误做点什么
      if (error.response?.status === 401) {
        removeToken();
        window.location.href = '/login';
      }
      
      // 返回一个更友好的错误对象
      return Promise.reject({
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        code: error.response?.data?.code,
        data: error.response?.data
      });
    }
  );
};

// 初始化设置拦截器
setupRequestInterceptor();

export { request };