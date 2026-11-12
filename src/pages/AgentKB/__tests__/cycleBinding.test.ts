import dayjs from 'dayjs';
import {
  buildCycleOptions,
  describeBinding,
  directoryProblem,
  normalizeCycleId,
  toCycleInfos,
  toOpenIds,
  type CycleDirectory,
} from '../cycleBinding';

const TODAY = dayjs('2026-11-11');

const CYCLES = [
  { cycleId: 1, cycleName: '2025 秋季招新', startDate: '2025-09-01', endDate: '2025-10-15' },
  { cycleId: 2, cycleName: '2026 秋季招新', startDate: '2026-09-01', endDate: '2026-12-01' },
  { cycleId: 3, cycleName: '2027 春季招新', startDate: '2027-03-01', endDate: '2027-04-01' },
];

const dir = (over: Partial<CycleDirectory> = {}): CycleDirectory => ({
  cycles: CYCLES,
  openIds: new Set([2]),
  ...over,
});

describe('cycle_id 归一', () => {
  it('旧版 Agent 不返回字段(undefined)与 null 一样按常青处理', () => {
    expect(normalizeCycleId(undefined)).toBeNull();
    expect(normalizeCycleId(null)).toBeNull();
  });

  it('只认 ≥1 的整数——接口契约之外的值一律当常青,不带着脏值回写', () => {
    expect(normalizeCycleId(3)).toBe(3);
    [0, -1, 1.5, NaN, '3', '', {}, true].forEach((v) => expect(normalizeCycleId(v)).toBeNull());
  });
});

describe('周期接口返回的解析', () => {
  it('不是数组就算没取到(null),不能当成「一个周期都没有」', () => {
    expect(toCycleInfos(undefined)).toBeNull();
    expect(toCycleInfos({ list: [] })).toBeNull();
    expect(toOpenIds(null)).toBeNull();
  });

  it('空数组是「确实没有」,与没取到不同', () => {
    expect(toCycleInfos([])).toEqual([]);
    expect(toOpenIds([])).toEqual(new Set());
  });

  it('id 是数字字符串也认,坏行丢掉,缺名字时用「周期 #id」顶上', () => {
    expect(toCycleInfos([{ cycleId: '2', cycleName: 'B' }, { cycleName: '没 id' }, null, { cycleId: 5 }]))
      .toEqual([
        { cycleId: 2, cycleName: 'B', startDate: null, endDate: null },
        { cycleId: 5, cycleName: '周期 #5', startDate: null, endDate: null },
      ]);
    expect(toOpenIds([{ cycleId: '2' }, { cycleId: 0 }, {}])).toEqual(new Set([2]));
  });
});

describe('绑定状态', () => {
  it('没绑定 = 常青,可被检索', () => {
    const v = describeBinding(undefined, dir(), TODAY);
    expect(v).toMatchObject({ status: 'evergreen', label: '常青', unsearchable: false });
  });

  it('绑定的周期在开放列表里 = 开放中', () => {
    const v = describeBinding(2, dir(), TODAY);
    expect(v).toMatchObject({ status: 'open', label: '2026 秋季招新', unsearchable: false });
  });

  it('周期已过结束日期 = 已结束,检索不到', () => {
    const v = describeBinding(1, dir(), TODAY);
    expect(v).toMatchObject({ status: 'ended', stateText: '已结束', unsearchable: true });
    expect(v.hint).toContain('不会被检索到');
  });

  it('周期还没到开始日期 = 未开始,暂时检索不到', () => {
    const v = describeBinding(3, dir(), TODAY);
    expect(v).toMatchObject({ status: 'upcoming', stateText: '未开始', unsearchable: true });
  });

  it('以开放列表为准:日期看着在期内但不在开放列表里,仍算检索不到', () => {
    // Agent 检索读的是 /api/cycles/open,前端不能凭日期另算一套把它说成「开放中」
    const v = describeBinding(2, dir({ openIds: new Set() }), TODAY);
    expect(v).toMatchObject({ status: 'closed', stateText: '未开放', unsearchable: true });
  });

  it('绑定的周期已被删除 = 检索不到,并说明周期不存在', () => {
    const v = describeBinding(9, dir(), TODAY);
    expect(v).toMatchObject({ status: 'closed', label: '周期 #9', stateText: '周期不存在', unsearchable: true });
  });

  it('开放周期没取到 = 未知,不能误报成「检索不到」', () => {
    const v = describeBinding(1, dir({ openIds: null }), TODAY);
    expect(v).toMatchObject({ status: 'unknown', label: '2025 秋季招新', unsearchable: false });
  });

  it('周期列表没取到时名字退回「周期 #id」,开放与否仍按开放列表判断', () => {
    expect(describeBinding(2, dir({ cycles: null }), TODAY))
      .toMatchObject({ status: 'open', label: '周期 #2' });
    // 没有日期可参考,只能说「未开放」;也不能说「周期不存在」——只是没取到
    expect(describeBinding(1, dir({ cycles: null }), TODAY))
      .toMatchObject({ status: 'closed', label: '周期 #1', stateText: '未开放', unsearchable: true });
  });
});

describe('选择器选项', () => {
  it('新的排前面,名字后带上开放状态', () => {
    expect(buildCycleOptions(dir(), null, TODAY)).toEqual([
      { value: 3, label: '2027 春季招新(未开始)' },
      { value: 2, label: '2026 秋季招新(开放中)' },
      { value: 1, label: '2025 秋季招新(已结束)' },
    ]);
  });

  it('开放状态未知时不逐项标注', () => {
    expect(buildCycleOptions(dir({ openIds: null }), null, TODAY).map((o) => o.label))
      .toEqual(['2027 春季招新', '2026 秋季招新', '2025 秋季招新']);
  });

  it('周期列表没取到:已有绑定仍作为一个选项保留,不会被显示成常青', () => {
    expect(buildCycleOptions(dir({ cycles: null, openIds: null }), 7, TODAY))
      .toEqual([{ value: 7, label: '周期 #7' }]);
  });

  it('绑定的周期已被删除:保留该选项并注明', () => {
    const options = buildCycleOptions(dir(), 9, TODAY);
    expect(options).toHaveLength(4);
    expect(options[3]).toEqual({ value: 9, label: '周期 #9(周期不存在)' });
  });

  it('没取到周期又没有绑定时没有任何周期选项(只剩组件自己的「常青」)', () => {
    expect(buildCycleOptions(dir({ cycles: null }), null, TODAY)).toEqual([]);
  });
});

describe('周期信息没取全时的提示', () => {
  it('都取到了不提示', () => {
    expect(directoryProblem(dir())).toBeNull();
  });

  it('按缺的是哪一半说清楚影响', () => {
    expect(directoryProblem(dir({ cycles: null, openIds: null }))).toContain('招新周期信息加载失败');
    expect(directoryProblem(dir({ cycles: null }))).toContain('仍可改回常青');
    expect(directoryProblem(dir({ openIds: null }))).toContain('开放中的周期加载失败');
  });

  it('只要周期列表没取到,都要说明已有绑定会保留', () => {
    expect(directoryProblem(dir({ cycles: null }))).toContain('已有的周期绑定会原样保留');
    expect(directoryProblem(dir({ cycles: null, openIds: null }))).toContain('已有的周期绑定会原样保留');
  });
});
