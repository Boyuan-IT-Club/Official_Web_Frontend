import { request } from '@/utils';

/**
 * 简历评估管理面 API:Backend 代理 /api/admin/agent/evaluation/**,
 * 数据权威在 Agent 服务 /admin/evaluation*。权限:resume:audit(评审)/
 * interview:evaluate(面试官只读题库与维卡)。
 */

/** AI 初筛等级:同一周期、同一第一志愿部门的候选人之间相对划分(头尾各约两成) */
export type AiGrade = '优秀' | '良好' | '一般';

/** 调剂建议:简历明显更贴合别的部门 */
export interface TransferHint {
  dept: string;
  /** 建议的部门就是候选人的第二志愿 */
  is_second_choice: boolean;
}

/** 等级依据:pool=同部门候选池内相对划分;anchor=候选不足,按绝对标准;hard_zero=命中重点复核规则 */
export type GradeBasis = 'pool' | 'anchor' | 'hard_zero';

/** 两维等级字段(队列行与维卡共用) */
export interface AiGrades {
  /** 与志愿部门的匹配度;未填志愿时为 null */
  match_level?: AiGrade | null;
  /** 写简历的认真程度 */
  effort_level?: AiGrade | null;
  grade_basis?: GradeBasis | null;
  /** 候选池名(第一志愿部门,或「未填志愿」) */
  pool?: string | null;
  pool_size?: number | null;
  /** 旧版初筛结果(单一总分),需要重新初筛才有两维等级 */
  needs_rerun?: boolean;
}

/** 评分卡行(评审队列投影;AI 只给等级,终分由后端多人打分出) */
export interface ScorecardRow extends AiGrades {
  resume_id: number;
  card_version: number;
  status: 'draft' | 'adopted' | 'rejected';
  /** 需重点复核(空白/占位/敷衍,或两张清单一项未达成) */
  hard_zero: boolean;
  /** 仅旧版卡且持 evaluation:score:view 时有值 */
  total: number | null;
  prompt_version: string;
  created_at?: string;
  /** 评审页重评:队列 SQL 由 evaluation_job 带出(可能缺,历史行) */
  user_id?: number;
  intended_first?: string | null;
  transfer_hint?: TransferHint | null;
}

/** 清单里一个判定项的结果。met=false 时 reason 写「缺什么」。 */
export interface ItemVerdict {
  item: string;
  met: boolean;
  /** 判定依据的原文逐字片段(判 true 时必填) */
  quote: string;
  /** 自然语言依据;未达成时写缺什么 */
  reason: string;
}

/** 一个部门的匹配清单 */
export interface DeptMatch {
  dept: string;
  /** 0-10 分,仅持 evaluation:score:view 可见 */
  score?: number;
  items: ItemVerdict[];
}

/** 旧版卡的特质判定(单一总分时代) */
export interface TraitVerdict {
  trait: string;
  met: boolean;
  quote: string;
  reason: string;
}

/** 评分卡详情 */
export interface ScorecardDetail extends AiGrades {
  card_version: number;
  status: string;
  hard_zero: boolean;
  total: number | null;
  card: {
    schema?: string;
    intended?: { first: string | null; second: string | null };
    /** 四个部门都判:志愿部门决定匹配度,其余用于调剂建议 */
    match?: DeptMatch[];
    effort?: { score?: number; items: ItemVerdict[] };
    /** 整体理由(2-4 句):对得上的地方、缺什么、面试建议 */
    summary: string;
    attitude: { verdict: string; reason: string };
    transfer_hint?: TransferHint | null;
    /** 给面试官的提示(非计算机类专业、技术部无技术基础等) */
    interview_hints?: string[];
    hard_zero_reasons?: Record<string, string>;
    /** 旧版卡才有 */
    traits?: TraitVerdict[];
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

/** 评审队列:queue=zero → 需重点复核子队列 */
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

/** 采纳:评审本人一票 upsert 后端(AI 不占 scorer);score 由评审本人给出 */
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

/**
 * Agent 的 qbank.pickable 扁平题引用(#153,闸门5)——勾选题的唯一权威形状。
 * record_pick 原样落 qbank_pick_log;UI 不再自行解析 envelope 推字段。
 */
export interface PickableQuestion {
  group_index: number;
  group_kind: string;
  role: 'entry' | 'chain' | 'reserve' | 'question';
  category?: string;
  chain_index?: number;
  layer_index?: number;
  question_index?: number;
  question: string;
  evidence_path?: string;
  theme?: string;
  expected_signal?: string;
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

/** 勾选记录(pick log)。questions 传 pickable 题引用(原样落库)。 */
export function pickQuestions(payload: {
  resume_id: number;
  cycle_id: number;
  schedule_id?: number;
  questions: Partial<PickableQuestion>[];
}) {
  return request({
    url: '/api/admin/agent/evaluation/qbank/pick',
    method: 'post',
    data: payload,
  });
}
