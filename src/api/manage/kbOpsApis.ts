import { request } from '@/utils';

/**
 * 知识库运营闭环 · 主题清单(只读)。数据权威在 Agent 服务 /admin/kb/ops/*
 * (契约:Agent 仓 docs/proposals/kb-ops-loop.md §5「主题清单接口」)。
 *
 * 路径沿用本仓其它 Agent 管理接口的约定:走 Backend 代理 /api/admin/agent/**。
 * 权限 kb:manage(与知识条目维护相同)。
 */
const BASE = '/api/admin/agent/kb/ops';

/** 一次离线分析。字段随 Agent 版本可能增减,除 run_id / status 外都按可缺失处理 */
export interface KbOpsRun {
  run_id: string;
  /** running / succeeded / failed */
  status: string;
  window_start?: string;
  window_end?: string;
  triggered_by?: number;
  params?: Record<string, unknown>;
  /** 全部由代码数出来的统计,形状见契约;缺哪项就不显示哪项 */
  stats?: {
    window?: { total?: number; ok?: number; not_found?: number; unavailable?: number; near_miss?: number };
    queries?: number;
    queries_truncated?: boolean;
    unique_queries?: number;
    clusters?: number;
    below_support?: number;
    topics?: number;
    triage?: Record<string, number>;
    budget_exhausted?: boolean;
    [key: string]: unknown;
  };
  prompt_versions?: Record<string, string>;
  /** status 为 failed 时是可以直接展示的原因 */
  error?: string | null;
  started_at?: string;
  finished_at?: string | null;
}

export interface KbOpsSample {
  /** 用户的原话:不可信输入,只能当纯文本显示 */
  query: string;
  asked_at?: string;
  /** 这条样本像是指令而不是提问 */
  injection_suspect?: boolean;
}

/** 四种归类之一;没甄别成的为 null */
export type KbOpsScope = 'official_knowledge' | 'personal_data' | 'out_of_scope' | 'chitchat';

export interface KbOpsTopic {
  topic_id: number;
  run_id?: string;
  /** 从 1 起,越小影响面越大 */
  rank: number;
  /** triage_status 不是 done 时,以下四项为 null */
  topic?: string | null;
  canonical_question?: string | null;
  scope?: KbOpsScope | string | null;
  reason?: string | null;
  /** done / failed / unsafe_samples / out_of_budget / not_selected */
  triage_status?: string;
  query_count?: number;
  thread_count?: number;
  near_miss_count?: number;
  best_vec_score?: number | null;
  /** wording 建议补问法 / missing 建议补条目;仅作提示 */
  gap_hint?: string | null;
  first_seen?: string;
  last_seen?: string;
  /** 至多 3 条,可能为空(样本所在的会话都已删除) */
  samples?: KbOpsSample[];
  /** 起草结局(新版 Agent 才有);没走到起草的为 null */
  draft_status?: string | null;
  draft_id?: number | null;
}

export type KbOpsScopeFilter = 'actionable' | 'all' | 'untriaged' | KbOpsScope;

/** 启动一次离线分析,后台执行;202 后轮询运行列表看结局。已有分析在跑 → 409 */
export function startKbOpsRun(days?: number) {
  return request({
    url: `${BASE}/runs`,
    method: 'post',
    data: days == null ? {} : { days },
  });
}

/** 最近的运行,新的在前 */
export function listKbOpsRuns(limit = 20) {
  return request({ url: `${BASE}/runs`, method: 'get', params: { limit } });
}

/**
 * 一次运行的主题清单,按 rank 升序。run_id 不给 = 最近一次成功的运行;
 * 一次都没成功过时返回 { run: null, items: [], total: 0 }(200)。
 */
export function listKbOpsTopics(params: { run_id?: string; scope?: KbOpsScopeFilter }) {
  return request({ url: `${BASE}/topics`, method: 'get', params });
}
