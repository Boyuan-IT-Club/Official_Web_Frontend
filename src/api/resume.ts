// src/api/resume.ts
import { request } from '@/utils/request';

// 获取简历字段配置
export const getResumeFields = (cycleId: number) => {
  return request({
    url: `/api/resume/fields/${cycleId}`,
    method: 'get',
  });
};

// 更新简历字段配置
export const updateResumeFields = (cycleId: number, fields: any[]) => {
  return request({
    url: `/api/resume/fields/${cycleId}`,
    method: 'put',
    data: { fields },
  });
};