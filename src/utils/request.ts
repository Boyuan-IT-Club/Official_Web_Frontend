// axios的封装处理
import axios, {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from "axios";
import { getToken, removeToken } from "./token";

/** 业务码：无权限/认证失败（常见为 400 + 2100，Token 可能仍有效） */
export const AUTH_FAILED_CODE = 2100;

/** 仅 HTTP 401 表示登录态失效，需要清 Token 并跳转登录 */
const shouldForceLogout = (status?: number): boolean => status === 401;

const redirectToLogin = (): void => {
  removeToken();
  const path = window.location.pathname;
  if (!path.startsWith("/login") && !path.includes("adminstratorLogin")) {
    window.location.href = "/login";
  }
};

// 是否已设置拦截器
let isInterceptorSet = false;

const request: AxiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://8.159.153.140:8080",
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
      const resData = error.response?.data as Record<string, unknown> | undefined;
      const bizCode = resData?.code ?? (resData?.data as any)?.code;

      if (shouldForceLogout(error.response?.status)) {
        redirectToLogin();
      }

      return Promise.reject({
        status: error.response?.status,
        message:
          String(resData?.message || (resData?.data as any)?.message) ||
          error.message,
        code: bizCode,
        data: error.response?.data,
      });
    },
  );
};

// 初始化拦截器
setupRequestInterceptor();

export { request };
