import {
  NO_ASSIGNED_DEPT, admittedGroups, admittedTo, describeBatchResult, isDecided, isPendingDecision,
  matchesDecisionFilter, planBatchReject, planRejectPending,
} from './resultBatch';

const row = (over: any) => ({ resultId: 1, userId: 1, decision: 0, ...over });

describe('录取结果页：待定与一键标未通过', () => {
  it('待定 = decision 为 0 或为空（生成名单建出来的行是 0，不是 null）', () => {
    expect(isPendingDecision(0)).toBe(true);
    expect(isPendingDecision(null)).toBe(true);
    expect(isPendingDecision(undefined)).toBe(true);
    expect(isPendingDecision(1)).toBe(false);
    expect(isPendingDecision(2)).toBe(false);
    expect(isPendingDecision(3)).toBe(false);
  });

  it('按结果筛选：选「待定」时 0 和空都算，其余按值精确匹配，不选则全放行', () => {
    expect(matchesDecisionFilter(0, 0)).toBe(true);
    expect(matchesDecisionFilter(null, 0)).toBe(true);
    expect(matchesDecisionFilter(1, 0)).toBe(false);
    expect(matchesDecisionFilter(1, 1)).toBe(true);
    expect(matchesDecisionFilter(2, 1)).toBe(false);
    expect(matchesDecisionFilter(3, undefined)).toBe(true);
  });

  it('预录取名单里的人不动：转正前结果也是待定，但部门已打算录取', () => {
    const plan = planRejectPending([
      row({ resultId: 1, decision: 0 }),
      row({ resultId: 2, decision: 0 }),
      row({ resultId: 3, decision: 0 }),
    ] as any, {}, (r) => `#${r.resultId}`, new Set([2]));
    expect(plan.ids).toEqual([1, 3]);
    expect(plan.drafted).toBe(1);
  });

  it('一键标未通过只动待定的人，已录取/已婉拒/待调剂一个都不碰', () => {
    const plan = planRejectPending([
      row({ resultId: 1, decision: 0 }),
      row({ resultId: 2, decision: 1 }),
      row({ resultId: 3, decision: 2 }),
      row({ resultId: 4, decision: 3 }),
      row({ resultId: 5, decision: null }),
    ] as any, {}, (r) => `#${r.resultId}`);
    expect(plan.ids).toEqual([1, 5]);
  });

  it('确认框单独点出「还没面试评价」和「线上」的人数——最容易误伤的两类', () => {
    const plan = planRejectPending([
      // 有评价：结果行自带面试分
      row({ resultId: 1, scheduleId: 11, evalTotalScore: 21 }),
      // 有评价：结果行没带，但评价汇总里有
      row({ resultId: 2, scheduleId: 12 }),
      // 没评价、线下
      row({ resultId: 3, scheduleId: 13 }),
      // 没评价、线上、还没排上
      row({ resultId: 4, scheduleId: null, onlineInterview: true }),
    ] as any, { 12: { scheduleId: 12, recommendation: 2, scores: {} } as any }, (r) => `#${r.resultId}`);
    expect(plan.withoutEvaluation).toBe(2);
    expect(plan.online).toBe(1);
  });

  it('点名只列前几位，剩下的由「等 N 人」概括', () => {
    const rows = Array.from({ length: 12 }, (_, i) => row({ resultId: i + 1 }));
    const plan = planRejectPending(rows as any, {}, (r) => `#${r.resultId}`, new Set(), 3);
    expect(plan.previewNames).toEqual(['#1', '#2', '#3']);
    expect(plan.ids).toHaveLength(12);
  });

  it('已定 = 通过或未通过；待调剂是历史取值，按未决定处理', () => {
    expect(isDecided(1)).toBe(true);
    expect(isDecided(2)).toBe(true);
    expect(isDecided(0)).toBe(false);
    expect(isDecided(3)).toBe(false);
    expect(isDecided(null)).toBe(false);
  });

  it('批量标未通过：已定的和预录取名单里的都会被跳过，确认框先说清楚', () => {
    const rows = [
      row({ resultId: 1, decision: 1 }),
      row({ resultId: 2, decision: 0 }),
      row({ resultId: 3, decision: 2 }),
      row({ resultId: 4, decision: 0 }),
      row({ resultId: 5, decision: 3 }),
    ] as any;
    expect(planBatchReject(rows, [1, 2, 3, 4, 5], new Set([4]))).toEqual({ ids: [2, 5], decided: 2, drafted: 1 });
    expect(planBatchReject(rows, [2], new Set())).toEqual({ ids: [2], decided: 0, drafted: 0 });
  });

  it('批量结果的提示：按原因分别说跳过了几个人', () => {
    expect(describeBatchResult('标记未通过', { updated: 3, skipped: [] }))
      .toEqual({ ok: true, text: '已标记未通过 3 人' });
    expect(describeBatchResult('标记未通过', {
      updated: 1, skipped: [7, 8, 9, 10], skippedDecided: 2, skippedInPreAdmission: 1,
    })).toEqual({
      ok: false,
      text: '已标记未通过 1 人；跳过 2 人已有正式结果、1 人在预录取名单里、1 人不属于本周期，未改动',
    });
  });
});

describe('录取去向', () => {
  const dept = (deptId: number, deptName: string, admitted: number, over: any = {}) => ({
    deptId, deptName, firstChoice: 0, secondChoice: 0, preAdmitted: 0, admitted,
    admittedFirstChoice: 0, admittedSecondChoice: 0, admittedOther: 0, admittedNotified: 0, ...over,
  });
  const totals = (admitted: number) => ({
    candidates: 0, pending: 0, adjusting: 0, admitted, rejected: 0, inPreAdmission: 0, notified: 0,
  });

  it('读服务端统计：只列录了人的部门，人多的排前，带上一志愿/二志愿/调剂', () => {
    const { total, groups } = admittedGroups({
      totals: totals(3),
      departments: [
        dept(1, '技术部', 1, { admittedFirstChoice: 1 }),
        dept(2, '项目部', 2, { admittedSecondChoice: 1, admittedOther: 1, admittedNotified: 2 }),
        dept(3, '媒体部', 0, { firstChoice: 5 }),
      ],
    });
    expect(total).toBe(3);
    expect(groups.map((g) => [g.deptName, g.admitted])).toEqual([['项目部', 2], ['技术部', 1]]);
    expect(groups[0]).toMatchObject({ secondChoice: 1, other: 1, notified: 2 });
  });

  it('录取了却没填部门的单独成组，不悄悄漏算', () => {
    const { total, groups } = admittedGroups({ totals: totals(2), departments: [dept(1, '技术部', 1)] });
    expect(total).toBe(2);
    expect(groups[1]).toMatchObject({ deptId: NO_ASSIGNED_DEPT, deptName: '未填部门', admitted: 1 });
  });

  it('统计还没拉到时是空的', () => {
    expect(admittedGroups(null)).toEqual({ total: 0, groups: [] });
  });

  it('按录取部门精确筛：只认最终录取部门，志愿里填了该部门不算', () => {
    const toTech = row({ decision: 1, assignedDeptId: 1, firstDeptName: '项目部' });
    const wishTech = row({ decision: 0, assignedDeptId: null, firstDeptName: '技术部' });
    const toNone = row({ decision: 1, assignedDeptId: null });
    expect(admittedTo(toTech as any, 1)).toBe(true);
    expect(admittedTo(wishTech as any, 1)).toBe(false);
    expect(admittedTo(toNone as any, NO_ASSIGNED_DEPT)).toBe(true);
    expect(admittedTo(toTech as any, NO_ASSIGNED_DEPT)).toBe(false);
    expect(admittedTo(wishTech as any, undefined)).toBe(true);
  });
});
