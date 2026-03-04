//封装高阶组件
//核心逻辑：有token就放行，没有token就跳转到登录页面
// components/AuthRoute.tsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getToken } from "@/utils";

export interface AuthRouteProps {
  children: React.ReactNode;
}

export function AuthRoute({ children }: AuthRouteProps) {
  const routerLocation = useLocation();
  // 本地开发自动放行，打包上线仍然正常登录校验
  const isDev = process.env.NODE_ENV === "development";
  if (isDev) return <>{children}</>;

  const token = getToken();

  if (token) return <>{children}</>;

  // 登录后跳回原页面（把当前路由位置塞进 state）
  return <Navigate to="/login" replace state={{ from: routerLocation }} />;
}
