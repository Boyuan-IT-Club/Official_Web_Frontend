// 打分舞台的全量队列。以前舞台只拿到列表当前这一页（9 份），
// 现在要按同一套筛选条件把全部结果取回来——后端单页上限 100，得翻页。
import { loadAllResumes, SEARCH_PAGE_MAX } from './loadAllResumes';

const r = (id: number) => ({ resumeId: id });

/** 造一个按页切片的假后端，并记下每次收到的参数 */
const fakeBackend = (total: number) => {
  const data = Array.from({ length: total }, (_, i) => r(i + 1));
  const calls: Record<string, any>[] = [];
  const fetchPage = jest.fn(async (params: Record<string, any>) => {
    calls.push(params);
    const start = params.page * params.size;
    return { content: data.slice(start, start + params.size), total };
  });
  return { fetchPage, calls };
};

describe('打分舞台：按筛选条件取全部简历', () => {
  it('一页装得下就只请求一次（本届 57 份就是这种）', async () => {
    const { fetchPage } = fakeBackend(57);
    const all = await loadAllResumes({ cycleId: 14 }, fetchPage);
    expect(all).toHaveLength(57);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('超过单页上限就翻页，直到取全', async () => {
    const { fetchPage } = fakeBackend(230);
    const all = await loadAllResumes({ cycleId: 14 }, fetchPage);
    expect(all).toHaveLength(230);
    expect(fetchPage).toHaveBeenCalledTimes(3);   // 100 + 100 + 30
  });

  it('每页都用后端允许的最大页长，而不是列表那边的 9', async () => {
    const { fetchPage, calls } = fakeBackend(20);
    await loadAllResumes({ page: 2, size: 9, cycleId: 14 }, fetchPage);
    expect(calls[0].size).toBe(SEARCH_PAGE_MAX);
    // 列表停在第 3 页，舞台也必须从头取，不能接着第 3 页往后
    expect(calls[0].page).toBe(0);
  });

  it('筛选条件原样带过去 —— 舞台里的人必须和列表筛出来的是同一批', async () => {
    const { fetchPage, calls } = fakeBackend(5);
    const query = {
      cycleId: 14, name: '张', expectedDepartment: '技术部', choiceRank: 'first',
      status: '2,4,5,6', sortBy: 'submitted_at', sortOrder: 'DESC',
    };
    await loadAllResumes(query, fetchPage);
    expect(calls[0]).toMatchObject(query);
  });

  it('翻页期间有人新提交导致同一份出现两次，要去重', async () => {
    // 第一页取完后插进来一份，第二页整体后移一位，第 100 号在两页都出现
    const fetchPage = jest.fn()
      .mockResolvedValueOnce({ content: Array.from({ length: 100 }, (_, i) => r(i + 1)), total: 150 })
      .mockResolvedValueOnce({ content: Array.from({ length: 50 }, (_, i) => r(i + 100)), total: 150 });
    const all = await loadAllResumes({}, fetchPage);
    const ids = all.map((x) => x.resumeId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain(100);
  });

  it('后端返回空页就停，不会一直请求下去', async () => {
    // 翻页期间有人退出，total 还是旧值，但后面的页已经空了
    const fetchPage = jest.fn()
      .mockResolvedValueOnce({ content: [r(1), r(2)], total: 500 })
      .mockResolvedValue({ content: [], total: 500 });
    await loadAllResumes({}, fetchPage, 2);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('没有任何结果时返回空数组，不报错', async () => {
    const { fetchPage } = fakeBackend(0);
    await expect(loadAllResumes({ cycleId: 99 }, fetchPage)).resolves.toEqual([]);
  });

  it('取数失败要把错误抛出去，由页面决定退回当前页', async () => {
    const fetchPage = jest.fn().mockRejectedValue(new Error('网络错误'));
    await expect(loadAllResumes({}, fetchPage)).rejects.toThrow('网络错误');
  });
});
