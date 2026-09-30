// AI 初筛相关的纯逻辑，抽出来便于直接测。

import type { ScorecardRow } from '@/api/manage/evaluationApis';

export type AiFilter = 'all' | 'pending' | 'match_top' | 'effort_low' | 'transfer' | 'review' | 'rerun';

/** 列表顶部「AI 状态」下拉的判定；card 为该简历在当前周期的评分卡（没有即未初筛） */
export function matchesAiFilter(card: ScorecardRow | undefined, filter: AiFilter): boolean {
  if (filter === 'pending') return !card;
  if (filter === 'match_top') return card?.match_level === '优秀';
  if (filter === 'effort_low') return card?.effort_level === '一般';
  if (filter === 'transfer') return Boolean(card?.transfer_hint);
  if (filter === 'review') return Boolean(card?.hard_zero);
  if (filter === 'rerun') return Boolean(card?.needs_rerun);
  return true;
}

/** Agent 单次 /admin/evaluation/run 最多 200 条（evaluation_admin.py: max_length=200） */
export const AI_RUN_BATCH_MAX = 200;

/** 按上限切批；顺序保持，Agent 按提交顺序返回 job_ids，映射靠它 */
export function chunkIds<T>(ids: T[], size: number = AI_RUN_BATCH_MAX): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size));
  return out;
}
