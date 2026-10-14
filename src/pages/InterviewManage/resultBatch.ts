// 「录取结果」页的纯逻辑：哪些人算待定、一键标未通过要动谁、确认框里该提醒什么。
// 单独抽出来是为了能直接测——这些判断一旦错，后果是把人的录取改掉或漏发感谢信。
import type { InterviewResultItem } from '@/api/manage/interviewAdmin';
import type { CandidateSummary } from '@/api/manage/interviewEvaluation';

/**
 * 结果是否还没定。库里 decision 是 NOT NULL DEFAULT 0，生成名单建出来的行都是 0（待定），
 * 不是 null。原先只认 null，「N 人未录入决定」的提示永远不出现，
 * 批量录取的确认框还会把待定的人当成「已录入过结果、本次会被覆盖」。
 */
export function isPendingDecision(decision: number | null | undefined): boolean {
  return decision == null || decision === 0;
}

/** 「按结果筛选」的选项，取值与 decision 一致 */
export const DECISION_FILTER_OPTIONS = [
  { value: 0, label: '待定' },
  { value: 1, label: '通过' },
  { value: 2, label: '未通过' },
  { value: 3, label: '待调剂' },
];

export function matchesDecisionFilter(
  decision: number | null | undefined,
  filter: number | null | undefined,
): boolean {
  if (filter == null) return true;
  return filter === 0 ? isPendingDecision(decision) : decision === filter;
}

function hasEvaluation(r: InterviewResultItem, evalMap: Record<number, CandidateSummary>): boolean {
  if (r.evalTotalScore != null || r.evalRecommendation != null) return true;
  const ev = r.scheduleId != null ? evalMap[r.scheduleId] : undefined;
  return Boolean(ev && (ev.totalScore != null || ev.recommendation != null
    || Object.keys(ev.scores ?? {}).length > 0));
}

export interface RejectPendingPlan {
  /** 要标为未通过的 resultId（只含待定、且不在预录取名单里的） */
  ids: number[];
  /** 待定但在预录取名单里、因此不动的人数 */
  drafted: number;
  /** 其中还没有任何面试评价的人数——多半是还没面试 */
  withoutEvaluation: number;
  /** 其中线上面试的人数 */
  online: number;
  /** 确认框里点名的前几位 */
  previewNames: string[];
}

/**
 * 「待定全部标为未通过」要动的人：结果仍为待定、且不在预录取名单里的。
 * 预录取名单里的人转正前结果也是待定，但部门已打算录取，一并标掉会让转正整批失败。
 * 确认框里会把「还没面试评价」「线上」的人数单独列出来——
 * 一键操作最容易误伤的就是还没面完、或者线上还没约上的人。
 */
export function planRejectPending(
  rows: InterviewResultItem[],
  evalMap: Record<number, CandidateSummary>,
  nameOf: (r: InterviewResultItem) => string,
  draftedIds: Set<number> = new Set(),
  previewLimit = 8,
): RejectPendingPlan {
  const allPending = rows.filter((r) => isPendingDecision(r.decision));
  const pending = allPending.filter((r) => !draftedIds.has(r.resultId));
  return {
    ids: pending.map((r) => r.resultId),
    drafted: allPending.length - pending.length,
    withoutEvaluation: pending.filter((r) => !hasEvaluation(r, evalMap)).length,
    online: pending.filter((r) => r.onlineInterview === true).length,
    previewNames: pending.slice(0, previewLimit).map(nameOf),
  };
}

/** 勾选的人里当前已是「通过」的人数：批量标未通过会把他们的录取覆盖掉 */
export function countAdmittedAmong(rows: InterviewResultItem[], selectedIds: number[]): number {
  const set = new Set(selectedIds);
  return rows.filter((r) => set.has(r.resultId) && r.decision === 1).length;
}

/** 录取部门筛选里「录取了但没填部门」的占位值（真实部门 ID 都是正数） */
export const NO_ASSIGNED_DEPT = -1;

export interface AdmittedDeptCount {
  deptId: number;
  deptName: string;
  count: number;
}

/**
 * 已录取的人按最终录取部门分组计数，人多的部门排前。
 * 录取了却没填部门的单独成一组（NO_ASSIGNED_DEPT），这种数据要能被看见，而不是悄悄不计。
 */
export function admittedByDept(
  rows: InterviewResultItem[],
  deptNameOf: (deptId: number, sample?: InterviewResultItem) => string,
): { total: number; groups: AdmittedDeptCount[] } {
  const counts = new Map<number, number>();
  const samples = new Map<number, InterviewResultItem>();
  let total = 0;
  rows.forEach((r) => {
    if (r.decision !== 1) return;
    total += 1;
    const key = r.assignedDeptId ?? NO_ASSIGNED_DEPT;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (!samples.has(key)) samples.set(key, r);
  });
  const groups = Array.from(counts.entries())
    .map(([deptId, count]) => ({
      deptId,
      count,
      // 传一行样本给取名函数：部门停用后只能靠结果行自带的部门名兜底
      deptName: deptId === NO_ASSIGNED_DEPT ? '未填部门' : deptNameOf(deptId, samples.get(deptId)),
    }))
    .sort((a, b) => b.count - a.count || a.deptName.localeCompare(b.deptName, 'zh-CN'));
  return { total, groups };
}

/** 是否录取到了指定部门（精确按最终录取部门，不看志愿） */
export function admittedTo(r: InterviewResultItem, deptId: number | undefined): boolean {
  if (deptId == null) return true;
  if (r.decision !== 1) return false;
  return deptId === NO_ASSIGNED_DEPT ? r.assignedDeptId == null : r.assignedDeptId === deptId;
}
