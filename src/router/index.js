//路由配置
import Layout from "../pages/Layout";
import Login from "../pages/Login";
import Land from "../pages/Land";
import { createBrowserRouter } from "react-router-dom";
import { AuthRoute } from "@/components/AuthRoute";
import { Navigate } from "react-router-dom";
import Publish from "@/pages/Publish";
import Person from "@/pages/User";

//路由配置实例
const router = createBrowserRouter([
  {
    path: "/land",
    element: <Land />,  // 社团介绍/登录入口页
  },
  {
    path: "/login",
    element: <Login />,
  },

  // 受保护的后台路由
  {
    path: "/",
    element: <AuthRoute><Layout /></AuthRoute>,
    children: [
      {
        index: true, // 默认子路由
        element: <Navigate to="/publish" replace />,
      },
      {
        path: 'publish',
        element: <Publish />,
      },
      {
        path: 'person',
        element: <Person />,
      },
      {
        path: '*',
        element: <Navigate to="/publish" replace />,
      },
    ],
  }
]);

export default router;