// 筛选条件 ↔ URL。这层存在的唯一理由是「查看简历再返回，筛选不能丢」，
// 所以核心用例就是 写出去 → 读回来 一致。
import {
  FILTER_DEFAULTS, SUBMITTED_STATUSES, ResumeFilters, readFilters, writeFilters,
} from './filterParams';

const filters = (patch: Partial<ResumeFilters> = {}): ResumeFilters => ({
  ...FILTER_DEFAULTS, ...patch,
});

describe('筛选条件写进 URL', () => {
  it('默认值不写进 URL —— 只留用户真正改过的条件', () => {
    const q = writeFilters(new URLSearchParams(), filters());
    expect(q.toString()).toBe('');
  });

  it('改过的条件才出现', () => {
    const q = writeFilters(new URLSearchParams(), filters({
      searchText: '张', expectedDepartment: '技术部', choiceRank: 'first', cycleId: 14,
    }));
    expect(q.get('q')).toBe('张');
    expect(q.get('dept')).toBe('技术部');
    expect(q.get('rank')).toBe('first');
    expect(q.get('cycle')).toBe('14');
    // 没动过的不占位置
    expect(q.get('qt')).toBeNull();
    expect(q.get('status')).toBeNull();
  });

  it('条件改回默认值时把键删掉，不留一个空壳', () => {
    const before = writeFilters(new URLSearchParams(), filters({ searchText: '张' }));
    const after = writeFilters(before, filters({ searchText: '' }));
    expect(after.get('q')).toBeNull();
  });

  it('不属于筛选的键原样保留 —— stage 是舞台态，不能被筛选覆盖掉', () => {
    const prev = new URLSearchParams('stage=1&foo=bar');
    const q = writeFilters(prev, filters({ searchText: '李' }));
    expect(q.get('stage')).toBe('1');
    expect(q.get('foo')).toBe('bar');
    expect(q.get('q')).toBe('李');
  });

  it('清空周期时删掉 cycle，而不是写成 undefined', () => {
    const before = writeFilters(new URLSearchParams(), filters({ cycleId: 14 }));
    const after = writeFilters(before, filters({ cycleId: undefined }));
    expect(after.get('cycle')).toBeNull();
    expect(after.toString()).not.toContain('undefined');
  });
});

describe('从 URL 读回筛选条件', () => {
  it('空 URL 得到全套默认值', () => {
    expect(readFilters(new URLSearchParams())).toEqual(FILTER_DEFAULTS);
    expect(readFilters(new URLSearchParams()).statusFilter).toBe(SUBMITTED_STATUSES);
  });

  it('写出去再读回来，一模一样 —— 这就是「返回后筛选还在」', () => {
    const original = filters({
      searchText: '王', searchType: 'major', expectedDepartment: '项目部',
      choiceRank: 'second', statusFilter: '4', sortBy: 'resume_score',
      sortOrder: 'ASC', sortKey: 'score_asc', cycleId: 14,
    });
    expect(readFilters(writeFilters(new URLSearchParams(), original))).toEqual(original);
  });

  it('cycle 缺失读成 undefined，不是 NaN —— undefined 才表示「不限周期」', () => {
    const got = readFilters(new URLSearchParams('q=张'));
    expect(got.cycleId).toBeUndefined();
    expect(Number.isNaN(got.cycleId as any)).toBe(false);
  });

  it('只写了一部分键时，其余补默认值', () => {
    const got = readFilters(new URLSearchParams('dept=技术部'));
    expect(got.expectedDepartment).toBe('技术部');
    expect(got.searchType).toBe(FILTER_DEFAULTS.searchType);
    expect(got.statusFilter).toBe(SUBMITTED_STATUSES);
  });
});
