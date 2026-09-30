// 打分舞台的队列：按列表同一套筛选条件，把「全部」结果取回来。
//
// 以前舞台直接用 store 里的 resumes —— 那只是列表当前这一页（9 份），
// 于是打分只能在本页里转，打完 9 个就得退出舞台、翻页、再进来。
// 用户要的是：筛出来多少人，舞台底下就列多少人。
//
// 为什么不直接调 fetchResumes 这个 thunk：它会把结果写进 store，
// 列表页的 resumes 就被换成了「全部」，退出舞台时看到的不再是原来那一页。
// 所以这里只取数、不碰 store。

/** 后端 /api/resumes/search 的单页上限（ResumeServiceImpl: if (size > 100) size = 100） */
export const SEARCH_PAGE_MAX = 100;

/** 防御上限：一届不可能有 5000 份简历，真到这个数一定是翻页逻辑出了问题 */
const MAX_PAGES = 50;

export interface SearchPage {
  content: any[];
  total: number;
}

/**
 * 用与列表完全一致的筛选条件（lastQuery）分页取全。
 *
 * @param query      列表最后一次请求的参数；其中的 page/size 会被忽略
 * @param fetchPage  取一页的实现（注入进来，便于测试、也不绑定具体请求库）
 */
export async function loadAllResumes(
  query: Record<string, any>,
  fetchPage: (params: Record<string, any>) => Promise<SearchPage>,
  pageSize: number = SEARCH_PAGE_MAX,
): Promise<any[]> {
  const { page: _page, size: _size, ...filters } = query ?? {};
  const all: any[] = [];

  for (let page = 0; page < MAX_PAGES; page += 1) {
    // eslint-disable-next-line no-await-in-loop
    const { content, total } = await fetchPage({ ...filters, page, size: pageSize });
    all.push(...(content ?? []));
    // 取空了、或已经够数：停。两个条件都要有 —— 只看 total 的话，
    // 翻页期间有人退出（total 变小）会一直请求空页直到撞上 MAX_PAGES
    if (!content || content.length === 0 || all.length >= total) break;
  }

  // 翻页期间有人新提交会让后面的页整体后移一位，同一份简历可能出现两次
  const seen = new Set<string>();
  return all.filter((r) => {
    const key = String(r?.resumeId);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
