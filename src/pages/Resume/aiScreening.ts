// AI 初筛相关的纯逻辑，抽出来便于直接测。

import type { ScorecardRow } from '@/api/manage/evaluationApis';

export type AiFilter =
  | 'all' | 'pending' | 'match_top' | 'effort_low' | 'transfer' | 'review' | 'rerun'
  /** AI 自己把握不大的卡(置信度 low)——最需要人细看的那一批 */
  | 'low_confidence'
  /** 简历里检出疑似写给 AI 的指令 */
  | 'injection';

/** 列表顶部「AI 状态」下拉的判定；card 为该简历在当前周期的评分卡（没有即未初筛） */
export function matchesAiFilter(card: ScorecardRow | undefined, filter: AiFilter): boolean {
  if (filter === 'pending') return !card;
  if (filter === 'match_top') return card?.match_level === '优秀';
  if (filter === 'effort_low') return card?.effort_level === '一般';
  if (filter === 'transfer') return Boolean(card?.transfer_hint);
  if (filter === 'review') return Boolean(card?.hard_zero);
  if (filter === 'rerun') return Boolean(card?.needs_rerun);
  if (filter === 'low_confidence') return card?.confidence === 'low';
  if (filter === 'injection') return card?.injection_detected === true;
  return true;
}

/**
 * 这些评分卡里有没有任何一张带置信度。
 *
 * 置信度只有「带批判者」的评分模式才出;单评委模式的卡是 null,旧版 Agent 根本不返回这个字段。
 * 一张都没有时,「置信度低 / 提示注入」两档筛不出东西——那不代表「没有需要细看的」,
 * 而是这个周期压根没有这项信息,页面要把这一点说出来。
 */
export function hasConfidenceInfo(cards: Iterable<ScorecardRow | undefined>): boolean {
  for (const card of Array.from(cards)) {
    if (card && (card.confidence === 'low' || card.confidence === 'medium' || card.confidence === 'high')) {
      return true;
    }
  }
  return false;
}

/** Agent 单次 /admin/evaluation/run 最多 200 条（evaluation_admin.py: max_length=200） */
export const AI_RUN_BATCH_MAX = 200;

/** 按上限切批；顺序保持，Agent 按提交顺序返回 job_ids，映射靠它 */
export function chunkIds<T>(ids: T[], size: number = AI_RUN_BATCH_MAX): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size));
  return out;
}
