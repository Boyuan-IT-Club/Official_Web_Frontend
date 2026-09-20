// 简历审核列表的筛选条件 ↔ URL 查询串。
//
// 起因：ResumeList 与 ResumeDetail 互斥渲染，点「查看」时列表整个卸载，
// useState 里的筛选条件全丢，返回时重新挂载就回到默认值（用户报的问题）。
// 页码此前已被提到父组件躲过这一劫，筛选条件没有。
//
// 放 URL 而不是继续往父组件提：顺带扛住刷新、能把筛好的列表直接发给别人，
// 也不用把十来个 state 都改成受控属性。

/** 「已提交」这一档包含的状态值，与列表默认筛选一致 */
export const SUBMITTED_STATUSES = '2,4,5,6';

export type ResumeFilters = {
  searchText: string;
  searchType: string;
  expectedDepartment: string;
  choiceRank: string;
  statusFilter: string;
  sortBy: string;
  sortOrder: string;
  sortKey: string;
  aiFilter: 'all' | 'pending' | 'passed' | 'review';
  cycleId?: number;
};

export const FILTER_DEFAULTS: ResumeFilters = {
  searchText: '',
  searchType: 'name',
  expectedDepartment: '',
  choiceRank: '',
  statusFilter: SUBMITTED_STATUSES,
  sortBy: 'submitted_at',
  sortOrder: 'DESC',
  sortKey: 'time_desc',
  aiFilter: 'all',
  cycleId: undefined,
};

/** 查询串里的键名。短名是给人看的——这串 URL 会被复制、粘贴到群里 */
const KEYS: Record<keyof Omit<ResumeFilters, 'cycleId'>, string> = {
  searchText: 'q',
  searchType: 'qt',
  expectedDepartment: 'dept',
  choiceRank: 'rank',
  statusFilter: 'status',
  sortBy: 'sortBy',
  sortOrder: 'sortOrder',
  sortKey: 'sort',
  aiFilter: 'ai',
};

/** 从 URL 读出筛选条件；缺的键用默认值补齐 */
export function readFilters(params: URLSearchParams): ResumeFilters {
  const get = (key: string, fallback: string): string => params.get(key) ?? fallback;
  const cycle = params.get('cycle');
  return {
    searchText: get(KEYS.searchText, FILTER_DEFAULTS.searchText),
    searchType: get(KEYS.searchType, FILTER_DEFAULTS.searchType),
    expectedDepartment: get(KEYS.expectedDepartment, FILTER_DEFAULTS.expectedDepartment),
    choiceRank: get(KEYS.choiceRank, FILTER_DEFAULTS.choiceRank),
    statusFilter: get(KEYS.statusFilter, FILTER_DEFAULTS.statusFilter),
    sortBy: get(KEYS.sortBy, FILTER_DEFAULTS.sortBy),
    sortOrder: get(KEYS.sortOrder, FILTER_DEFAULTS.sortOrder),
    sortKey: get(KEYS.sortKey, FILTER_DEFAULTS.sortKey),
    aiFilter: get(KEYS.aiFilter, FILTER_DEFAULTS.aiFilter) as ResumeFilters['aiFilter'],
    // 空串要落成 undefined 而不是 NaN：undefined 才是「不限周期」
    cycleId: cycle ? Number(cycle) : undefined,
  };
}

/**
 * 把筛选条件写回查询串，返回新的 URLSearchParams。
 *
 * 两条规则：
 * - 与默认值相同的键不写，URL 里只留下用户真正改过的条件，短且可读；
 * - 不认识的键（比如 stage）原样保留，这里只管自己那几个。
 */
export function writeFilters(prev: URLSearchParams, filters: ResumeFilters): URLSearchParams {
  const next = new URLSearchParams(prev);
  (Object.keys(KEYS) as Array<keyof typeof KEYS>).forEach((field) => {
    const key = KEYS[field];
    const value = String(filters[field] ?? '');
    if (value === String(FILTER_DEFAULTS[field] ?? '')) next.delete(key);
    else next.set(key, value);
  });
  if (filters.cycleId == null) next.delete('cycle');
  else next.set('cycle', String(filters.cycleId));
  return next;
}
