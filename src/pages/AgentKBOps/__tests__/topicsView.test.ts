import {
  draftStatusLabel,
  gapHintLabel,
  normalizeRuns,
  normalizeTopics,
  runStatusLabel,
  runWarnings,
  scopeLabel,
  splitByNature,
  summarizeStats,
  topicTitle,
  triageLabel,
} from '../topicsView';

const topic = (over: any = {}) => ({
  topic_id: 1, rank: 1, topic: '社团会费', canonical_question: '加入社团需要交费吗?',
  scope: 'official_knowledge', triage_status: 'done', samples: [{ query: '入社要交钱吗' }],
  ...over,
});

describe('主题的标题', () => {
  it('甄别过的用模型写的主题名', () => {
    expect(topicTitle(topic())).toBe('社团会费');
  });

  it('没甄别成的(topic 为 null)用第一条样本提问顶上', () => {
    expect(topicTitle(topic({ topic: null, triage_status: 'failed' }))).toBe('入社要交钱吗');
  });

  it('样本也没有(会话都已删除)时给序号,不留空', () => {
    expect(topicTitle(topic({ topic: null, rank: 4, samples: [] }))).toBe('第 4 个主题(样本已不可查)');
    expect(topicTitle(topic({ topic: null, rank: 4, samples: undefined }))).toBe('第 4 个主题(样本已不可查)');
  });
});

describe('各种标签', () => {
  it('归类:认识的给中文,没归类的显示「未归类」,不认识的原样', () => {
    expect(scopeLabel('official_knowledge')).toBe('官方知识');
    expect(scopeLabel('personal_data')).toBe('个人数据');
    expect(scopeLabel(null)).toBe('未归类');
    expect(scopeLabel(undefined)).toBe('未归类');
    expect(scopeLabel('brand_new')).toBe('brand_new');
  });

  it('没甄别成的原因;done 不出标签', () => {
    expect(triageLabel('done')).toBe('');
    expect(triageLabel(undefined)).toBe('');
    expect(triageLabel('failed')).toBe('甄别失败');
    expect(triageLabel('unsafe_samples')).toBe('样本疑似指令');
    expect(triageLabel('out_of_budget')).toBe('预算用完,未甄别');
    expect(triageLabel('not_selected')).toBe('未进甄别名额');
    expect(triageLabel('new_state')).toBe('new_state');
  });

  it('建议与起草结局:没有就是空串(旧版 Agent 不带 draft_status)', () => {
    expect(gapHintLabel('wording')).toBe('补问法');
    expect(gapHintLabel('missing')).toBe('补条目');
    expect(gapHintLabel(null)).toBe('');
    expect(draftStatusLabel('drafted')).toBe('有草稿待审');
    expect(draftStatusLabel(undefined)).toBe('');
    expect(runStatusLabel('succeeded')).toBe('成功');
    expect(runStatusLabel(undefined)).toBe('未知');
  });
});

describe('接口返回的整理', () => {
  it('从没成功过:run 为 null、清单为空', () => {
    expect(normalizeTopics({ run: null, items: [], total: 0 })).toEqual({ run: null, items: [] });
  });

  it('字段缺失或形状不对时按空处理,不抛错', () => {
    expect(normalizeTopics(undefined)).toEqual({ run: null, items: [] });
    expect(normalizeTopics({ run: 'x', items: {} })).toEqual({ run: null, items: [] });
    expect(normalizeTopics({ items: [null, topic()] }).items).toHaveLength(1);
    expect(normalizeRuns(undefined)).toEqual([]);
    expect(normalizeRuns({ items: [{ status: 'running' }, { run_id: 'r1', status: 'failed' }] }))
      .toEqual([{ run_id: 'r1', status: 'failed' }]);
  });
});

describe('个人数据类单独一栏', () => {
  it('它们不是知识库缺口,和缺口分开', () => {
    const items = [
      topic({ topic_id: 1 }),
      topic({ topic_id: 2, scope: 'personal_data' }),
      topic({ topic_id: 3, scope: null, triage_status: 'failed' }),
    ];
    const { gaps, personal } = splitByNature(items);
    expect(gaps.map((t) => t.topic_id)).toEqual([1, 3]);
    expect(personal.map((t) => t.topic_id)).toEqual([2]);
  });
});

describe('运行统计', () => {
  const stats = {
    window: { total: 120, ok: 80, not_found: 35, unavailable: 5, near_miss: 12 },
    queries: 35, clusters: 14, below_support: 9, topics: 5,
  };

  it('未命中与差一点命中带上占比', () => {
    const items = summarizeStats(stats);
    expect(items.find((i) => i.label === '检索总数')?.value).toBe('120');
    expect(items.find((i) => i.label === '未命中')?.value).toBe('35(29.2%)');
    expect(items.find((i) => i.label === '差一点命中')?.value).toBe('12(10%)');
    expect(items.find((i) => i.label === '进入清单的主题')?.value).toBe('5');
  });

  it('缺哪项就不出哪项,不补 0', () => {
    expect(summarizeStats(undefined)).toEqual([]);
    expect(summarizeStats({})).toEqual([]);
    expect(summarizeStats({ topics: 3 }).map((i) => i.label)).toEqual(['进入清单的主题']);
    // 检索不可用为 0 时不占一格
    expect(summarizeStats({ window: { total: 10, unavailable: 0 } }).map((i) => i.label))
      .toEqual(['检索总数']);
  });

  it('预算用完、日志被截断要提醒;正常运行没有提醒', () => {
    expect(runWarnings({ run_id: 'r', status: 'succeeded', stats })).toEqual([]);
    expect(runWarnings({ run_id: 'r', status: 'succeeded', stats: { budget_exhausted: true } }))
      .toHaveLength(1);
    expect(runWarnings({ run_id: 'r', status: 'succeeded', stats: { queries_truncated: true, budget_exhausted: true } }))
      .toHaveLength(2);
    expect(runWarnings(null)).toEqual([]);
  });
});
