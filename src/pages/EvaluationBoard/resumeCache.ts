// 候选人简历的会话内缓存 + 预取。
//
// 抽屉原来每次打开都重新请求简历：面试时一位位点过去、来回翻看，
// 同一份简历会被反复拉取，每次都要等一个完整往返。
// 简历在一场面试里不会变，缓存到内存足够；换周期或刷新页面自然失效。
import { CandidateResume, getCandidateResume } from '@/api/manage/interviewEvaluation';

/** key = `${cycleId}:${scheduleId}`，value 是进行中的 Promise 或已完成的结果 */
const cache = new Map<string, Promise<CandidateResume | null>>();

const keyOf = (cycleId: number, scheduleId: number) => `${cycleId}:${scheduleId}`;

/**
 * 取简历。同一候选人重复调用直接复用缓存（含并发中的请求，不会打两次）。
 */
export function loadCandidateResume(cycleId: number, scheduleId: number): Promise<CandidateResume | null> {
  const key = keyOf(cycleId, scheduleId);
  const hit = cache.get(key);
  if (hit) return hit;

  const task = getCandidateResume(cycleId, scheduleId)
    .then((res: any) => (res?.data ?? null))
    .catch((e) => {
      // 失败不留缓存，否则一次网络抖动会把这位候选人永久钉成「加载失败」
      cache.delete(key);
      throw e;
    });
  cache.set(key, task);
  return task;
}

/** 后台预取，不关心结果也不抛错 —— 用户点到时就已经在缓存里了 */
export function prefetchCandidateResume(cycleId: number, scheduleId: number): void {
  const key = keyOf(cycleId, scheduleId);
  if (cache.has(key)) return;
  void loadCandidateResume(cycleId, scheduleId).catch(() => { /* 预取失败无所谓，真打开时会重试 */ });
}

/** 命中判断：给 UI 用（比如跳转按钮标出哪几位已就绪），不触发请求 */
export function isCandidateResumeCached(cycleId: number, scheduleId: number): boolean {
  return cache.has(keyOf(cycleId, scheduleId));
}

/** 清空缓存。切换周期时调用，避免跨周期串数据 */
export function clearCandidateResumeCache(): void {
  cache.clear();
}
