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
    path: "/",
    element: <Land />,  // 将根路径指向Land页面
  },
  {
    path: "/land",
    element: <Land />,  // 保留land路径
  },
  {
    path: "/login",
    element: <Login />,
  },

  // 受保护的后台路由
  {
    path: "/dashboard",  // 修改后台路由路径
    element: /* <AuthRoute> */<Layout />/* </AuthRoute> */,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard/publish" replace />,
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
        element: <Navigate to="/dashboard/publish" replace />,
      },
    ],
  }
]);

export default router;