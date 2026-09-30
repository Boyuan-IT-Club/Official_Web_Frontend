// 按列表同一套条件取一页 /api/resumes/search，给「取全部筛选结果」用
// （打分舞台的全量队列、AI 初筛的跨页全选）。只取数、不写 store。
import { request } from '@/utils';
import type { SearchPage } from './loadAllResumes';

export async function fetchSearchPage(params: Record<string, any>): Promise<SearchPage> {
  // 与 fetchResumes 同一条兜底：没带状态时只取已提交及之后的，不混进草稿
  const q = params.status ? params : { ...params, status: '2,3,4,5' };
  const res: any = await request.get('/api/resumes/search', { params: q });
  if (res?.code !== 200) throw new Error(res?.message || '获取简历失败');
  return {
    content: res.data?.content ?? [],
    total: res.data?.totalElements ?? 0,
  };
}
