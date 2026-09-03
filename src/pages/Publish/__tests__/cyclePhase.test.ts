import { resolveCyclePhase, isCycleWritable, daysUntil, resolveActiveCycleId } from '../cyclePhase';

describe('招募周期的三态判定', () => {
  it('在开放列表里 → open', () => {
    expect(resolveCyclePhase(3, [3, 5], [9])).toBe('open');
  });

  it('在预告列表里 → upcoming', () => {
    expect(resolveCyclePhase(9, [3], [9])).toBe('upcoming');
  });

  it('两个列表都不在 → ended', () => {
    expect(resolveCyclePhase(1, [3], [9])).toBe('ended');
  });

  it('管理员把开始时间往后推：周期从 open 变 upcoming，不该被当成 ended', () => {
    // 这正是线上那个自相矛盾的场景——原先只有「在不在开放列表」一个判断，
    // 推迟开始时间后周期掉出开放列表，页面就说「招募周期已结束」
    const openIds: number[] = [];         // 推迟后已不在开放列表
    const upcomingIds = [7];
    expect(resolveCyclePhase(7, openIds, upcomingIds)).toBe('upcoming');
  });

  it('拿不到周期列表时按 ended 处理，不允许写入', () => {
    // 宁可只读，也不让人往一个状态未知的周期里提交简历
    const phase = resolveCyclePhase(7, [], []);
    expect(phase).toBe('ended');
    expect(isCycleWritable(phase)).toBe(false);
  });

  it('只有 open 可写', () => {
    expect(isCycleWritable('open')).toBe(true);
    expect(isCycleWritable('upcoming')).toBe(false);
    expect(isCycleWritable('ended')).toBe(false);
  });
});

describe('daysUntil', () => {
  const today = new Date(2026, 8, 3);   // 2026-09-03

  it('算出还有几天开始', () => {
    expect(daysUntil('2026-09-10', today)).toBe(7);
  });

  it('明天开始 → 1', () => {
    expect(daysUntil('2026-09-04', today)).toBe(1);
  });

  it('今天开始 → null（今天就能投，不是预告）', () => {
    expect(daysUntil('2026-09-03', today)).toBeNull();
  });

  it('已经开始 → null', () => {
    expect(daysUntil('2026-08-20', today)).toBeNull();
  });

  it('没有日期或日期不合法 → null，不抛异常', () => {
    expect(daysUntil(null, today)).toBeNull();
    expect(daysUntil('不是日期', today)).toBeNull();
  });

  it('跨月不出错', () => {
    expect(daysUntil('2026-10-01', today)).toBe(28);
  });
});

describe('投递页落在哪个周期', () => {
  it('用户点过切换器就听他的，哪怕那个周期已结束', () => {
    // 切换器里也列已结束的周期供查看历史投递
    expect(resolveActiveCycleId(2, [5], [9], true)).toBe(2);
  });

  it('store 里的周期正在开放就用它', () => {
    expect(resolveActiveCycleId(5, [5, 6], [9], false)).toBe(5);
  });

  it('store 里的周期不开放，但有别的开放周期 → 落到开放的第一个', () => {
    expect(resolveActiveCycleId(2, [5, 6], [9], false)).toBe(5);
  });

  it('一个开放周期都没有时，落到最快要开始的那个（线上事故的修复点）', () => {
    // 招新间歇期：store 的默认周期既不开放也早已截止，拿它去请求简历
    // 后端一律回 3010，页面弹两个红色报错框。此时明明有已排期的下一届。
    expect(resolveActiveCycleId(2, [], [6, 7], false)).toBe(6);
  });

  it('既没有开放也没有预告时才回退到 store 的默认值', () => {
    expect(resolveActiveCycleId(2, [], [], false)).toBe(2);
  });

  it('落到预告周期后，判定结果必须是 upcoming 且不可写', () => {
    // 两个函数要串得起来：落点选了预告周期，phase 就得跟着是 upcoming，
    // 否则页面还是会去请求一个不该请求的周期
    const cid = Number(resolveActiveCycleId(2, [], [6, 7], false));
    const phase = resolveCyclePhase(cid, [], [6, 7]);
    expect(phase).toBe('upcoming');
    expect(isCycleWritable(phase)).toBe(false);
  });
});
