// src/router/index.tsx
import React, { Suspense, lazy } from "react";
import { Navigate, createBrowserRouter, type Router } from "react-router-dom";
import { Spin } from "antd";

import Layout from "../pages/Layout";
import Login from "../pages/Login";
import AdministratorLogin from "../pages/AdministratorLogin";
import Land from "../pages/Land";
import { AuthRoute } from "@/components/AuthRoute";

// 直接导入轻量页面
import Dashboard from "../pages/Dashboard";
import ClubIntro from "../pages/ClubIntro";
import Lessons from "../pages/Lessons";
import Activities from "../pages/Activities";
import Experience from "../pages/Experience";

// 按需懒加载重型页面 — 减少首屏 bundle 体积
const Publish = lazy(() => import("@/pages/Publish"));
const InterviewAppointment = lazy(() => import("@/pages/InterviewAppointment"));
const Person = lazy(() => import("@/pages/User"));
const Resume = lazy(() => import("@/pages/Resume"));
const Management = lazy(() => import("@/pages/Management"));

// 懒加载包裹组件
const LazyLoad: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}><Spin size="large" /></div>}>
    {children}
  </Suspense>
);

// 路由配置实例
const router = createBrowserRouter([
  {
    path: "/",
    element: <Land />, // Land页面独立，不包含Layout
  },
  {
    path: "/main",
    element: (
      <AuthRoute>
        <Layout />
      </AuthRoute>
    ), // 需要登录的路由放在/main下
    children: [
      {
        index: true,
        element: <Navigate to="/main/dashboard" replace />,
      },
      {
        path: "dashboard",
        element: <Dashboard />,
      },
      {
        path: "publish",
        element: <LazyLoad><Publish /></LazyLoad>,
      },
      {
        path: "person",
        element: <LazyLoad><Person /></LazyLoad>,
      },
      {
        path: "interview-appointment",
        element: <LazyLoad><InterviewAppointment /></LazyLoad>,
      },
      {
        path: "resume",
        element: <LazyLoad><Resume /></LazyLoad>,
      },
      {
        path: "manage",
        element: <LazyLoad><Management /></LazyLoad>,
      },
    ],
  },
  {
    path: "/club-intro",
    element: <ClubIntro />,
  },

{
    path: "/Lessons",          
    element: <Lessons />,     
  },

  {
    path:"/Activities",
    element:<Activities />,
  },

  {
  path: "/Experience", 
  element: <Experience />,
},
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/adminstratorLogin",
    element: <AdministratorLogin />
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },

]);

export default router;
