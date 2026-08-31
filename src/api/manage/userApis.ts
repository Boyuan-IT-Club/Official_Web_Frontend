// src/api/manage.ts
// 用户角色管理模块
//import {assignRoleToUser,addRoleToUser, removeRoleFromUser, getUserRoles,getUserRoles_me,getUsersByRole} from '@/api/manage';
import { request } from '@/utils/request';

// get: 获取用户信息列表——分页
interface GetUsersParams {
  dept?: string;
/** 0 基页码 —— 后端是 Spring Pageable，不是偏移量也不是 1 基 */
  page?: string;
  /** 每页条数。参数名必须是 size，写 pageSize 会被后端忽略并回落到默认 10 条 */
  size?: string;
  /** 匹配姓名或学号 */
  keyword?: string;
  role?: string;
  roleGroup?: string;
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

// get: 用户分类统计（total/frozen/adminCount/memberCount/nonMemberCount）——独立于分页列表
export const getUserStats = () => {
  return request({
    url: `/api/admin/users/stats`,
    method: 'get',
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
/**
 * 批量设置部门。dept 传 null 表示取消分配。
 *
 * 后端按「请求体里有没有 dept 键」区分「漏传」与「显式清空」，
 * 所以这里必须把 null 显式放进 data，不能省略该键。
 */
export const batchUpdateUserDept = (userIds: number[], dept: string | null) => {
  return request({
    url: `/api/admin/users/batch-dept`,
    method: 'put',
    data: { userIds, dept },
  });
} 

// put : 批量录取为社员
export const batchAdmitAsMember = (isMember: boolean, userIds: number[]) => {
  return request({
    url: `/api/admin/users/batch-membership`,
    method: 'put',
    data: { isMember, userIds },
  });
}
// put：批量开除社员
export const batchDismissMember = (isMember:boolean,userIds: number[]) => {
  return request({
    url: `/api/admin/users/batch-membership`,  
    method: 'put',
    data: { isMember,userIds },
  });
}

// get: 全局查询（配合搜索栏）
interface globalUsersParams {
  keyword?: string;
  page?: number;
  searchType?: string;
  size?: number;
  [property: string]: any;
}

export const globalSearch = (params?: globalUsersParams)=>{
  return request({
    url: `/api/search/global`,
    method: 'get',
    params,
  });
}
// GET: 导出全部用户 Excel（管理员）
export const exportUsersExcel = () => {
  return request({
    url: '/api/user/export/excel',
    method: 'get',
    responseType: 'blob',
  });
};

// POST: 替换用户的全部角色（先删旧再插新；roleIds 不可为空）
export const replaceUserRoles = (userId: number, roleIds: number[]) => {
  return request({
    url: '/api/user-roles',
    method: 'post',
    params: { userId, roleIds: roleIds.join(',') },
  });
};
