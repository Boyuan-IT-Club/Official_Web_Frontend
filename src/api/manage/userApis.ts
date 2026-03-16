// src/api/manage.ts
// 用户角色管理模块
//import {assignRoleToUser,addRoleToUser, removeRoleFromUser, getUserRoles,getUserRoles_me,getUsersByRole} from '@/api/manage';
import { request } from '@/utils/request';

// get: 获取用户信息列表
export interface GetUsersParams {
  dept?: string;
  page?: string;
  pageSize?: string;
  role?: string;
  status?: string;
  [property: string]: any;
}

export const getAllUsers = (params?: GetUsersParams) => {
  return request({
    url: `/api/admin/users`,
    method: 'get',
    params,
  });
}
// post：为用户分配角色
export const assignRoleToUser = (userId: number, roleIds: number[]) => {
  return request({
    url: `/api/user-roles/${userId}/roles/${roleIds}`,
    method: 'post',
  });
};

// post：为用户添加单个角色
export const addRoleToUser = (userId: number, roleId: number) => {
  return request({
    url: `/api/user-roles/${userId}/roles/${roleId}`,
    method: 'post',
  });
};

// delete：为用户删除角色
export const removeRoleFromUser = (userId: number, roleId: number) => {
  return request({
    url: `/api/user-roles/${userId}/roles/${roleId}`,
    method: 'delete',
  });
};

// get: 获取用户的角色列表
export const getUserRoles = (userId: number) => {
  return request({
    url: `/api/user-roles/${userId}/roles`,
    method: 'get',
  });
};

// get: 获取当前用户的角色列表
export const getUserRoles_me  = () => {
  return request({
    url: `/api/user-roles/me/roles`,
    method: 'get',
  });
};

// get: 获取拥有指定角色的用户列表
export const getUsersByRole = (roleId: number) => {
  return request({
    url: `/api/user-roles/roles/${roleId}/users`,
    method: 'get',
  });
}

// post: 批量分配角色给多个用户
export const assignRoleToUsers = (roleIds: number[], userIds: number[]) => {
  return request({
    url: `/api/user-roles/roles/${roleIds}/users/${userIds}`,
    method: 'post',
  });
};

// get： 获取所有启用的角色
export const getActiveRoles = () => {
    return request({
        url: '/api/roles/available', 
        method: 'get',
    });
}

//  put: 冻结用户
export const freezeUser = (userId: number) => {
  return request({
    url: `/api/admin/users/${userId}/freeze`,
    method: 'put',
  });
}

// put: 解冻用户
export const unfreezeUser = (userId: number) => {
  return request({
    url: `/api/admin/users/${userId}/unfreeze`,
    method: 'put',
  });
}

// delete: 删除用户
export const deleteUser = (userId: number) => {
  return request({
    url: `/api/admin/users/${userId}`,
    method: 'delete',
  });
}

// put: 批量冻结用户
export const batchFreezeUsers = (userIds: number[]) => {
  return request({
    url: `/api/admin/users/batch-status`,
    method: 'put',
    data: { userIds },
  });
}

// put: 批量解冻用户
export const batchUnfreezeUsers = (userIds: number[]) => {
  return request({
    url: `/api/admin/users/batch-status`,
    method: 'put',
    data: { userIds },
  });
}

// put: 批量修改用户部门
export const batchUpdateUserDept = (userIds: number[], dept: string) => {
  return request({
    url: `/api/admin/users/batch-dept`,
    method: 'put',
    data: { userIds, dept },
  });
} 

// put : 批量录取为社员
export const batchAdmitAsMember = (userIds: number[]) => {
  return request({
    url: `/api/admin/users/batch-membership`,  
    method: 'put',
    data: { userIds },
  });
}