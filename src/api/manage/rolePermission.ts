// 角色权限管理模块

import {request} from '@/utils/request';

// post: 为角色分配权限
export const assignPermissionsToRole = () => {
  return request({
    url: `/api/role-permissions`,
    method: 'post',
  });
}

// post: 为角色添加单个权限
export const addPermissionToRole = (roleId:number, permissionId:number) => {
  return request({
    url: `/api/role-permissions/${roleId}/permissions/${permissionId}`,
    method: 'post',
  });
}

// delete: 从角色删除权限
export const removePermissionFromRole = (roleId:number, permissionId:number) => {
  return request({
    url: `/api/role-permissions/${roleId}/permissions/${permissionId}`,
    method: 'delete',
  });
}

// get: 获取角色的权限ID
export const getRolePermissionIds = (roleId:number) => {
  return request({
    url: `/api/role-permissions/${roleId}/permissions`,
    method: 'get',
  });
}

// get: 获取角色的权限列表
export const getRolePermissions = (roleId:number) => {
  return request({
    url: `/api/role-permissions/${roleId}/permissions`,
    method: 'get',
  });
}

// get: 获取拥有指定权限的角色列表
export const getRolesByPermission = (permissionId:number) => {
  return request({
    url: `/api/role-permissions/permissions/${permissionId}/roles`,
    method: 'get',
  });
}

// post: 批量分配权限
export const assignPermissionsToRoleBatch = () => {
  return request({
    url: `/api/role-permissions/batch`,
    method: 'post',
  });
}

