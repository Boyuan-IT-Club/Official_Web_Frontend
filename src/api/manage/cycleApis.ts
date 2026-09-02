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

/** 一个「当前开放投递」的周期。fieldCount 为 0 表示该周期还没配报名表单 */
export interface OpenCycle {
  cycleId: number;
  cycleName: string;
  academicYear: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  fieldCount: number;
}

/**
 * 当前开放投递的周期列表（启用中 + 今天在起止日期内），按 start_date 倒序。
 *
 * 不要再用 getActiveCycles() 判断「现在该投哪个周期」：is_active 只表示
 * 「是否启用」，往届周期为了查历史简历通常也保持启用，取第一条会任选一个。
 */
export function getOpenCycles() {
  return request({ url: '/api/cycles/open', method: 'get' });
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


/** 招新答疑群二维码，简历填写页展示。没配则 data 为 null */
export function getQaGroupQrCode(cycleId: number) {
  return request({ url: '/api/recruitment/qrcodes/qa', method: 'get', params: { cycleId } });
}
