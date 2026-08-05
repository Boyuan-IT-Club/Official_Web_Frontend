import { request } from '@/utils';

/** 面试管理（对应后端 /api/interview/admin，方案B：时间段/场次维护 + 一键分配 + 人工调剂） */

export interface InterviewTimeSlot {
  timeSlotId: number;
  cycleId: number;
  slotName: string;
  interviewDate: string; // yyyy-MM-dd
  startTime: string;     // HH:mm:ss
  endTime: string;
  status: number;
}

export interface InterviewSession {
  sessionId: number;
  cycleId: number;
  timeSlotId: number;
  slotName?: string;
  interviewDate?: string;
  startTime?: string;
  endTime?: string;
  deptId: number;
  deptName?: string;
  location: string;
  capacity: number;
  currentOccupied?: number;
  remaining?: number;
  interviewDurationMinutes?: number;
  status: number;
}

export interface AssignedItem {
  scheduleId: number;
  resumeId: number;
  userId: number;
  name: string;
  matchedChoice: number;
  sessionId: number;
  deptId: number;
  deptName: string;
  location: string;
  interviewStartTime: string;
  interviewEndTime: string;
}

export interface UnassignedItem {
  resumeId: number;
  userId: number;
  name: string;
  reason?: string;
  firstChoiceDeptId?: number;
  secondChoiceDeptId?: number;
}

export interface SessionAssignmentResult {
  cycleId: number;
  assignedAt: string;
  assignedCount: number;
  unassignedCount: number;
  assigned: AssignedItem[];
  unassigned: UnassignedItem[];
}

// ---- 时间段 ----
export function listTimeSlots(cycleId: number) {
  return request({ url: `/api/interview/admin/cycles/${cycleId}/time-slots`, method: 'get' });
}
export function createTimeSlot(data: Partial<InterviewTimeSlot>) {
  return request({ url: '/api/interview/admin/time-slots', method: 'post', data });
}
export function updateTimeSlot(timeSlotId: number, data: Partial<InterviewTimeSlot>) {
  return request({ url: `/api/interview/admin/time-slots/${timeSlotId}`, method: 'put', data });
}
export function deleteTimeSlot(timeSlotId: number) {
  return request({ url: `/api/interview/admin/time-slots/${timeSlotId}`, method: 'delete' });
}

// ---- 场次 ----
export function listSessions(cycleId: number, deptId?: number) {
  return request({
    url: `/api/interview/admin/cycles/${cycleId}/sessions`,
    method: 'get',
    params: deptId ? { deptId } : undefined,
  });
}
export function createSession(data: Partial<InterviewSession>) {
  return request({ url: '/api/interview/admin/sessions', method: 'post', data });
}
export function updateSession(sessionId: number, data: Partial<InterviewSession>) {
  return request({ url: `/api/interview/admin/sessions/${sessionId}`, method: 'put', data });
}
export function deleteSession(sessionId: number) {
  return request({ url: `/api/interview/admin/sessions/${sessionId}`, method: 'delete' });
}

// ---- 分配 ----
/** 一键分配（幂等，只处理未分配的候选人） */
export function assignSessions(cycleId: number) {
  return request({ url: `/api/interview/admin/cycles/${cycleId}/assign`, method: 'post' });
}
/** 待人工调剂名单 */
export function listUnassigned(cycleId: number) {
  return request({ url: `/api/interview/admin/cycles/${cycleId}/unassigned`, method: 'get' });
}
/** 有余量的场次（人工调剂的目标，可按部门过滤） */
export function listAvailableSessions(cycleId: number, deptId?: number) {
  return request({
    url: `/api/interview/admin/cycles/${cycleId}/available-sessions`,
    method: 'get',
    params: deptId ? { deptId } : undefined,
  });
}
/** 人工调剂：把候选人（按简历ID）分配/重分配到目标场次 */
export function manualAssign(resumeId: number, targetSessionId: number) {
  return request({
    url: `/api/interview/admin/preferences/${resumeId}/assign`,
    method: 'post',
    data: { targetSessionId },
  });
}
