import type { AxiosRequestConfig } from 'axios';
import { request } from '@/utils';

/**
 * 协同面试评价表（对应后端 /api/interview/evaluation）。
 *
 * 单元格的实时编辑不走这里，而是由 collab 层直连协同服务的 WebSocket；
 * 本模块只负责开表、锁定、维度配置与汇总这些「表级」操作。
 */

/** 后端统一响应体。request 拦截器已把 AxiosResponse 拆成了 data，这里补上类型 */
interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
}

/** request 的返回类型是 AxiosResponse，但拦截器实际返回的是响应体，故在此收敛一次 */
// 不能写 Parameters<typeof request>[0]：request 是重载的 axios 实例，
// Parameters<> 只取最后一个重载 (url: string, config?)，配置参数会被推成 string，
// 于是每个 call({...}) 都报「对象不能赋给 string」
function call<T>(config: AxiosRequestConfig): Promise<ApiEnvelope<T>> {
  return request(config) as unknown as Promise<ApiEnvelope<T>>;
}

/** 评分维度（协同评价表的一列） */
export interface EvaluationDimension {
  dimensionId: number;
  name: string;
  /** 该维度满分 */
  maxScore: number;
  /** 加权总分中的权重 */
  weight: number;
  /** 列顺序（升序） */
  sortOrder?: number;
}

/** 保存维度时的单项，dimensionId 为空表示新增 */
export interface EvaluationDimensionInput {
  dimensionId?: number;
  name: string;
  maxScore: number;
  weight: number;
  sortOrder?: number;
}

/** 评价表状态 */
export interface EvaluationBoard {
  cycleId: number;
  /** 协同文档名，前端据此连接协同服务，如 eval-board:3 */
  docName: string;
  /** 已锁定时全员只读 */
  locked: boolean;
  rowCount: number;
  dimensionCount: number;
  updatedAt?: string;
}

/** 推荐意见取值 */
export const RECOMMENDATION_OPTIONS = [
  { value: 1, label: '倾向通过' },
  { value: 2, label: '待定' },
  { value: 3, label: '不倾向' },
] as const;

/** 评价状态：1进行中 2已定稿 */
export const EVALUATION_STATUS = { DRAFT: 1, SUBMITTED: 2 } as const;

/** 参与编辑过这份评价的面试官 */
export interface EvaluationContributor {
  userId: number;
  name?: string;
}

/** 汇总里的一位候选人：共编模型下一位候选人只有一份评价 */
export interface CandidateSummary {
  scheduleId: number;
  resumeId: number;
  userId: number;
  candidateName: string;
  deptName?: string;
  interviewTime?: string;
  /** 各维度得分 {dimensionId: 得分} */
  scores: Record<number, number>;
  totalScore?: number;
  comment?: string;
  /** 共同结论：1倾向通过 2待定 3不倾向 */
  recommendation?: number;
  /** 1进行中 2已定稿；尚无评价时为空 */
  status?: number;
  contributors: EvaluationContributor[];
  /** 该场次绑定的面试官数 */
  assignedInterviewerCount: number;
  lastEditedBy?: number;
  lastEditedByName?: string;
  submittedBy?: number;
  submittedByName?: string;
  submittedAt?: string;
}

/** 全周期评价汇总：一位候选人一行 */
export interface EvaluationSummary {
  cycleId: number;
  dimensions: EvaluationDimension[];
  candidates: CandidateSummary[];
}

/** 开启该周期的协同评价表（已开启时原样返回，重复点击不报错） */
export function openBoard(cycleId: number) {
  return call<EvaluationBoard>({
    url: `/api/interview/evaluation/cycles/${cycleId}/board`,
    method: 'post',
  });
}

/** 查询评价表状态，面试官据此拿到 docName 才能连上协同服务 */
export function getBoard(cycleId: number) {
  return call<EvaluationBoard>({
    url: `/api/interview/evaluation/cycles/${cycleId}/board`,
    method: 'get',
  });
}

/** 锁定/解锁评价表：锁定后协同服务拒绝一切写入，全员只读 */
export function setBoardLocked(cycleId: number, locked: boolean) {
  return call<EvaluationBoard>({
    url: `/api/interview/evaluation/cycles/${cycleId}/board/lock`,
    method: 'put',
    params: { locked },
  });
}

/** 查询该周期的评分维度模板 */
export function listDimensions(cycleId: number) {
  return call<EvaluationDimension[]>({
    url: `/api/interview/evaluation/cycles/${cycleId}/dimensions`,
    method: 'get',
  });
}

/** 覆盖式保存评分维度模板：请求中未出现的既有维度会被删除 */
export function saveDimensions(cycleId: number, dimensions: EvaluationDimensionInput[]) {
  return call<EvaluationDimension[]>({
    url: `/api/interview/evaluation/cycles/${cycleId}/dimensions`,
    method: 'put',
    data: { dimensions },
  });
}

/** 全周期评价汇总，供录取决定参考 */
export function getEvaluationSummary(cycleId: number) {
  return call<EvaluationSummary>({
    url: `/api/interview/evaluation/cycles/${cycleId}/summary`,
    method: 'get',
  });
}

/** 简历速览的返回体，字段排版交给 ResumeQuickView */
export interface CandidateResume {
  resumeId: number;
  userId: number;
  status?: number;
  simpleFields?: { fieldId?: number; fieldKey?: string; fieldLabel?: string; fieldValue?: string }[];
}

/**
 * 评价表内速览候选人简历。
 * 面试官没有 resume:view，后端按「该场次的面试官绑定」放行，范围恰好是他要面的那几个人。
 */
export function getCandidateResume(cycleId: number, scheduleId: number) {
  return call<CandidateResume>({
    url: `/api/interview/evaluation/cycles/${cycleId}/candidates/${scheduleId}/resume`,
    method: 'get',
  });
}

/** 查询某场次已绑定的面试官 */
export function listSessionInterviewers(sessionId: number) {
  return call<number[]>({
    url: `/api/interview/admin/sessions/${sessionId}/interviewers`,
    method: 'get',
  });
}

/** 覆盖式绑定场次面试官，决定评价表里谁能编辑这一场的候选人 */
export function bindSessionInterviewers(sessionId: number, userIds: number[]) {
  return call<number[]>({
    url: `/api/interview/admin/sessions/${sessionId}/interviewers`,
    method: 'put',
    data: { userIds },
  });
}

/**
 * 打分工作台展示候选人获奖经历与 Autograding 评测成绩（全部周期汇总）。
 * 走用户级聚合详情接口；后端已对该接口放开 interview:evaluate 权限（见 ADR-0002），
 * 面试官可直接读，无需 resume:view。
 */
export interface CandidateAward {
  awardId: number;
  awardName: string;
  awardTime?: string | null;
  description?: string | null;
}

export interface CandidateSubmission {
  id: number;
  githubUsername?: string | null;
  evaluatedAt?: string | null;
  totalScore?: number | null;
  maxScore?: number | null;
  [key: string]: unknown;
}

export interface CandidateProfileDetailForWorkspace {
  userId: number;
  name: string | null;
  username: string;
  awards: CandidateAward[];
  submissions: CandidateSubmission[];
}

export function getCandidateProfileDetail(userId: number) {
  return call<CandidateProfileDetailForWorkspace>({
    url: `/api/admin/profiles/${userId}`,
    method: 'get',
  });
}
