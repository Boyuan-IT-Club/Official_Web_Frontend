import {
  assembleCandidates, clampIndex, countPendingOutside, heatTier, isConflict, rankCandidates, stageKeyAction,
} from './finalReview';

describe('终审舞台纯逻辑', () => {
  it('三份数据按 scheduleId/resultId 对齐；无面试的人也在，评价字段为空', () => {
    const rows = assembleCandidates(
      [
        { resultId: 7, scheduleId: null, userId: 1, userName: '丁华烨', resumeScore: 100 } as any,
        { resultId: 8, scheduleId: 5, userId: 2, userName: '饶俊晨', evalTotalScore: 39 } as any,
      ],
      [{ scheduleId: 5, resumeId: 9, userId: 2, candidateName: '饶俊晨', scores: { 1: 38 }, totalScore: 39, recommendation: 1, contributors: [] } as any],
      [{ draftId: 1, cycleId: 6, resultId: 8, assignedDeptId: 1, departmentName: '技术部' } as any],
    );
    expect(rows).toHaveLength(2);
    expect(rows[0].evalTotal).toBeNull();
    expect(rows[0].preDeptName).toBeNull();
    expect(rows[1].scores?.[1]).toBe(38);
    expect(rows[1].preDeptName).toBe('技术部');
  });

  it('排序：面试分降序，无分垫底按简历分排', () => {
    const ranked = rankCandidates([
      { resultId: 1, userId: 1, name: 'a', evalTotal: null, resumeScore: 91 } as any,
      { resultId: 2, userId: 2, name: 'b', evalTotal: 39, resumeScore: 50 } as any,
      { resultId: 3, userId: 3, name: 'c', evalTotal: null, resumeScore: 60 } as any,
    ]);
    expect(ranked.map((r) => r.resultId)).toEqual([2, 1, 3]);
  });

  it('排序：线上面试整体排在线下之后，各组内仍按面试分降序', () => {
    // 线上是零散单独约的，和按教室成批面的线下混在一起不好对照
    const ranked = rankCandidates([
      { resultId: 1, userId: 1, name: 'a', evalTotal: 45, online: true } as any,
      { resultId: 2, userId: 2, name: 'b', evalTotal: 30, online: false } as any,
      { resultId: 3, userId: 3, name: 'c', evalTotal: 20, online: true } as any,
      { resultId: 4, userId: 4, name: 'd', evalTotal: 40, online: false } as any,
    ]);
    // 线上的 a 分最高也排在所有线下之后
    expect(ranked.map((r) => r.resultId)).toEqual([4, 2, 1, 3]);
  });

  it('线上标记取自结果行的 onlineInterview，缺省按线下', () => {
    const rows = assembleCandidates(
      [
        { resultId: 1, userId: 1, decision: 0, onlineInterview: true } as any,
        { resultId: 2, userId: 2, decision: 0, onlineInterview: false } as any,
        { resultId: 3, userId: 3, decision: 0 } as any,
      ],
      [], [],
    );
    expect(rows.map((r) => r.online)).toEqual([true, false, false]);
  });

  it('矩阵着色：列内相对分档，空值与齐值不着色', () => {
    const col = [38, 34, 30, null];
    expect(heatTier(38, col)).toBe(3);
    expect(heatTier(34, col)).toBe(2);
    expect(heatTier(30, col)).toBe(1);
    expect(heatTier(null, col)).toBe(0);
    expect(heatTier(5, [5, 5, 5])).toBe(0);
  });

  it('键盘映射：方向翻人、数字选部门且不越过部门数、0 移出', () => {
    expect(stageKeyAction('ArrowRight', 4)).toEqual({ type: 'next' });
    expect(stageKeyAction('1', 4)).toEqual({ type: 'assign', deptIndex: 0 });
    expect(stageKeyAction('4', 4)).toEqual({ type: 'assign', deptIndex: 3 });
    expect(stageKeyAction('5', 4)).toBeNull();
    expect(stageKeyAction('0', 4)).toEqual({ type: 'remove' });
    expect(stageKeyAction('a', 4)).toBeNull();
  });

  it('翻到头停住，不回绕到另一端', () => {
    expect(clampIndex(3, 3)).toBe(2);
    expect(clampIndex(-1, 3)).toBe(0);
    expect(clampIndex(1, 3)).toBe(1);
    expect(clampIndex(5, 0)).toBe(0);
  });

  it('冲突：已有正式结果却还在预录取名单里；待调剂不算已定', () => {
    expect(isConflict({ preDeptId: 1, decision: 1 })).toBe(true);
    expect(isConflict({ preDeptId: 1, decision: 2 })).toBe(true);
    expect(isConflict({ preDeptId: 1, decision: 0 })).toBe(false);
    expect(isConflict({ preDeptId: 1, decision: 3 })).toBe(false);
    expect(isConflict({ preDeptId: null, decision: 1 })).toBe(false);
  });

  it('名单外的待定：没决定、也没进预录取名单的人', () => {
    const list = [
      { decision: 0, preDeptId: null }, { decision: 0, preDeptId: 2 }, { decision: 1, preDeptId: null },
      { decision: 3, preDeptId: null }, { decision: 2, preDeptId: null },
    ] as any;
    expect(countPendingOutside(list)).toBe(2);
  });
});
