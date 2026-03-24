// 部门管理相关
import { request } from '@/utils/request';

export interface DeptData {
  deptCode: string;
  deptId?: number;
  deptName: string;
  description?: string;
  status?: number;
  [property: string]: any;
}

// POST: 创建部门
export const createDept = (data?: DeptData) => {
  return request({
    url: '/api/departments',
    method: 'post',
    data,                          // ✅ 修复：POST 用 data，不是 params
  });
};

// GET: 获取部门列表
export const getDept = () => {
  return request({
    url: '/api/departments',
    method: 'get',
  });
};

// PUT: 更新部门
export const updateDept = (deptId: number, data: DeptData) => {
  return request({
    url: `/api/departments/${deptId}`,  // ✅ 修复：URL 写错了
    method: 'put',
    data,                               // ✅ 修复：补上 data 参数
  });
};

// DELETE: 删除部门
export const deleteDept = (deptId: number) => {
  return request({
    url: `/api/departments/${deptId}`,  // ✅ 修复：URL 写错了
    method: 'delete',
  });
};

// GET: 获取部门详情
export const getDeptInfo = (deptId: number) => {
  return request({
    url: `/api/departments/${deptId}`,
    method: 'get',
  });
};

// GET: 获取启用部门
export const getValidDept = () => {
  return request({
    url: '/api/departments/enabled',
    method: 'get',
  });
};