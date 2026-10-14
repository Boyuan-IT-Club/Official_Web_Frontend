import { fetchAllPages } from '../fetchAllPages';

const pageOf = (all: Array<{ id: number }>) => async (page: number, size: number) => ({
  rows: all.slice((page - 1) * size, page * size),
  total: all.length,
});

describe('fetchAllPages', () => {
  it('超过一页时把其余页都取回来——原先只取第一页，超出的人静默消失', async () => {
    const all = Array.from({ length: 1234 }, (_, i) => ({ id: i + 1 }));
    const { rows, total } = await fetchAllPages(pageOf(all), (r) => r.id, 500);
    expect(total).toBe(1234);
    expect(rows).toHaveLength(1234);
    expect(rows[0].id).toBe(1);
    expect(rows[1233].id).toBe(1234);
  });

  it('只有一页时只请求一次', async () => {
    const fetchPage = jest.fn(pageOf([{ id: 1 }, { id: 2 }]));
    const { rows } = await fetchAllPages(fetchPage, (r) => r.id, 500);
    expect(rows).toHaveLength(2);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('翻页期间前后页错位出现的重复记录会被去掉', async () => {
    // 第 2 页开头重复了第 1 页的最后一条（取第 1 页之后有人新增，列表整体后移一位）
    const fetchPage = async (page: number) => (page === 1
      ? { rows: [{ id: 1 }, { id: 2 }], total: 4 }
      : { rows: [{ id: 2 }, { id: 3 }], total: 4 });
    const { rows } = await fetchAllPages(fetchPage, (r) => r.id, 2);
    expect(rows.map((r) => r.id)).toEqual([1, 2, 3]);
  });

  it('total 异常大时按上限停下，不把接口打爆', async () => {
    const fetchPage = jest.fn(async () => ({ rows: [{ id: Math.random() }], total: 1_000_000 }));
    await fetchAllPages(fetchPage, (r) => r.id, 500, 5);
    expect(fetchPage).toHaveBeenCalledTimes(5);
  });

  it('空结果不报错', async () => {
    const { rows, total } = await fetchAllPages(async () => ({ rows: [], total: 0 }), (r: { id: number }) => r.id);
    expect(rows).toEqual([]);
    expect(total).toBe(0);
  });
});
