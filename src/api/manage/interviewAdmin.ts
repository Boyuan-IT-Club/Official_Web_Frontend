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
  /** 主部门。多部门场次下只是其中之一，判定用 deptIds */
  deptId: number;
  /** 本场次覆盖的全部部门（V36）。单部门场次里就一个元素 */
  deptIds?: number[];
  deptNames?: string[];
  deptName?: string;
  location: string;
  capacity: number;
  currentOccupied?: number;
  remaining?: number;
  interviewDurationMinutes?: number;
  status: number;
}

export interface AssignedItem {
  /** 面试安排 ID；V34 起可为空 —— 不能线下参加或未被排上场次的人没有安排 */
  scheduleId: number | null;
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

export interface OfflineUnavailableItem {
  userId: number;
  resumeId: number;
  name?: string | null;
  /** 登录用户名。多数同学等于学号，但早期账号是名字拼音，别拿它当学号显示 */
  username?: string | null;
  /** 简历里填的学号。这才是「学号」该显示的值 */
  studentId?: string | null;
  email?: string | null;
  phone?: string | null;
  /** 学生自己填的说明，可能为空 */
  note?: string | null;
  resumeStatus?: number | null;
}

/**
 * 无法参加线下面试的同学名单。
 *
 * 这批人不会被自动排进场次，管理员得单独约线上面试——在此之前他们在
 * 管理端是「看不见」的：既不在已分配名单里，也不在任何场次下。
 */
export function listOfflineUnavailable(cycleId: number) {
  return request({ url: `/api/interview/admin/cycles/${cycleId}/offline-unavailable`, method: 'get' });
}

/** 查询某周期已分配名单（可按场次过滤），按面试时间排序 */
export function listSchedulesRoster(cycleId: number, sessionId?: number) {
  return request({
    url: `/api/interview/admin/cycles/${cycleId}/schedules`,
    method: 'get',
    params: sessionId != null ? { sessionId } : undefined,
  });
}

// ---- 飞书同步 ----
export interface FeishuTaskStatus {
  taskId: number;
  taskType?: string;
  status: string; // PENDING/RUNNING/SUCCESS/PARTIAL_SUCCESS/FAILED
  importedCount?: number;
  failedCount?: number;
  skippedCount?: number;
  progressPercent?: number;
  errorMessage?: string;
  finishedAt?: string;
}

/** 平台 → 飞书：把面试安排推送到多维表格（异步，返回 taskId） */
export function pushToFeishu(data: { cycleId: number; slotId?: number; feishuTableUrl?: string; forceUpdate?: boolean }) {
  return request({ url: '/api/interview/feishu/import', method: 'post', data });
}

/** 飞书 → 平台：从多维表格拉回录取结果（异步，返回 taskId） */
export function pullFromFeishu(data: { cycleId: number; feishuTableUrl: string; updateUserDept?: boolean }) {
  return request({ url: '/api/interview/feishu/import-from-table', method: 'post', data });
}

export interface LocationTableConfig {
  location: string;
  /** null 表示该地点尚未配置链接，推送时会被跳过 */
  feishuTableUrl?: string | null;
  remark?: string | null;
  sessionCount: number;
  scheduleCount: number;
  /** 尚未同步到飞书的人数 */
  pendingCount: number;
}

/** 该周期的面试地点及各自的飞书表格链接配置（推送按地点分桶） */
export function listFeishuLocations(cycleId: number) {
  return request({ url: `/api/interview/feishu/cycles/${cycleId}/locations`, method: 'get' });
}

/** 保存某地点的表格链接；feishuTableUrl 留空表示清除该地点的配置 */
export function saveFeishuLocation(cycleId: number, data: { location: string; feishuTableUrl?: string; remark?: string }) {
  return request({ url: `/api/interview/feishu/cycles/${cycleId}/locations`, method: 'put', data });
}

export interface PullAllResult {
  tasks: { location: string; taskId: number }[];
  skippedLocations: string[];
}

/** 一键从所有已配链接的地点拉回：每个地点一个独立任务 */
export function pullAllLocations(cycleId: number, updateUserDept = true) {
  return request({
    url: `/api/interview/feishu/cycles/${cycleId}/pull-all`,
    method: 'post',
    params: { updateUserDept },
  });
}

/** 查询飞书任务进度 */
export function getFeishuTask(taskId: number) {
  return request({ url: `/api/interview/feishu/import/tasks/${taskId}`, method: 'get' });
}

// ---- 面试结果与通知 ----
export interface InterviewResultItem {
  resultId: number;
  scheduleId: number;
  userId: number;
  decision?: number; // 1通过 2未通过
  assignedDeptId?: number;
  decisionAt?: string;
  resumeId?: number | null;
  /** 最近一次结果通知的发送时间；空 = 从未通知（V27 起后端返回） */
  notifiedAt?: string;
  /**
   * 联表查出来的展示字段。优先用它，别再去「面试安排名册」里凑名字——
   * 没有面试安排的同学不在那份名册里，会退化成「用户#14」。
   */
  userName?: string;
  departmentName?: string;
}

export function listResults(params: { cycleId: number; name?: string; decision?: string; department?: string; page?: number; size?: number }) {
  return request({ url: '/api/interview/result/list', method: 'get', params });
}

/**
 * 从本周期的生效面试安排生成结果名单（decision=0 待定），已有结果行的安排跳过（幂等）。
 * 结果行此前只有飞书拉取会创建 —— 不接飞书「结果与通知」就是空的。
 */
export function seedResultsFromSchedules(cycleId: number) {
  return request({ url: '/api/interview/result/seed-from-schedules', method: 'post', params: { cycleId } });
}

export function updateResult(resultId: number, data: { decision?: number; assignedDeptId?: number }) {
  return request({ url: `/api/interview/result/update/${resultId}`, method: 'put', data });
}

export interface BatchDecisionResult {
  updated: number;
  /** 不属于该周期或已不存在的 resultId，服务端逐条跳过而非整批失败 */
  skipped: number[];
}

/**
 * 批量录取 / 批量标记未通过。
 * cycleId 必传：结果的周期挂在面试安排上，服务端据此把夹带的别届 ID 挡掉。
 * decision=1 时必须给 assignedDeptId；=2 时服务端会清空录取部门。
 */
export function batchDecision(data: {
  cycleId: number;
  resultIds: number[];
  decision: 1 | 2;
  assignedDeptId?: number;
}) {
  return request({ url: '/api/interview/result/batch-decision', method: 'post', data });
}

/** 批量发送结果通知邮件 */
export function sendResultNotifications(data: { resultIds: number[]; notificationType: string; customMessage?: string }) {
  return request({ url: '/api/interview/result/send-notifications', method: 'post', data });
}
