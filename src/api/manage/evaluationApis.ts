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
