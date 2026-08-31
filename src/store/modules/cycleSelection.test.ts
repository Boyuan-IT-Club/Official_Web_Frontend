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

const openCyclesFulfilled = (list: Array<{ cycleId: number }>) => ({
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

  it('开放列表为空时不把选择清成 undefined', () => {
    const before = stateWith({ cycleId: 7, cycleUserPicked: false });
    const after = reducer(before as any, openCyclesFulfilled([]) as any);
    expect(after.cycleId).toBe(7);
  });

  it('setSelectedCycle 接受字符串型 id 也存成数字', () => {
    const st = reducer(stateWith({}) as any, setSelectedCycle('3' as any));
    expect(st.cycleId).toBe(3);
  });
});
