// 角色控制模块
import {request} from '@/utils/request';

// post: 创建角色
export const createRole = (roleData) => {
  return request({
    url: '/api/roles',
    method: 'post',
    data: roleData,
  });
}

// get: 获取角色列表
export const getRoles = () => {
    return request({
        url: '/api/roles',
        method: 'get',
    });
}   

// put: 更新角色
export const updateRole = (roleId, roleData) => {
    return request({
        url: `/api/roles/${roleId}`,
        method: 'put',
        data: roleData,
    });
}

// delete: 删除角色
export const deleteRole = (roleId) => {
    return request({
        url: `/api/roles/${roleId}`,
        method: 'delete',
    });
}

// get: 获取角色详情
export const getRole = (roleId) => {
    return request({
        url: `/api/roles/${roleId}`,    
        method: 'get',
    });
}

// get： 获取所有启用的角色
export const getActiveRoles = () => {
    return request({
        url: '/api/roles/available', 
        method: 'get',
    });
}

// get: 获取角色权限列表
export const getRolePermissions = (roleId) => {
    return request({
        url: `/api/roles/${roleId}/permissions`,
        method: 'get',
    });
}