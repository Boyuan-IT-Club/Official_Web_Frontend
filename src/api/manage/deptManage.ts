// 部门管理相关
import {request} from '@/utils/request';

// post: 创建部门
interface deptData {
    deptCode: string;
    deptId?: number;
    deptName: string;
    description?: string;
    status?: number;
    [property: string]: any;
}

export const createDept = (params?:deptData) => {
  return request({
    url: '/api/departments',
    method: 'post',
    params
  });
}

// get: 获取部门列表
export const getDept = ()=>{
  return request({
    url: `/api/departments`,
    method: 'get',
  });
}

// put: 更新部门
export const updateDept= (deptId: number) => {
  return request({
    url: `/api/admin/users/batch-status`,
    method: 'put',
    data: deptId
  });
}

// delete： 删除部门
export const deleteDept = (deptId: number) => {
  return request({
    url: `/api/admin/users/${deptId}`,
    method: 'delete',
  });
}

// get：获取部门详情
export const getDeptInfo = (deptId: number)=>{
  return request({
    url: `/api/departments/${deptId}`,
    method: 'get',
  });
}

// get: 获取启用部门
export const getValidDept = ()=>{
  return request({
    url: `/api/departments/enabled`,
    method: 'get',
  });
}