import {
  resolveCyclePhase, isCycleWritable, daysUntil, resolveActiveCycleId, resolvePublishEmptyState, splitVisibleCycles,
} from '../cyclePhase';

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

describe('投递页的空状态判定', () => {
  const base = { phase: 'ended' as const, hasResume: false, openCount: 0, upcomingCount: 0, cycleListsFailed: false };

  it('招新间歇期：没有开放也没有预告，本人也没这届的简历 → 「当前没有招新」', () => {
    // 线上截图的场景：落点回退到 store 写死的旧周期，页面渲染了一份
    // 全是「未填写」的空简历，顶上挂着「草稿（不可修改）」
    expect(resolvePublishEmptyState(base)).toBe('no-recruitment');
  });

  it('有别的周期在招/预告，只是当前这届结束且没投过 → 「这一届没投递记录」', () => {
    expect(resolvePublishEmptyState({ ...base, openCount: 1 })).toBe('ended-no-resume');
    expect(resolvePublishEmptyState({ ...base, upcomingCount: 1 })).toBe('ended-no-resume');
  });

  it('周期列表没拿到 → 如实说加载失败，不冒充「没有招新」', () => {
    // 接口挂了时 phase 同样兜底成 ended，但那是「不知道」而不是「已结束」
    expect(resolvePublishEmptyState({ ...base, cycleListsFailed: true })).toBe('cycles-unavailable');
  });

  it('有简历的已结束周期不进空状态：历史投递得让人看得到', () => {
    expect(resolvePublishEmptyState({ ...base, hasResume: true })).toBeNull();
  });

  it('周期开放中或预告中不由这里决定', () => {
    expect(resolvePublishEmptyState({ ...base, phase: 'open' })).toBeNull();
    expect(resolvePublishEmptyState({ ...base, phase: 'upcoming' })).toBeNull();
  });
});

describe('已停止投递但周期时间未过（paused）', () => {
  it('/open 列表按 intakeOpen 拆成可投与已停止两组；缺字段按可投', () => {
    const { openIds, pausedIds } = splitVisibleCycles([
      { cycleId: 5, intakeOpen: true },
      { cycleId: 6, intakeOpen: false },
      { cycleId: 7 },                     // 旧后端没有这个字段
    ]);
    expect(openIds).toEqual([5, 7]);
    expect(pausedIds).toEqual([6]);
    expect(splitVisibleCycles(null)).toEqual({ openIds: [], pausedIds: [] });
  });

  it('在 paused 组里 → paused，且不可写', () => {
    // 管理员点了「停止投递」：周期在用户端要继续可见，只是不能再提交/修改/新建
    const phase = resolveCyclePhase(6, [5], [9], [6]);
    expect(phase).toBe('paused');
    expect(isCycleWritable(phase)).toBe(false);
  });

  it('同一个 id 既在 open 又在 paused 时以 open 为准（不会发生，但别把能投的判成不能投）', () => {
    expect(resolveCyclePhase(6, [6], [], [6])).toBe('open');
  });

  it('落点：store 里是已停止投递的周期就留在它上面（投过的同学要看自己的简历）', () => {
    expect(resolveActiveCycleId(6, [5], [9], false, [6])).toBe(6);
  });

  it('落点：没有可投周期时先落到已停止投递的，再落预告', () => {
    // 已停止投递的仍是「当前这届」，比下一届预告更该先看到
    expect(resolveActiveCycleId(null, [], [9], false, [6])).toBe(6);
    expect(resolveActiveCycleId(null, [], [9], false, [])).toBe(9);
  });

  it('落点：有可投的就优先可投的，不落到已停止投递的', () => {
    expect(resolveActiveCycleId(null, [5], [], false, [6])).toBe(5);
  });

  it('paused 且本人没这届的简历 → 专门的空状态，不能再新建', () => {
    expect(resolvePublishEmptyState({
      phase: 'paused', hasResume: false, openCount: 0, upcomingCount: 0, cycleListsFailed: false,
    })).toBe('paused-no-resume');
  });

  it('paused 且有简历 → 正常渲染（只读）', () => {
    expect(resolvePublishEmptyState({
      phase: 'paused', hasResume: true, openCount: 0, upcomingCount: 0, cycleListsFailed: false,
    })).toBeNull();
  });
});
