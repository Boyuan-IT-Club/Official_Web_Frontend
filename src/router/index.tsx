// src/router/index.tsx
import React from "react";
import { Navigate, createBrowserRouter, type Router } from "react-router-dom";

import Layout from "../pages/Layout";
import Login from "../pages/Login";
import AdministratorLogin from "../pages/AdministratorLogin";
import Land from "../pages/Land";
import Dashboard from "../pages/Dashboard";

import Publish from "@/pages/Publish";
import Person from "@/pages/User";
import Resume from "@/pages/Resume";
import Management from "@/pages/Management";

import { AuthRoute } from "@/components/AuthRoute";

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
        element: <Publish />,
      },
      {
        path: "person",
        element: <Person />,
      },
      {
        path: "resume",
        element: <Resume />,
      },
      {
        path: "manage",
        element: <Management />,
      },
    ],
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
