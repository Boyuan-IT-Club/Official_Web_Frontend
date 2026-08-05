import { request } from '@/utils';

/** 活动管理（对应后端 /api/activity，写操作需要 activity:manage 权限） */
export interface Activity {
  activityId: number;
  title: string;
  description?: string;
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

export function createActivity(data: Partial<Activity>) {
  return request({ url: '/api/activity', method: 'post', data });
}

export function updateActivity(id: number, data: Partial<Activity>) {
  return request({ url: `/api/activity/${id}`, method: 'put', data });
}

export function deleteActivity(id: number) {
  return request({ url: `/api/activity/${id}`, method: 'delete' });
}
