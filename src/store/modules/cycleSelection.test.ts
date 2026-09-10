// 周期选择的自动校正 vs 用户显式点选。
//
// 线上 bug：切换器里也列已结束的周期（供查看历史投递），点它会被
// 「校正回开放列表」的逻辑立刻弹回第一个开放周期。校正本身是对的
// （处理上次留下的失效周期），错在它不该和显式点击对抗。
import reducer, { setSelectedCycle, fetchOpenCycles } from './resume';

const stateWith = (over: any) => reducer(undefined, { type: '@@INIT' } as any) && {
  ...reducer(undefined, { type: '@@INIT' } as any),
  ...over,
};

const openCyclesFulfilled = (list: Array<{ cycleId: number; intakeOpen?: boolean }>) => ({
  type: fetchOpenCycles.fulfilled.type,
  payload: list,
});

describe('周期选择', () => {
  it('默认选择不在开放列表里时，校正到第一个开放周期', () => {
    const before = stateWith({ cycleId: 99, cycleUserPicked: false });
    const after = reducer(before as any, openCyclesFulfilled([{ cycleId: 5 }, { cycleId: 6 }]) as any);
    expect(after.cycleId).toBe(5);
  });

  it('已在开放列表里就不动', () => {
    const before = stateWith({ cycleId: 6, cycleUserPicked: false });
    const after = reducer(before as any, openCyclesFulfilled([{ cycleId: 5 }, { cycleId: 6 }]) as any);
    expect(after.cycleId).toBe(6);
  });

  it('用户显式点了已结束的周期 → 不被弹回开放周期（本次修的 bug）', () => {
    const picked = reducer(stateWith({ cycleId: 5 }) as any, setSelectedCycle(2));
    expect(picked.cycleId).toBe(2);
    expect(picked.cycleUserPicked).toBe(true);

    const after = reducer(picked, openCyclesFulfilled([{ cycleId: 5 }, { cycleId: 6 }]) as any);
    expect(after.cycleId).toBe(2);
  });

  it('显式点选后即使反复刷新开放列表也不改', () => {
    let st: any = reducer(stateWith({ cycleId: 5 }) as any, setSelectedCycle(1));
    for (let i = 0; i < 3; i++) {
      st = reducer(st, openCyclesFulfilled([{ cycleId: 5 }]) as any);
    }
    expect(st.cycleId).toBe(1);
  });

  it('开放列表为空时选中项归零为 null，而不是留着旧值或变成 undefined', () => {
    // #161 的决定：保留旧值会拿已删除/已结束周期的数据冒充当前状态。
    // 归零必须是 null（明确的「没有周期」），不能是 undefined
    const before = stateWith({ cycleId: 7, cycleUserPicked: false });
    const after = reducer(before as any, openCyclesFulfilled([]) as any);
    expect(after.cycleId).toBeNull();
  });

  it('默认落点跳过已停止投递的周期，优先还能投的那个', () => {
    // /open 列表现在混着 intakeOpen=false 的周期（可见但只读），排在前面时
    // 不该成为新用户的默认落点
    const before = stateWith({ cycleId: null, cycleUserPicked: false });
    const after = reducer(before as any, openCyclesFulfilled([
      { cycleId: 8, intakeOpen: false },
      { cycleId: 5, intakeOpen: true },
    ]) as any);
    expect(after.cycleId).toBe(5);
  });

  it('只剩已停止投递的周期时就落到它上面（可见，只读）', () => {
    const before = stateWith({ cycleId: null, cycleUserPicked: false });
    const after = reducer(before as any, openCyclesFulfilled([{ cycleId: 8, intakeOpen: false }]) as any);
    expect(after.cycleId).toBe(8);
  });

  it('setSelectedCycle 接受字符串型 id 也存成数字', () => {
    const st = reducer(stateWith({}) as any, setSelectedCycle('3' as any));
    expect(st.cycleId).toBe(3);
  });
});
