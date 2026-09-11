import { request } from '@/utils';

/**
 * 简历评估(B 模块 #135)管理面 API:Backend 代理 /api/admin/agent/evaluation/**,
 * 数据权威在 Agent 服务 /admin/evaluation*。权限:resume:audit(评审)/
 * interview:evaluate(面试官只读题库与维卡)。
 */

/** 评分卡行(评审队列投影;AI 参考分≠终分,resumeScore 由后端多人打分出) */
export interface ScorecardRow {
  resume_id: number;
  card_version: number;
  status: 'draft' | 'adopted' | 'rejected';
  hard_zero: boolean;
  total: number | null;
  prompt_version: string;
  created_at?: string;
  /** #154 评审页重评:队列 SQL 由 evaluation_job 带出(可能缺,历史行) */
  user_id?: number;
}

export interface DimensionScore {
  field_key: string;
  score: number;
  rationale: string;
  evidence: string;
}

/** 评分卡详情 */
export interface ScorecardDetail {
  card_version: number;
  status: string;
  hard_zero: boolean;
  total: number | null;
  card: {
    dimensions: DimensionScore[];
    attitude: { verdict: string; reason: string };
    hard_zero_reasons?: Record<string, string>;
  };
  created_at?: string;
}

/** 手动触发单份或批量 AI 初筛。任务异步执行，结果随后写入评分卡队列。
 *  方案A(评审闸门1):只传 resume_id——user_id/cycle_id 由 Agent 按后端
 *  by-resume 端点权威派生,前端不再携带归属号码,杜绝错位。 */
export function runResumeEvaluation(cycleId: number, items: number[]) {
  return request({
    url: '/api/admin/agent/evaluation/run',
    method: 'post',
    data: { cycle_id: cycleId, items: items.map((resume_id) => ({ resume_id })) },
  });
}


/** job 执行面列表(轮询初筛进度,闸门4)。status: pending/running/succeeded/failed */
export function listEvaluationJobs(cycleId: number, status?: string) {
  return request({
    url: '/api/admin/agent/evaluation/jobs',
    method: 'get',
    params: { cycleId, status },
  });
}

/** 评审队列:queue=zero → 初筛不过子队列(#128) */
export function listEvaluationQueue(cycleId: number, queue: 'zero' | 'all' = 'all') {
  return request({
    url: '/api/admin/agent/evaluation/queue',
    method: 'get',
    params: { cycleId, queue },
  });
}

/** 单候选评分卡 */
export function getEvaluationScorecard(resumeId: number, cycleId: number) {
  return request({
    url: '/api/admin/agent/evaluation/scorecard',
    method: 'get',
    params: { resumeId, cycleId },
  });
}

/** 采纳:评审本人一票 upsert 后端(AI 不占 scorer);score=AI total 或人工改分 */
export function adoptEvaluation(
  resumeId: number,
  cycleId: number,
  score: number,
  version?: number,
) {
  return request({
    url: '/api/admin/agent/evaluation/adopt',
    method: 'post',
    data: { resume_id: resumeId, cycle_id: cycleId, score, version },
  });
}

/** 驳回 */
export function rejectEvaluation(resumeId: number, cycleId: number, version?: number) {
  return request({
    url: '/api/admin/agent/evaluation/reject',
    method: 'post',
    data: { resume_id: resumeId, cycle_id: cycleId, version },
  });
}

export interface QbankQuestion {
  anchor: string;
  question: string;
  sub_prompts?: string[];
  answer_reference?: { strong: string; acceptable: string; weak: string };
  evidence?: { path: string; note: string };
  time_minutes?: number;
}

/** 预置题库(最新信封) */
export function getEvaluationQbank(resumeId: number, cycleId: number) {
  return request({
    url: '/api/admin/agent/evaluation/qbank',
    method: 'get',
    params: { resumeId, cycleId },
  });
}

/** 勾选记录(pick log) */
export function pickQuestions(payload: {
  resume_id: number;
  cycle_id: number;
  schedule_id?: number;
  questions: { anchor: string; question: string; evidence_path?: string }[];
}) {
  return request({
    url: '/api/admin/agent/evaluation/qbank/pick',
    method: 'post',
    data: payload,
  });
}
