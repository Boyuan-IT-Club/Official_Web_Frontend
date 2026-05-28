// axios的封装处理
import axios, {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from "axios";
import { getToken, removeToken } from "./token";

// 是否已设置拦截器
let isInterceptorSet = false;

const request: AxiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://43.143.27.198:8080",
  timeout: 10000,
});

/**
 * 设置请求拦截器（只执行一次）
 */
const setupRequestInterceptor = (): void => {
  if (isInterceptorSet) return;
  isInterceptorSet = true;

  // 请求拦截器
  request.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = getToken();

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // FormData 让浏览器自动处理 Content-Type
      if (config.data instanceof FormData && config.headers) {
        delete config.headers["Content-Type"];
      }

      return config;
    },
    (error: AxiosError) => Promise.reject(error),
  );

  // 响应拦截器
  request.interceptors.response.use(
    (response: AxiosResponse) => {
      // 文件下载直接返回 response
      if (
        response.config?.responseType === "blob" ||
        response.config?.responseType === "arraybuffer"
      ) {
        return response;
      }

      return response.data;
    },
    (error: AxiosError) => {
      if (error.response?.status === 401) {
        removeToken();
        window.location.href = "/login";
      }

      return Promise.reject({
        status: error.response?.status,
        message: (error.response?.data as any)?.message || error.message,
        code: (error.response?.data as any)?.code,
        data: error.response?.data,
      });
    },
  );
};

// 初始化拦截器
setupRequestInterceptor();

export { request };
