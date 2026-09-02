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
  /** 候场教室（V33） */
  waitingRoom?: string | null;
  /** 本届负责人联系方式（V33） */
  contactInfo?: string | null;
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
  /** 候场教室，面试提醒邮件里用；同一周期通常只有一间 */
  waitingRoom?: string | null;
  /** 本届负责人联系方式，未录取通知邮件末尾附上 */
  contactInfo?: string | null;
}

/** 招新二维码。qrType: DEPT / MAIN_GROUP / QA_GROUP */
export interface RecruitmentQrCode {
  id: number;
  cycleId: number;
  qrType: 'DEPT' | 'MAIN_GROUP' | 'QA_GROUP';
  deptId: number;
  imageUrl: string;
  remark?: string | null;
}

export function listQrCodes(cycleId: number) {
  return request({ url: '/api/recruitment/qrcodes', method: 'get', params: { cycleId } });
}

/**
 * 上传或替换一张二维码。同一 (周期,类型,部门) 只保留一张。
 * 走 multipart，不能设 Content-Type —— 浏览器要自己带 boundary。
 */
export function uploadQrCode(params: {
  cycleId: number; qrType: string; deptId?: number; remark?: string; file: File;
}) {
  const fd = new FormData();
  fd.append('file', params.file);
  const query: Record<string, any> = { cycleId: params.cycleId, qrType: params.qrType };
  if (params.deptId != null) query.deptId = params.deptId;
  if (params.remark) query.remark = params.remark;
  return request({ url: '/api/recruitment/qrcodes', method: 'post', params: query, data: fd });
}

export function deleteQrCode(id: number) {
  return request({ url: `/api/recruitment/qrcodes/${id}`, method: 'delete' });
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
