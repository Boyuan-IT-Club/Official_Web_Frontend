// 「录取结果」页的纯逻辑：哪些人算待定、一键标未通过要动谁、确认框里该提醒什么。
// 单独抽出来是为了能直接测——这些判断一旦错，后果是把人的录取改掉或漏发感谢信。
import type { InterviewResultItem, ResultSummary } from '@/api/manage/interviewAdmin';
import type { CandidateSummary } from '@/api/manage/interviewEvaluation';

/**
 * 结果是否还没定。库里 decision 是 NOT NULL DEFAULT 0，生成名单建出来的行都是 0（待定），
 * 不是 null。原先只认 null，「N 人未录入决定」的提示永远不出现，
 * 批量录取的确认框还会把待定的人当成「已录入过结果、本次会被覆盖」。
 */
export function isPendingDecision(decision: number | null | undefined): boolean {
  return decision == null || decision === 0;
}

/**
 * 已有正式结果（通过 / 未通过）。已定的结果不能再被批量操作覆盖，只能逐个「更正」并填原因。
 * 待调剂（3）是历史取值，按未决定处理。
 */
export function isDecided(decision: number | null | undefined): boolean {
  return decision === 1 || decision === 2;
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

export interface BatchRejectPlan {
  /** 真正会被标未通过的人 */
  ids: number[];
  /** 已有正式结果、会被跳过的人数 */
  decided: number;
  /** 在预录取名单里、会被跳过的人数 */
  drafted: number;
}

/**
 * 勾选的人里哪些会被「批量标记未通过」真正改动。
 * 已定的和预录取名单里的服务端一律跳过，确认框里先说清楚，免得以为全改了。
 */
export function planBatchReject(
  rows: InterviewResultItem[],
  selectedIds: number[],
  draftedIds: Set<number> = new Set(),
): BatchRejectPlan {
  const set = new Set(selectedIds);
  const picked = rows.filter((r) => set.has(r.resultId));
  const decided = picked.filter((r) => isDecided(r.decision));
  const drafted = picked.filter((r) => !isDecided(r.decision) && draftedIds.has(r.resultId));
  return {
    ids: picked.filter((r) => !isDecided(r.decision) && !draftedIds.has(r.resultId)).map((r) => r.resultId),
    decided: decided.length,
    drafted: drafted.length,
  };
}

/** 批量操作返回后的提示语：改了几个、各因为什么跳过了几个 */
export function describeBatchResult(
  verb: string,
  res: { updated?: number; skipped?: number[]; skippedDecided?: number; skippedInPreAdmission?: number } | undefined,
): { ok: boolean; text: string } {
  const updated = res?.updated ?? 0;
  const decided = res?.skippedDecided ?? 0;
  const drafted = res?.skippedInPreAdmission ?? 0;
  const other = Math.max(0, (res?.skipped?.length ?? 0) - decided - drafted);
  const reasons = [
    decided > 0 ? `${decided} 人已有正式结果` : '',
    drafted > 0 ? `${drafted} 人在预录取名单里` : '',
    other > 0 ? `${other} 人不属于本周期` : '',
  ].filter(Boolean);
  return reasons.length === 0
    ? { ok: true, text: `已${verb} ${updated} 人` }
    : { ok: false, text: `已${verb} ${updated} 人；跳过 ${reasons.join('、')}，未改动` };
}

/** 录取统计里「未填部门」的占位值（真实部门 ID 都是正数） */
export const NO_ASSIGNED_DEPT = -1;

export interface AdmittedDeptGroup {
  deptId: number;
  deptName: string;
  admitted: number;
  firstChoice: number;
  secondChoice: number;
  /** 调剂：两个志愿都不是本部门 */
  other: number;
  notified: number;
}

/**
 * 录取去向：各部门最终录了几个人（服务端统计，不随列表筛选变化），人多的部门排前。
 * 录取了却没填部门的人单独成一组，这种数据要能被看见，而不是悄悄不计。
 */
export function admittedGroups(summary: ResultSummary | null | undefined): {
  total: number;
  groups: AdmittedDeptGroup[];
} {
  if (!summary) return { total: 0, groups: [] };
  const groups: AdmittedDeptGroup[] = summary.departments
    .filter((d) => d.admitted > 0)
    .map((d) => ({
      deptId: d.deptId,
      deptName: d.deptName,
      admitted: d.admitted,
      firstChoice: d.admittedFirstChoice,
      secondChoice: d.admittedSecondChoice,
      other: d.admittedOther,
      notified: d.admittedNotified,
    }))
    .sort((a, b) => b.admitted - a.admitted || a.deptName.localeCompare(b.deptName, 'zh-CN'));
  const total = summary.totals.admitted;
  const counted = groups.reduce((n, g) => n + g.admitted, 0);
  if (total > counted) {
    groups.push({
      deptId: NO_ASSIGNED_DEPT, deptName: '未填部门', admitted: total - counted,
      firstChoice: 0, secondChoice: 0, other: 0, notified: 0,
    });
  }
  return { total, groups };
}

/** 是否录取到了指定部门（精确按最终录取部门，不看志愿） */
export function admittedTo(r: InterviewResultItem, deptId: number | undefined): boolean {
  if (deptId == null) return true;
  if (r.decision !== 1) return false;
  return deptId === NO_ASSIGNED_DEPT ? r.assignedDeptId == null : r.assignedDeptId === deptId;
}
