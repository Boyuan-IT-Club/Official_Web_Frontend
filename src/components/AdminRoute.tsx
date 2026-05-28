// src/components/AdminRoute.tsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

export const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { token, userInfo, loading } = useSelector((state: any) => state.user);

  if (!token) return <Navigate to="/login" replace />;
  
  // 等待用户信息加载完成再判断角色
  if (loading || !userInfo?.role) return null;

  if (userInfo.role !== "admin") {
    return <Navigate to="/main/dashboard" replace />;
  }

  return <>{children}</>;
};