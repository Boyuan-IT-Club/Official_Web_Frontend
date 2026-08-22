// src/api/manage/profiles.ts —— 候选档案（个人主页）
import { request } from '@/utils/request';

// 候选档案列表行
export interface CandidateProfileListRow {
  userId: number;
  name: string | null;
  username: string;
  major: string | null;
  deptName: string;
  cycleName: string;
  latestInterviewTime: string | null;
  interviewLocation: string | null;
}

export const getCandidateProfiles = () => {
  return request({
    url: `/api/admin/profiles`,
    method: 'get',
  });
};

export const getCandidateProfileDetail = (userId: number) => {
  return request({
    url: `/api/admin/profiles/${userId}`,
    method: 'get',
  });
};