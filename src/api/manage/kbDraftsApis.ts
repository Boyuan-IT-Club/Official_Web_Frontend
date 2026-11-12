import { request } from '@/utils';

/**
 * 知识库运营闭环 · 草稿审核。数据权威在 Agent 服务 /admin/kb/ops/drafts*
 * (契约:Agent 仓 docs/proposals/kb-ops-loop.md §5「草稿审核接口」)。
 *
 * 路径沿用本仓其它 Agent 管理接口的约定:走 Backend 代理 /api/admin/agent/**。
 * 权限 kb:manage。「批准」是这组接口里唯一会改知识库的操作。
 */
const BASE = '/api/admin/agent/kb/ops/drafts';

/** alt_question 给现有 FAQ 补一种问法 / new_faq 新条目 / missing 待补充(没有答案) */
export type KbDraftKind = 'alt_question' | 'new_faq' | 'missing';
export type KbDraftStatus = 'pending' | 'approved' | 'rejected' | 'superseded';

/** 答案里的一句话及其出处 */
export interface KbDraftEvidence {
  sentence?: string;
  chunk_id?: string;
  /** 官方条目里的原文片段 */
  quote?: string;
  source_id?: string;
  source_title?: string;
}

export interface KbDraftReview {
  /** index 从 1 起,对应 evidence 的第几句;verdict: supported / unsupported / contradicted */
  findings?: { index?: number; verdict?: string; reason?: string }[];
  conflicts?: { source_id?: string; reason?: string }[];
  /** 打回过一次 */
  revised?: boolean;
  /** 这份「待补充」是由有答案的草稿降级来的 */
  downgraded?: boolean;
  /** 非空表示由别的类型转成(如 new_faq → 补问法) */
  converted_from?: string;
  /** 证据跨了多个周期,cycle_id 需要人确认 */
  mixed_cycles?: boolean;
  note?: string;
}

/** alt_question 草稿的目标 FAQ(供左右对照);目标条目已被删除时整个为 null */
export interface KbDraftTarget {
  source_id?: string;
  title?: string;
  question?: string;
  answer?: string;
  alt_questions?: string[];
  enabled?: boolean;
}

/** 草稿。字段随 Agent 版本可能增减,除 draft_id 外都按可缺失处理 */
export interface KbDraft {
  draft_id: number;
  run_id?: string;
  topic_rank?: number;
  kind?: KbDraftKind | string;
  topic?: string;
  question?: string;
  answer?: string;
  evidence?: KbDraftEvidence[];
  target_source_id?: string | null;
  /** 发布时绑定的招新周期,常青为 null */
  cycle_id?: number | null;
  /** 审核者标出的冲突条目 id */
  conflict_with?: string[];
  support?: { query_count?: number; thread_count?: number; near_miss_count?: number };
  /** 用户原话(至多 3 条,可能为空):不可信输入,只能当纯文本显示 */
  samples?: { query: string; asked_at?: string; injection_suspect?: boolean }[];
  review?: KbDraftReview;
  prompt_versions?: Record<string, string>;
  status?: KbDraftStatus | string;
  edited_by?: number | null;
  decided_by?: number | null;
  decided_at?: string | null;
  published_source_id?: string | null;
  created_at?: string;
  updated_at?: string;
  /** 只有详情里有 */
  target?: KbDraftTarget | null;
}

/** 草稿分页列表,新的在前。status 缺省 pending */
export function listKbDrafts(params: {
  status?: KbDraftStatus | 'all';
  kind?: KbDraftKind;
  page?: number;
  size?: number;
}) {
  return request({ url: BASE, method: 'get', params });
}

/** 草稿详情;alt_question 草稿带 target(目标 FAQ 的现有内容) */
export function getKbDraft(draftId: number) {
  return request({ url: `${BASE}/${draftId}`, method: 'get' });
}

/** 批准前修改。改动只落在草稿上;草稿已处理或正在被处理 → 409 */
export function updateKbDraft(
  draftId: number,
  payload: { question: string; answer: string; cycle_id: number | null },
) {
  return request({ url: `${BASE}/${draftId}`, method: 'put', data: payload });
}

/**
 * 批准并发布到知识库。要重建向量,可能超过默认的 10 秒,单独放宽。
 * 失败时的文案写明了知识库有没有被改动,调用方要原样展示。
 */
export function approveKbDraft(draftId: number) {
  return request({ url: `${BASE}/${draftId}/approve`, method: 'post', timeout: 60000 });
}

/** 驳回 */
export function rejectKbDraft(draftId: number) {
  return request({ url: `${BASE}/${draftId}/reject`, method: 'post' });
}
