import {
  assembleCandidates, clampIndex, heatTier, rankCandidates, stageKeyAction,
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

  it('索引回绕：翻过末尾回到开头', () => {
    expect(clampIndex(3, 3)).toBe(0);
    expect(clampIndex(-1, 3)).toBe(2);
  });
});
