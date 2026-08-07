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

// ---- 改期申请（管理员） ----
export interface AdminRescheduleRequest {
  requestId: number;
  scheduleId: number;
  resumeId: number;
  userId: number;
  cycleId: number;
  reason: string;
  preferredTimeSlotIds?: string;
  status: number; // 0待处理 1已同意 2已拒绝
  adminNote?: string;
  createdAt?: string;
  handledAt?: string;
}

export function listReschedules(cycleId: number, status?: number) {
  return request({
    url: '/api/interview/reschedule/admin/list',
    method: 'get',
    params: status != null ? { cycleId, status } : { cycleId },
  });
}

/** status: 1同意（随后在「分配与调剂」人工重排）/ 2拒绝 */
export function handleReschedule(requestId: number, status: 1 | 2, adminNote?: string) {
  return request({
    url: `/api/interview/reschedule/admin/${requestId}/handle`,
    method: 'put',
    data: { status, adminNote },
  });
}

// ---- 分配名单 ----
export interface ScheduleRosterItem {
  scheduleId: number;
  resumeId: number;
  userId?: number;
  sessionId?: number;
  interviewTime?: string;
  status?: number;
  notes?: string;
  name?: string;
  username?: string;
  deptName?: string;
}

/** 查询某周期已分配名单（可按场次过滤），按面试时间排序 */
export function listSchedulesRoster(cycleId: number, sessionId?: number) {
  return request({
    url: `/api/interview/admin/cycles/${cycleId}/schedules`,
    method: 'get',
    params: sessionId != null ? { sessionId } : undefined,
  });
}
