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
    element: <AuthRoute><Layout /></AuthRoute>,
    children: [
      {
        index: true,
        element: <Land />,
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
        element: <Navigate to="/" replace />,
      },
    ],
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/land",
    element: <Navigate to="/" replace />,
  }
]);

export default router;