import { request } from '@/utils';

/** 活动管理（对应后端 /api/activity，写操作需要 activity:manage 权限） */
export interface Activity {
  activityId: number;
  title: string;
  /** 列表卡片上的纯文本摘要 */
  description?: string;
  /** 图文详情：富文本 HTML，服务端已按白名单消毒，图片以 URL 内嵌 */
  detailContent?: string;
  category?: string;
  coverImage?: string;
  startTime?: string;      // yyyy-MM-dd
  endTime?: string;
  signupStart?: string;
  signupDeadline?: string;
  location?: string;
  maxParticipants?: number;
  currentParticipants?: number;
  status?: number;
  isFeatured?: boolean;
  cycleSequence?: number;
  createdAt?: string;
}

export function listActivities() {
  return request({ url: '/api/activity', method: 'get' });
}

export function getActivity(id: number) {
  return request({ url: `/api/activity/${id}`, method: 'get' });
}

export function createActivity(data: Partial<Activity>) {
  return request({ url: '/api/activity', method: 'post', data });
}

export function updateActivity(id: number, data: Partial<Activity>) {
  return request({ url: `/api/activity/${id}`, method: 'put', data });
}

export function deleteActivity(id: number) {
  return request({ url: `/api/activity/${id}`, method: 'delete' });
}

/** 上传活动图片（封面/正文插图），返回 { url, objectKey }，需 activity:manage */
export function uploadActivityImage(file: File) {
  const data = new FormData();
  data.append('file', file);
  return request({ url: '/api/activity/image', method: 'post', data });
}
