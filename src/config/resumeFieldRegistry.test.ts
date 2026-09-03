// 规范字段表是四个视图的共同依赖，先把它的不变量立住。
import {
  RESUME_FIELDS, specOf, orderOf, sortByCanonicalOrder, groupByCategory, FieldCategory,
} from './resumeFieldRegistry';

describe('简历字段规范表', () => {
  it('order 唯一且连续，覆盖 1..N', () => {
    const orders = RESUME_FIELDS.map((f) => f.order).sort((a, b) => a - b);
    expect(new Set(orders).size).toBe(RESUME_FIELDS.length);
    expect(orders).toEqual(Array.from({ length: RESUME_FIELDS.length }, (_, i) => i + 1));
  });

  it('key 不重复', () => {
    const keys = RESUME_FIELDS.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('order 与分区不冲突：同分区的字段在顺序上连成一段', () => {
    const seen = new Map<number, { min: number; max: number }>();
    RESUME_FIELDS.forEach((f) => {
      const cur = seen.get(f.category);
      seen.set(f.category, cur
        ? { min: Math.min(cur.min, f.order), max: Math.max(cur.max, f.order) }
        : { min: f.order, max: f.order });
    });
    // 任意两个分区的 [min,max] 区间不得交叠，否则分组展示会出现穿插
    const ranges = [...seen.values()].sort((a, b) => a.min - b.min);
    for (let i = 1; i < ranges.length; i++) {
      expect(ranges[i].min).toBeGreaterThan(ranges[i - 1].max);
    }
  });

  it('废弃字段不在表单也不在查看里', () => {
    const deprecated = specOf('expected_interview_time');
    expect(deprecated?.inForm).toBe(false);
    expect(deprecated?.inView).toBe(false);
  });

  it('后端的 sortOrder 优先于规范表 —— 管理员拖拽的结果不能被前端盖掉', () => {
    const sorted = sortByCanonicalOrder([
      { fieldKey: 'name', sortOrder: 5 },
      { fieldKey: 'phone', sortOrder: 1 },
    ]);
    expect(sorted.map((f) => f.fieldKey)).toEqual(['phone', 'name']);
  });

  it('没有 sortOrder 时按规范表排', () => {
    const sorted = sortByCanonicalOrder([
      { fieldKey: 'project_experience' }, { fieldKey: 'name' }, { fieldKey: 'email' },
    ]);
    expect(sorted.map((f) => f.fieldKey)).toEqual(['name', 'email', 'project_experience']);
  });

  it('sortOrder 重复时按规范表兜底，顺序稳定（历史数据出现过重号）', () => {
    const sorted = sortByCanonicalOrder([
      { fieldKey: 'phone', sortOrder: 13 },
      { fieldKey: 'name', sortOrder: 13 },
    ]);
    expect(sorted.map((f) => f.fieldKey)).toEqual(['name', 'phone']);
  });

  it('表里没有的自定义字段排到最后，不会插到中间', () => {
    const sorted = sortByCanonicalOrder([
      { fieldKey: '自定义问题' }, { fieldKey: 'name' },
    ]);
    expect(sorted[0].fieldKey).toBe('name');
    expect(orderOf('自定义问题')).toBeGreaterThan(orderOf('project_experience'));
  });

  it('分组按分区顺序返回，且空分区不出现', () => {
    const groups = groupByCategory([
      { fieldKey: 'tech_stack' }, { fieldKey: 'name' }, { fieldKey: 'reason' },
    ]);
    expect(groups.map((g) => g.category)).toEqual([
      FieldCategory.Basic, FieldCategory.Statement, FieldCategory.Skill,
    ]);
    expect(groups[0].label).toBe('基本信息');
  });

  it('sortByCanonicalOrder 不改动入参数组', () => {
    const input = [{ fieldKey: 'phone' }, { fieldKey: 'name' }];
    const copy = [...input];
    sortByCanonicalOrder(input);
    expect(input).toEqual(copy);
  });
});

describe('导出的「其他信息」只收自定义字段', () => {
  // Word 导出里「其他信息」的排除清单是从 RESUME_FIELDS 推导的
  // （见 Publish/index.tsx 的 exportExtras）。这里锁住推导的前提：
  // 模板正文渲染过的标准字段，规范表里必须都有——少一个，那个字段
  // 就会在导出末尾被当成自定义字段重复列一遍。
  // 线上真实事故：规范表有 introduction，而手写的排除清单漏了它，
  // 于是「个人简介」在 Word 里出现两次。
  const RENDERED_BY_TEMPLATE = [
    'name', 'student_id', 'gender', 'grade', 'major', 'email', 'phone', 'github',
    'personal_photo',
    'self_introduction', 'reason', 'introduction',
    'first_choice', 'second_choice', 'expected_departments',
    'tech_stack', 'project_experience',
  ];

  it.each(RENDERED_BY_TEMPLATE)('规范表里有 %s', (key) => {
    expect(specOf(key)).toBeDefined();
  });

  it('规范表的 key 无重复——重复会让排除集合与顺序都失准', () => {
    const keys = RESUME_FIELDS.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
