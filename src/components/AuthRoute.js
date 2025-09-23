//封装高阶组件
//核心逻辑：有token就放行，没有token就跳转到登录页面
import { Navigate } from 'react-router-dom';
import { getToken } from'@/utils'
export function AuthRoute({children}) {
    const token=getToken();
    if(token)
    {
        return <>{children}</>
    }
    else{
        return <Navigate to="/login" replace />;
    }
}