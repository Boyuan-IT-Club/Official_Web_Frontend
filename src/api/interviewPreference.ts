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
