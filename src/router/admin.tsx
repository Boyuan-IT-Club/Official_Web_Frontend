// 管理端路由（admin.boyuan.club）
// 用户端路由在 ./user.tsx；构建时由 craco 的 @routes 别名按 REACT_APP_MODE 二选一。
import React, { Suspense, lazy } from "react";
import { Navigate, createBrowserRouter } from "react-router-dom";
import { Spin } from "antd";

import Login from "../pages/Login";
import AdminLayout from "../pages/AdminLayout";
import { AuthRoute } from "@/components/AuthRoute";
import RouteErrorBoundary from "@/components/RouteErrorBoundary";
import { AdminGuard } from "@/components/AdminGuard";

// 管理页面全部懒加载
const Management = lazy(() => import("@/pages/Management"));
const Resume = lazy(() => import("@/pages/Resume"));
const CycleManage = lazy(() => import("@/pages/CycleManage"));
const InterviewManage = lazy(() => import("@/pages/InterviewManage"));
const ActivityManage = lazy(() => import("@/pages/ActivityManage"));

const LazyLoad: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}><Spin size="large" /></div>}>
    {children}
  </Suspense>
);

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <AuthRoute>
        <AdminGuard>
          <AdminLayout />
        </AdminGuard>
      </AuthRoute>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        index: true,
        element: <Navigate to="/manage" replace />,
      },
      {
        path: "manage",
        element: <LazyLoad><Management /></LazyLoad>,
      },
      {
        path: "resumes",
        element: <LazyLoad><Resume /></LazyLoad>,
      },
      {
        path: "cycles",
        element: <LazyLoad><CycleManage /></LazyLoad>,
      },
      {
        path: "interviews",
        element: <LazyLoad><InterviewManage /></LazyLoad>,
      },
      {
        path: "activities",
        element: <LazyLoad><ActivityManage /></LazyLoad>,
      },
    ],
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);

export default router;
