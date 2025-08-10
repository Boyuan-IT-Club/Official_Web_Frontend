//路由配置
import Layout from "../pages/Layout";
import Login from "../pages/Login";
import { createBrowserRouter } from "react-router-dom";
/* import { AuthRoute } from "@/components/AuthRoute"; */
//路由配置实例
const router = createBrowserRouter([
  {
    path: "/",
    element:/* <AuthRoute> */<Layout />/* </AuthRoute> */
  },
  {
    path: "/login",
    element: <Login />
  }])
export default router;