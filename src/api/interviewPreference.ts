// 面试志愿与安排（方案B 真实接口）：
//   志愿 = 第一/第二志愿部门 + 可接受时间窗，随简历一次提交（见 Publish 页）
//   安排 = 管理员分配后的结果，学生可站内查询
import { request } from '@/utils/request';

export interface PreferenceTimeSlot {
  timeSlotId: number;
  cycleId: number;
  slotName: string;
  interviewDate: string; // yyyy-MM-dd
  startTime: string;     // HH:mm:ss
  endTime: string;
  status: number;
}

export interface MyPreference {
  preferenceId: number;
  resumeId: number;
  cycleId: number;
  firstDeptId: number;
  firstDeptName?: string;
  secondDeptId?: number;
  secondDeptName?: string;
  acceptedTimeSlots: PreferenceTimeSlot[];
  submittedAt?: string;
}

export interface MySchedule {
  scheduleId: number;
  cycleId: number;
  interviewTime?: string;
  status?: number;
  deptId?: number;
  deptName?: string;
  location?: string;
}

/** 某周期开放中的面试时间窗（学生可勾选） */
export function listOpenTimeSlots(cycleId: number) {
  return request({ url: `/api/interview/preference/cycles/${cycleId}/time-slots`, method: 'get' });
}

/** 提交/更新本人志愿（可重复提交覆盖） */
export function submitPreference(data: {
  cycleId: number;
  firstDeptId: number;
  secondDeptId?: number;
  timeSlotIds: number[];
}) {
  return request({ url: '/api/interview/preference', method: 'post', data });
}

/** 查询本人志愿；未填写时 data 为 null */
export function getMyPreference(cycleId: number) {
  return request({ url: '/api/interview/preference/my', method: 'get', params: { cycleId } });
}

/** 查询本人面试安排（分配结果）；未分配时 data 为 null */
export function getMySchedule(cycleId: number) {
  return request({ url: '/api/interview/schedule/my', method: 'get', params: { cycleId } });
}

export interface MyResult {
  resultId: number;
  decision: number; // 1=通过 2=未通过
  decisionAt?: string;
  assignedDeptId?: number;
  assignedDeptName?: string;
}

/** 查询本人面试结果；结果未出时 data 为 null */
export function getMyResult(cycleId: number) {
  return request({ url: '/api/interview/schedule/my-result', method: 'get', params: { cycleId } });
}

export interface RescheduleRequest {
  requestId: number;
  scheduleId: number;
  cycleId: number;
  reason: string;
  preferredTimeSlotIds?: string;
  status: number; // 0待处理 1已同意 2已拒绝
  adminNote?: string;
  createdAt?: string;
  handledAt?: string;
}

/** 提交面试改期申请（需已分配面试；存在待处理申请时后端会拒绝） */
export function submitReschedule(data: { cycleId: number; reason: string; preferredTimeSlotIds?: string }) {
  return request({ url: '/api/interview/reschedule', method: 'post', data });
}

/** 查询本人最新改期申请；没有时 data 为 null */
export function getMyReschedule(cycleId: number) {
  return request({ url: '/api/interview/reschedule/my', method: 'get', params: { cycleId } });
}

/** 下载本人简历 PDF（返回 blob） */
export function exportMyResumePdf(resumeId: number) {
  return request({ url: `/api/resumes/export/pdf/${resumeId}`, method: 'get', responseType: 'blob' });
}
