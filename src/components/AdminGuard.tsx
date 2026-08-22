import React, { useEffect } from 'react';
import { message } from 'antd';
import { Navigate } from 'react-router-dom';
import { getToken } from '@/utils';
import { hasConsoleAccess } from '@/utils/jwt';

/**
 * 管理端准入守卫：要求已登录且 JWT 持有至少一个管理类权限码。
 * 注意：这只是界面层拦截，真正的权限裁决在后端 @PreAuthorize（RBAC）。
 */
export const AdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = getToken();
  const allowed = hasConsoleAccess(token);

  useEffect(() => {
    if (token && !allowed) {
      message.warning('当前账号没有管理权限，请使用管理员账号登录');
    }
  }, [token, allowed]);

  if (!token) return <Navigate to="/login" replace />;
  if (!allowed) return <Navigate to="/login" replace />;
  return <>{children}</>;
};
