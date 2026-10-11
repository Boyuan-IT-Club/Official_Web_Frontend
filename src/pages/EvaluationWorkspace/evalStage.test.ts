import {
  aggregateOverview, chipStatus, currentScheduleId, resolveBackAction, sortSessionRows,
} from './evalStage';

const T = (s: string) => new Date(s);

describe('评价舞台纯逻辑', () => {
  it('本场按时间升序，无时间垫底', () => {
    const sorted = sortSessionRows([
      { scheduleId: 3 }, { scheduleId: 1, interviewTime: '2026-09-09T14:00' }, { scheduleId: 2, interviewTime: '2026-09-09T13:00' },
    ]);
    expect(sorted.map((r) => r.scheduleId)).toEqual([2, 1, 3]);
  });

  it('正在面试 = 最近一个到点的人，下一位开场即换人，最后一位一小时后归零', () => {
    const rows = sortSessionRows([
      { scheduleId: 1, interviewTime: '2026-09-09T14:00' },
      { scheduleId: 2, interviewTime: '2026-09-09T14:15' },
    ]);
    expect(currentScheduleId(rows, T('2026-09-09T13:50'))).toBeNull();
    expect(currentScheduleId(rows, T('2026-09-09T14:05'))).toBe(1);
    expect(currentScheduleId(rows, T('2026-09-09T14:20'))).toBe(2);
    expect(currentScheduleId(rows, T('2026-09-09T16:00'))).toBeNull();
  });

  it('状态字优先级：已评完 > 正在面试 > 面完未评警示 > 待面试', () => {
    expect(chipStatus({ submitted: true, hasScores: true, isCurrent: true, timePassed: true }).tag).toContain('已评完');
    expect(chipStatus({ submitted: false, hasScores: false, isCurrent: true, timePassed: true }).tone).toBe('now');
    expect(chipStatus({ submitted: false, hasScores: false, isCurrent: false, timePassed: true }).tone).toBe('warn');
    expect(chipStatus({ submitted: false, hasScores: false, isCurrent: false, timePassed: false }).tag).toBe('待面试');
  });

  it('总览聚合：四类计数、缺评点名、维度均分', () => {
    const roster = [
      { scheduleId: 1, name: 'a', interviewTime: '2026-09-09T09:00', sessionId: 12 },
      { scheduleId: 2, name: 'b', interviewTime: '2026-09-09T09:15', sessionId: 12 },
      { scheduleId: 3, name: 'c', interviewTime: '2026-09-09T20:00', sessionId: 12 },
    ];
    const summaries: any[] = [
      { scheduleId: 1, scores: { 1: 30 }, totalScore: 30, status: 2 },
      // scheduleId 2：时间已过、零分——必须被点名
    ];
    const dims: any[] = [{ dimensionId: 1, name: '技术能力', maxScore: 40, weight: 1 }];
    const ov = aggregateOverview(roster, summaries, dims, T('2026-09-09T12:00'));
    expect(ov.finalized).toBe(1);
    expect(ov.missing).toEqual([{ scheduleId: 2, name: 'b', interviewTime: '2026-09-09T09:15' }]);
    expect(ov.notStarted).toBe(1);
    expect(ov.perSession[0]).toEqual({ label: '场次 #12', done: 1, inProgress: 0, total: 3 });
    expect(ov.dimAverages[0].avg).toBe(30);
  });
});

// 顶栏返回按钮：原先一律回评价表首页，从总览或筛过的列表点进来的人
// 返回后筛选与滚动位置全没了，得重新找一遍。
describe('resolveBackAction', () => {
  it('站内还有上一页就退回上一页', () => {
    expect(resolveBackAction(1)).toBe('back');
    expect(resolveBackAction(7)).toBe('back');
  });

  it('会话里的第一页（直接开链接、刷新、从站外跳进来）回评价表', () => {
    // idx 为 0 时退回去就离开本站了
    expect(resolveBackAction(0)).toBe('board');
  });

  it('拿不到 history 位置时回评价表，不冒险往站外退', () => {
    expect(resolveBackAction(undefined)).toBe('board');
    expect(resolveBackAction(null)).toBe('board');
    expect(resolveBackAction('不是数字')).toBe('board');
  });
});
