// #192:轮询批次隔离单测——交错历史任务、错误归属、部分完成、job 缺席。
import { applyBatchPoll } from './evaluationPolling';

describe('applyBatchPoll(#192 批次隔离)', () => {
  it('历史完成 job 不把新批次提前判定为终态', () => {
    const active = { 101: '9001', 102: '9002' };
    const jobs = [
      { job_id: 1, status: 'succeeded', resume_id: 8001 }, // 历史 job(非本次)
      { job_id: 2, status: 'failed', resume_id: 8002, error: '历史失败' },
      { job_id: 101, status: 'running', resume_id: 9001 },
      { job_id: 102, status: 'pending', resume_id: 9002 },
    ];
    const out = applyBatchPoll(active, jobs);
    expect(out.terminalResumeIds).toEqual([]);
    expect(out.failures).toEqual([]);
    expect(out.remaining).toEqual({ 101: '9001', 102: '9002' });
  });

  it('错误按 job 归属具体简历,不用最后一条失败覆盖全部', () => {
    const active = { 201: '9101', 202: '9102', 203: '9103' };
    const jobs = [
      { job_id: 201, status: 'failed', resume_id: 9101, error: '模型超时' },
      { job_id: 202, status: 'succeeded', resume_id: 9102 },
      { job_id: 203, status: 'failed', resume_id: 9103, error: '归属错位' },
    ];
    const out = applyBatchPoll(active, jobs);
    expect(out.terminalResumeIds.sort()).toEqual(['9101', '9102', '9103']);
    expect(out.failures).toEqual([
      { resumeId: '9101', error: '模型超时' },
      { resumeId: '9103', error: '归属错位' },
    ]);
    expect(out.remaining).toEqual({});
  });

  it('交错完成:只有本批终态的 resume 被清除,其余保持活跃', () => {
    const active = { 301: '9201', 302: '9202' };
    const jobs = [
      { job_id: 301, status: 'succeeded', resume_id: 9201 },
      { job_id: 999, status: 'failed', resume_id: 7777, error: '历史失败不归属' },
    ];
    const out = applyBatchPoll(active, jobs);
    expect(out.terminalResumeIds).toEqual(['9201']);
    expect(out.failures).toEqual([]);
    expect(out.remaining).toEqual({ 302: '9202' });
  });

  it('job 缺席执行面(翻出窗口)保留活跃,失败无 error 时给默认文案', () => {
    const active = { 401: '9301', 402: '9302' };
    const jobs = [{ job_id: 402, status: 'failed', resume_id: 9302 }];
    const out = applyBatchPoll(active, jobs);
    expect(out.terminalResumeIds).toEqual(['9302']);
    expect(out.failures).toEqual([{ resumeId: '9302', error: '初筛失败' }]);
    expect(out.remaining).toEqual({ 401: '9301' });
  });
});
