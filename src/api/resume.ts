// src/api/resume.ts
import { request } from '@/utils/request';

// 获取简历字段配置
export const getResumeFields = (cycleId: number) => {
  return request({
    url: `/api/resumes/fields/${cycleId}`,
    method: 'get',
  });
};

// 更新简历字段配置
export const updateResumeFields = (cycleId: number, fields: any[]) => {
  return request({
    url: `/api/resumes/fields/${cycleId}`,
    method: 'put',
    data: { fields },
  });
};

/** 本人历届申请（各周期的简历概要，按周期倒序）。已软删除的周期后端已过滤 */
export const getMyResumes = () => {
  return request({ url: '/api/resumes/my', method: 'get' });
};
