import {
  NO_ASSIGNED_DEPT, admittedByDept, admittedTo, countAdmittedAmong, isPendingDecision,
  matchesDecisionFilter, planRejectPending,
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

  it('勾选里已是「通过」的人数：表头全选会把他们一起勾上，确认框要点出来', () => {
    const rows = [
      row({ resultId: 1, decision: 1 }),
      row({ resultId: 2, decision: 0 }),
      row({ resultId: 3, decision: 1 }),
      row({ resultId: 4, decision: 2 }),
    ] as any;
    expect(countAdmittedAmong(rows, [1, 2, 3, 4])).toBe(2);
    expect(countAdmittedAmong(rows, [2, 4])).toBe(0);
  });
});

describe('录取去向', () => {
  const name = (id?: number) => ({ 1: '技术部', 2: '项目部', 3: '媒体部' } as Record<number, string>)[id ?? 0] ?? `#${id}`;

  it('只数已录取的人，按最终录取部门分组，人多的排前', () => {
    const { total, groups } = admittedByDept([
      row({ resultId: 1, decision: 1, assignedDeptId: 2 }),
      row({ resultId: 2, decision: 1, assignedDeptId: 1 }),
      row({ resultId: 3, decision: 1, assignedDeptId: 2 }),
      row({ resultId: 4, decision: 0, assignedDeptId: null }),
      row({ resultId: 5, decision: 2, assignedDeptId: null }),
    ] as any, name);
    expect(total).toBe(3);
    expect(groups).toEqual([
      { deptId: 2, deptName: '项目部', count: 2 },
      { deptId: 1, deptName: '技术部', count: 1 },
    ]);
  });

  it('录取了却没填部门的单独成组，不悄悄漏算', () => {
    const { total, groups } = admittedByDept([
      row({ resultId: 1, decision: 1, assignedDeptId: null }),
    ] as any, name);
    expect(total).toBe(1);
    expect(groups).toEqual([{ deptId: NO_ASSIGNED_DEPT, deptName: '未填部门', count: 1 }]);
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

  it('部门停用后取不到名字时，用结果行自带的部门名兜底', () => {
    const { groups } = admittedByDept([
      row({ resultId: 1, decision: 1, assignedDeptId: 7, departmentName: '宣传部' }),
    ] as any, (id, sample) => (sample as any)?.departmentName ?? `#${id}`);
    expect(groups[0].deptName).toBe('宣传部');
  });
});
