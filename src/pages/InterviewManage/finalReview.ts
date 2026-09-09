// 终审舞台的纯逻辑：数据拼装、排序、矩阵着色、键盘映射。
// 抽出来是为了可测——舞台组件只做渲染。
import type { CandidateSummary, EvaluationDimension } from '@/api/manage/interviewEvaluation';
import type { InterviewResultItem, PreAdmissionDraftItem } from '@/api/manage/interviewAdmin';

export interface FinalCandidate {
  resultId: number;
  scheduleId?: number | null;
  userId: number;
  name: string;
  username?: string;
  firstDeptName?: string | null;
  secondDeptName?: string | null;
  resumeScore?: number | null;
  decision?: number;
  /** 评价（可能没有：未面试或未填） */
  evalTotal?: number | null;
  recommendation?: number | null;
  scores?: Record<number, number>;
  dimensionNotes?: Record<number, string>;
  dimensionWriters?: Record<number, { userId: number; name?: string }>;
  comment?: string;
  contributors?: Array<{ userId: number; name?: string }>;
  evalStatus?: number;
  submittedByName?: string;
  submittedAt?: string;
  /** 预录取草稿 */
  preDeptId?: number | null;
  preDeptName?: string | null;
}

/** 三份数据按 scheduleId / resultId 对齐成终审行 */
export function assembleCandidates(
  results: InterviewResultItem[],
  evals: CandidateSummary[],
  drafts: PreAdmissionDraftItem[],
  usernameOf: Record<number, string | undefined> = {},
): FinalCandidate[] {
  const evalBySchedule = new Map<number, CandidateSummary>();
  evals.forEach((c) => evalBySchedule.set(c.scheduleId, c));
  const draftByResult = new Map<number, PreAdmissionDraftItem>();
  drafts.forEach((d) => draftByResult.set(d.resultId, d));

  return results.map((r) => {
    const ev = r.scheduleId != null ? evalBySchedule.get(r.scheduleId) : undefined;
    const draft = draftByResult.get(r.resultId);
    return {
      resultId: r.resultId,
      scheduleId: r.scheduleId,
      userId: r.userId,
      name: r.userName || `用户#${r.userId}`,
      username: usernameOf[r.userId],
      firstDeptName: r.firstDeptName,
      secondDeptName: r.secondDeptName,
      resumeScore: r.resumeScore ?? null,
      decision: r.decision,
      evalTotal: r.evalTotalScore != null ? Number(r.evalTotalScore) : (ev?.totalScore ?? null),
      recommendation: r.evalRecommendation ?? ev?.recommendation ?? null,
      scores: ev?.scores,
      dimensionNotes: ev?.dimensionNotes,
      dimensionWriters: ev?.dimensionWriters,
      comment: ev?.comment,
      contributors: ev?.contributors,
      evalStatus: ev?.status,
      submittedByName: ev?.submittedByName,
      submittedAt: ev?.submittedAt,
      preDeptId: draft?.assignedDeptId ?? null,
      preDeptName: draft?.departmentName ?? null,
    };
  });
}

/** 按面试总分降序排（无分的排最后，其间按简历分降序）——舞台与矩阵的默认顺序 */
export function rankCandidates(list: FinalCandidate[]): FinalCandidate[] {
  return [...list].sort((a, b) => {
    const at = a.evalTotal ?? -1;
    const bt = b.evalTotal ?? -1;
    if (at !== bt) return bt - at;
    return (b.resumeScore ?? -1) - (a.resumeScore ?? -1);
  });
}

/** 矩阵着色：同一列内相对分档（0 无色 → 3 最深）。列里全是同一个值时不着色。 */
export function heatTier(value: number | null | undefined, columnValues: Array<number | null | undefined>): 0 | 1 | 2 | 3 {
  if (value == null) return 0;
  const nums = columnValues.filter((v): v is number => v != null);
  if (nums.length === 0) return 0;
  const max = Math.max(...nums);
  const min = Math.min(...nums);
  if (max === min) return 0;
  const ratio = (value - min) / (max - min);
  if (ratio >= 0.85) return 3;
  if (ratio >= 0.5) return 2;
  return 1;
}

/** 键盘映射：←→ 翻人，1-9 预录取到第 N 个部门，0 移出。输入框聚焦时一律不响应。 */
export function stageKeyAction(
  key: string,
  deptCount: number,
): { type: 'prev' } | { type: 'next' } | { type: 'assign'; deptIndex: number } | { type: 'remove' } | null {
  if (key === 'ArrowLeft') return { type: 'prev' };
  if (key === 'ArrowRight') return { type: 'next' };
  if (key === '0') return { type: 'remove' };
  const n = Number(key);
  if (Number.isInteger(n) && n >= 1 && n <= Math.min(9, deptCount)) return { type: 'assign', deptIndex: n - 1 };
  return null;
}

export function clampIndex(i: number, len: number): number {
  if (len === 0) return 0;
  return ((i % len) + len) % len;   // 回绕
}

export const RECOMMENDATION_LABEL: Record<number, { text: string; color: string }> = {
  1: { text: '倾向通过', color: 'green' },
  2: { text: '待定', color: 'orange' },
  3: { text: '不倾向', color: 'red' },
};

/** 按维度 sortOrder 升序（后端已排，这里兜底） */
export function orderedDimensions(dims: EvaluationDimension[]): EvaluationDimension[] {
  return [...dims].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}
