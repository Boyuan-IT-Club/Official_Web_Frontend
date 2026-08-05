import { request } from '@/utils';

/** 招募周期（对应后端 /api/cycles，需要 cycle:manage 权限的写操作） */
export interface RecruitmentCycle {
  cycleId: number;
  cycleName: string;
  description?: string;
  startDate: string;
  endDate: string;
  academicYear: string;
  status: number; // 1未开始 2进行中 3已结束（以后端为准）
  isActive: number; // 1活跃
  createdAt?: string;
  updatedAt?: string;
}

export interface CyclePayload {
  cycleId?: number;
  cycleName: string;
  description?: string;
  startDate: string;
  endDate: string;
  academicYear: string;
  status?: number;
  isActive?: number;
}

export function getCyclesPage(params: { page?: number; size?: number }) {
  return request({ url: '/api/cycles/page', method: 'get', params });
}

export function getAllCycles() {
  return request({ url: '/api/cycles', method: 'get' });
}

export function getActiveCycles() {
  return request({ url: '/api/cycles/active/1', method: 'get' });
}

export function createCycle(data: CyclePayload) {
  return request({ url: '/api/cycles', method: 'post', data });
}

export function updateCycle(data: CyclePayload) {
  return request({ url: '/api/cycles', method: 'put', data });
}

export function deleteCycle(cycleId: number) {
  return request({ url: `/api/cycles/${cycleId}`, method: 'delete' });
}

/** 按起止日期刷新所有周期状态 */
export function refreshCycleStatuses() {
  return request({ url: '/api/cycles/update-statuses', method: 'post' });
}
