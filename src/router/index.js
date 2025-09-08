// src/router/index.js
import { createBrowserRouter } from "react-router-dom";
import Layout from "../pages/Layout";
import Login from "../pages/Login";
import Land from "../pages/Land";
import Dashboard from "../pages/Dashboard";
import { AuthRoute } from "@/components/AuthRoute";
import { Navigate } from "react-router-dom";
import Publish from "@/pages/Publish";
import Person from "@/pages/User";

// 路由配置实例
const router = createBrowserRouter([
  {
    path: "/",
    element: <Land />, // Land页面独立，不包含Layout
  },
  {
    path: "/main",
    element: <AuthRoute><Layout /></AuthRoute>, // 需要登录的路由放在/main下
    children: [
      {
        index: true,
        element: <Navigate to="/main/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'publish',
        element: <Publish />,
      },
      {
        path: 'person',
        element: <Person />,
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