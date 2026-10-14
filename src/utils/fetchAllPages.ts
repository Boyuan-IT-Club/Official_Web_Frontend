/**
 * 按总数翻页取齐全部记录。
 *
 * 分页接口只拿第一页、再把 size 写大来「拉全」是个陷阱：超过 size 的记录会静默消失，
 * 页面不报错、看起来也正常。这里先取第一页拿到 total，再把其余页并发取回，
 * 按 key 去重（翻页期间有人新增记录，前后页会错位出现重复）。
 *
 * maxPages 是防失控的上限，不是业务限制：total 异常大时宁可少取也不打爆接口。
 */
export async function fetchAllPages<T>(
  fetchPage: (page: number, size: number) => Promise<{ rows: T[]; total: number }>,
  keyOf: (row: T) => string | number,
  pageSize = 500,
  maxPages = 40,
): Promise<{ rows: T[]; total: number }> {
  const first = await fetchPage(1, pageSize);
  const total = Number.isFinite(first.total) ? first.total : first.rows.length;
  const pages = Math.min(Math.ceil(total / pageSize), maxPages);
  const rest = pages > 1
    ? await Promise.all(Array.from({ length: pages - 1 }, (_, i) => fetchPage(i + 2, pageSize)))
    : [];
  const seen = new Set<string | number>();
  const rows: T[] = [];
  [first, ...rest].forEach((p) => p.rows.forEach((r) => {
    const key = keyOf(r);
    if (seen.has(key)) return;
    seen.add(key);
    rows.push(r);
  }));
  if (rows.length < total) {
    // 取回的比服务端报的少：可能触了 maxPages 上限，或翻页期间名单变动。别静默吞掉
    // eslint-disable-next-line no-console
    console.warn(`fetchAllPages: 期望 ${total} 条，只取回 ${rows.length} 条`);
  }
  return { rows, total };
}
