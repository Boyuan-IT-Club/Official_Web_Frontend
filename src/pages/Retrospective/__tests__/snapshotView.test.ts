import {
  buildDomainSections,
  domainLabel,
  formatByUnit,
  formatDelta,
  formatMetricValue,
  formatNumber,
  formatPrev,
  formatWindow,
  keyLabel,
  pickDefaultCycle,
  toCycleList,
  unavailableDomains,
} from '../snapshotView';

const metric = (over: any = {}) => ({
  id: 'x', metric: 'x', key: null, value: 12, unit: 'count', n: 12, suppressed: false, side: null,
  ...over,
});

describe('数字的写法', () => {
  it('千分位、至多两位小数', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
    expect(formatNumber(12.5)).toBe('12.5');
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(-1234.5)).toBe('-1,234.5');
  });

  it('比率是 0–1 的小数,转成百分比;不留浮点尾噪', () => {
    expect(formatByUnit(0.1234, 'ratio')).toBe('12.34%');
    expect(formatByUnit(0.07, 'ratio')).toBe('7%');
    expect(formatByUnit(1, 'ratio')).toBe('100%');
  });

  it('毫秒与 token 带单位,计数不带;不认识的单位原样附上', () => {
    expect(formatByUnit(1840, 'ms')).toBe('1,840 ms');
    expect(formatByUnit(52000, 'tokens')).toBe('52,000 tokens');
    expect(formatByUnit(128, 'count')).toBe('128');
    expect(formatByUnit(3, undefined)).toBe('3');
    expect(formatByUnit(3, 'days')).toBe('3 days');
  });
});

describe('被抑制的值——不能显示成 0', () => {
  it('计数被抑制显示「<5」', () => {
    const v = formatMetricValue(metric({ value: null, n: null, suppressed: true, side: 'low' }));
    expect(v).toEqual({ text: '<5', suppressed: true, missing: false });
  });

  it('阈值跟着快照走,不写死 5', () => {
    const v = formatMetricValue(metric({ value: null, suppressed: true, side: 'low' }), 10);
    expect(v.text).toBe('<10');
  });

  it('比率的分子太小:「不足 5 / n」,带上分母', () => {
    const v = formatMetricValue(
      metric({ unit: 'ratio', value: null, n: 300, suppressed: true, side: 'low' }),
    );
    expect(v.text).toBe('不足 5 / 300');
  });

  it('比率的补集太小:「接近 100%」', () => {
    const v = formatMetricValue(
      metric({ unit: 'ratio', value: null, n: 300, suppressed: true, side: 'high' }),
    );
    expect(v.text).toBe('接近 100%');
  });

  it('样本本身不足(side 为空):「样本不足」,比率与统计量都一样', () => {
    expect(formatMetricValue(metric({ unit: 'ratio', value: null, n: null, suppressed: true })).text)
      .toBe('样本不足');
    expect(formatMetricValue(metric({ unit: 'ms', value: null, n: null, suppressed: true })).text)
      .toBe('样本不足');
  });

  it('以 suppressed 为准:就算同时带了一个数也不显示它', () => {
    const v = formatMetricValue(metric({ value: 0, suppressed: true, side: 'low' }));
    expect(v.text).toBe('<5');
    expect(v.suppressed).toBe(true);
  });

  it('没被抑制但也没有数(字段缺失)显示「—」,同样不是 0', () => {
    expect(formatMetricValue(metric({ value: null }))).toEqual({ text: '—', suppressed: false, missing: true });
    expect(formatMetricValue(metric({ value: undefined })).text).toBe('—');
  });

  it('真实的 0 照常显示为 0', () => {
    expect(formatMetricValue(metric({ unit: 'ms', value: 0, n: 40 })).text).toBe('0 ms');
  });
});

describe('与基线的差', () => {
  it('没有差值(任一侧没有值或被抑制)返回 null', () => {
    expect(formatDelta(metric({ delta: null }))).toBeNull();
    expect(formatDelta(metric({}))).toBeNull();
  });

  it('计数给差值,带相对变化', () => {
    expect(formatDelta(metric({ delta: 18, delta_ratio: 0.1636 })))
      .toEqual({ text: '+18(+16.36%)', direction: 'up' });
    expect(formatDelta(metric({ delta: -7, delta_ratio: null })))
      .toEqual({ text: '-7', direction: 'down' });
  });

  it('比率给的是百分点差,不写成百分比变化', () => {
    expect(formatDelta(metric({ unit: 'ratio', delta: -0.0123, delta_ratio: null })))
      .toEqual({ text: '-1.23 个百分点', direction: 'down' });
  });

  it('差为 0 写「持平」', () => {
    expect(formatDelta(metric({ delta: 0, delta_ratio: 0 }))).toEqual({ text: '持平', direction: 'flat' });
  });

  it('基线值按同一单位写;基线没有值显示「—」', () => {
    expect(formatPrev(metric({ unit: 'ratio', prev: 0.2 }))).toBe('20%');
    expect(formatPrev(metric({ prev: null }))).toBe('—');
    expect(formatPrev(metric({}))).toBe('—');
  });
});

describe('统计时间窗', () => {
  it('按原样截取,不随浏览器时区换算', () => {
    expect(formatWindow({
      start: '2026-09-01T00:00:00+08:00', end: '2026-12-16T00:00:00+08:00', timezone: 'Asia/Shanghai',
    })).toBe('2026-09-01 00:00 ~ 2026-12-16 00:00(Asia/Shanghai)');
  });

  it('取不到周期日期时为 null', () => {
    expect(formatWindow(null)).toBeNull();
    expect(formatWindow(undefined)).toBeNull();
    expect(formatWindow({} as any)).toBeNull();
  });
});

describe('按域整理快照', () => {
  const snapshot = {
    domains: {
      funnel: { status: 'ok' },
      kb: { status: 'unavailable', reason: '检索日志库连不上' },
      agreement: { status: 'pending', reason: '该域指标暂缺,见目录' },
    },
    catalog: [
      { id: 'funnel.resumes_total', domain: 'funnel', name: '投递总数', definition: '简历总数', unit: 'count', status: 'ok', reason: '' },
      { id: 'funnel.decisions', domain: 'funnel', name: '各决定计数', definition: '按决定分格', unit: 'count', status: 'ok', reason: '' },
      { id: 'funnel.evaluated_candidates', domain: 'funnel', name: '已评价人数', definition: '', unit: 'count', status: 'ok', reason: '' },
      { id: 'kb.searches', domain: 'kb', name: '检索次数', definition: '', unit: 'count', status: 'ok', reason: '' },
      { id: 'agreement.rank', domain: 'agreement', name: '排序一致率', definition: '', unit: 'ratio', status: 'pending', reason: '人工信号还没定' },
    ],
    metrics: [
      metric({ id: 'funnel.decisions[passed]', metric: 'funnel.decisions', key: 'passed', value: 40 }),
      metric({ id: 'funnel.resumes_total', metric: 'funnel.resumes_total', value: 128 }),
      metric({ id: 'funnel.decisions[rejected]', metric: 'funnel.decisions', key: 'rejected', value: null, suppressed: true, side: 'low' }),
    ],
    absent: [{ id: 'funnel.evaluated_candidates', reason: '该周期没开评价表' }],
  };

  it('域与指标的顺序跟目录走,而不是跟指标值出现的先后', () => {
    const sections = buildDomainSections(snapshot);
    expect(sections.map((s) => s.domain)).toEqual(['funnel', 'kb', 'agreement']);
    expect(sections[0].rows.map((r) => r.id))
      .toEqual(['funnel.resumes_total', 'funnel.decisions', 'funnel.evaluated_candidates']);
  });

  it('标量是一个数,分布是同一指标的多格', () => {
    const [funnel] = buildDomainSections(snapshot);
    expect(funnel.rows[0]).toMatchObject({ kind: 'scalar', name: '投递总数' });
    expect(funnel.rows[0].value?.value).toBe(128);
    expect(funnel.rows[1].kind).toBe('breakdown');
    expect(funnel.rows[1].cells?.map((c) => c.key)).toEqual(['passed', 'rejected']);
  });

  it('这次没取到的指标(absent)带原因,不当成 0', () => {
    const [funnel] = buildDomainSections(snapshot);
    expect(funnel.rows[2]).toMatchObject({ kind: 'absent', reason: '该周期没开评价表' });
    expect(funnel.rows[2].value).toBeUndefined();
  });

  it('暂缺指标只出现在目录里,带原因', () => {
    const agreement = buildDomainSections(snapshot)[2];
    expect(agreement).toMatchObject({ label: '人机一致', status: 'pending' });
    expect(agreement.rows[0]).toMatchObject({ kind: 'pending', reason: '人工信号还没定' });
  });

  it('没采到的域:指标没有值,原因取自域的状态', () => {
    const kb = buildDomainSections(snapshot)[1];
    expect(kb).toMatchObject({ status: 'unavailable', reason: '检索日志库连不上' });
    expect(kb.rows[0]).toMatchObject({ kind: 'missing', reason: '检索日志库连不上' });
  });

  it('目录里没有的指标值不丢,用 id 当名字', () => {
    const sections = buildDomainSections({
      ...snapshot,
      metrics: [...snapshot.metrics, metric({ id: 'cost.new_thing', metric: 'cost.new_thing', value: 9 })],
    });
    const cost = sections.find((s) => s.domain === 'cost');
    expect(cost?.rows).toEqual([expect.objectContaining({ kind: 'scalar', name: 'cost.new_thing' })]);
  });

  it('快照缺目录时仍能按 id 前缀分域展示', () => {
    const sections = buildDomainSections({ metrics: snapshot.metrics });
    expect(sections).toHaveLength(1);
    expect(sections[0]).toMatchObject({ domain: 'funnel', status: 'unknown' });
    expect(sections[0].rows.map((r) => r.kind).sort()).toEqual(['breakdown', 'scalar']);
  });

  it('字段缺失或形状不对时返回空,不抛错', () => {
    expect(buildDomainSections(null)).toEqual([]);
    expect(buildDomainSections(undefined)).toEqual([]);
    expect(buildDomainSections({})).toEqual([]);
    expect(buildDomainSections({ catalog: 'x', metrics: {}, absent: 1, domains: null } as any)).toEqual([]);
    expect(buildDomainSections({ metrics: [null, { value: 1 }] } as any)).toEqual([]);
  });
});

describe('其他', () => {
  it('没采到的域列出来,其余状态不算', () => {
    expect(unavailableDomains({
      funnel: { status: 'ok' },
      kb: { status: 'unavailable', reason: '库连不上' },
      agreement: { status: 'pending' },
    })).toEqual([{ domain: 'kb', label: '知识库', reason: '库连不上' }]);
    expect(unavailableDomains(undefined)).toEqual([]);
  });

  it('域名与分布键:认识的给中文,不认识的原样显示', () => {
    expect(domainLabel('screening')).toBe('简历初筛');
    expect(domainLabel('brand_new')).toBe('brand_new');
    expect(keyLabel('other')).toBe('其他');
    expect(keyLabel('技术部')).toBe('技术部');
    expect(keyLabel(null)).toBe('');
  });

  it('周期列表:不是数组算没取到(null),坏行丢掉,缺名字用「周期 #id」顶上', () => {
    expect(toCycleList(undefined)).toBeNull();
    expect(toCycleList({ list: [] })).toBeNull();
    expect(toCycleList([])).toEqual([]);
    expect(toCycleList([
      { cycleId: '2', cycleName: 'B', startDate: '2026-09-01' }, { cycleName: '没 id' }, null, { cycleId: 5 },
    ])).toEqual([
      { cycleId: 2, cycleName: 'B', startDate: '2026-09-01' },
      { cycleId: 5, cycleName: '周期 #5', startDate: null },
    ]);
  });

  it('默认看已经开始的周期里最新的一个', () => {
    const cycles = [
      { cycleId: 1, startDate: '2025-09-01' },
      { cycleId: 2, startDate: '2026-09-01' },
      { cycleId: 3, startDate: '2027-03-01' },
    ];
    expect(pickDefaultCycle(cycles, '2026-11-12')).toBe(2);
    // 都还没开始:取最新的
    expect(pickDefaultCycle(cycles, '2020-01-01')).toBe(3);
    // 没有日期也不崩
    expect(pickDefaultCycle([{ cycleId: 7 }, { cycleId: 9 }], '2026-11-12')).toBe(9);
    expect(pickDefaultCycle([], '2026-11-12')).toBeNull();
  });
});
