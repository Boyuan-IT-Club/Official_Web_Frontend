import { CandidateResume, getCandidateResume } from '@/api/manage/interviewEvaluation';
import { getToken } from '@/utils';

const pending = new Map<string, Promise<CandidateResume | null>>();

/** 同一身份并发请求去重。请求结束即移除，下次打开时重新验证权限。 */
export function loadCandidateResume(cycleId: number, scheduleId: number): Promise<CandidateResume | null> {
  const key = `${getToken()}:${cycleId}:${scheduleId}`;
  const existing = pending.get(key);
  if (existing) return existing;
  const task = getCandidateResume(cycleId, scheduleId)
    .then(res => res?.data ?? null)
    .finally(() => { if (pending.get(key) === task) pending.delete(key); });
  pending.set(key, task);
  return task;
}

export function clearCandidateResumeCache(): void {
  pending.clear();
}
