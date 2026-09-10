// #192:初筛轮询批次隔离的纯函数核。
// 只观察本次会话提交产生的 job(activeJobResume: job_id → resume_id),
// 历史完成任务不参与批次判定;错误按 job 归属到具体简历,
// 不再用"最后一条失败"覆盖全部失败项。可单元测试(见 evaluationPolling.test.ts)。

export interface EvalJobLike {
  job_id: number | string;
  status: string;
  resume_id?: number | string;
  error?: string | null;
}

export interface BatchPollOutcome {
  /** 本轮到达终态的 resume_id(应从"初筛中"乐观标记清除) */
  terminalResumeIds: string[];
  /** 本轮失败的 (resume_id, 该 job 自己的错误文案) */
  failures: { resumeId: string; error: string }[];
  /** 仍在执行面的 job 子集(job_id → resume_id),替换调用方活跃集 */
  remaining: Record<string, string>;
}

export function applyBatchPoll(
  activeJobResume: Record<string, string>,
  jobs: EvalJobLike[],
): BatchPollOutcome {
  const byId = new Map<string, EvalJobLike>();
  for (const j of jobs) byId.set(String(j.job_id), j);
  const terminalResumeIds = new Set<string>();
  const failures: { resumeId: string; error: string }[] = [];
  const remaining: Record<string, string> = {};
  for (const [jobId, resumeId] of Object.entries(activeJobResume)) {
    const j = byId.get(jobId);
    if (!j) {
      // 执行面尚未出现(或翻出 200 条窗口):保留活跃,下轮再看
      remaining[jobId] = resumeId;
      continue;
    }
    if (j.status === 'succeeded' || j.status === 'failed') {
      terminalResumeIds.add(String(resumeId));
      if (j.status === 'failed') {
        failures.push({ resumeId: String(resumeId), error: j.error || '初筛失败' });
      }
    } else {
      remaining[jobId] = resumeId;
    }
  }
  return { terminalResumeIds: Array.from(terminalResumeIds), failures, remaining };
}
