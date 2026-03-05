// src/api/manage.ts
// 用户角色管理模块
//import {assignRoleToUser,addRoleToUser, removeRoleFromUser, getUserRoles,getUserRoles_me,getUsersByRole} from '@/api/manage';
import { request } from '@/utils/request';

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
}