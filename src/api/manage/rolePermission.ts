// 角色权限管理模块
import { request } from '@/utils/request';

// POST: 为角色添加单个权限
export const addPermissionToRole = (roleId: number, permissionId: number) => {
  return request({
    url: `/api/role-permissions/${roleId}/permissions/${permissionId}`,
    method: 'post',
  });
};

// DELETE: 从角色删除单个权限
export const removePermissionFromRole = (roleId: number, permissionId: number) => {
  return request({
    url: `/api/role-permissions/${roleId}/permissions/${permissionId}`,
    method: 'delete',
  });
};

// GET: 获取角色已有的权限 ID 列表
export const getRolePermissionIds = (roleId: number) => {
  return request({
    url: `/api/role-permissions/${roleId}/permissions`,
    method: 'get',
  });
};

// GET: 获取拥有指定权限的角色列表
export const getRolesByPermission = (permissionId: number) => {
  return request({
    url: `/api/role-permissions/permissions/${permissionId}/roles`,
    method: 'get',
  });
};

// ─── 工具函数：diff 后批量同步权限 ────────────────────────────────────────────
// 对比旧权限和新权限，增量调用 add / remove
export const syncRolePermissions = async (
  roleId: number,
  oldPerms: number[],
  newPerms: number[]
) => {
  const oldSet = new Set(oldPerms);
  const newSet = new Set(newPerms);

  const toAdd    = newPerms.filter((id) => !oldSet.has(id));
  const toRemove = oldPerms.filter((id) => !newSet.has(id));

  await Promise.all([
    ...toAdd.map((id)    => addPermissionToRole(roleId, id)),
    ...toRemove.map((id) => removePermissionFromRole(roleId, id)),
  ]);
};