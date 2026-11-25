// 缓存最容易错的两点：并发去重、失败别留缓存。
import {
  clearCandidateResumeCache,
  loadCandidateResume,
} from './resumeCache';
import { getCandidateResume } from '../../api/manage/interviewEvaluation';

jest.mock('../../api/manage/interviewEvaluation', () => ({
  getCandidateResume: jest.fn(),
}));

const mocked = getCandidateResume as jest.MockedFunction<any>;

describe('候选人简历缓存', () => {
  beforeEach(() => {
    clearCandidateResumeCache();
    mocked.mockReset();
  });

  it('重新打开会重新鉴权', async () => {
    mocked.mockResolvedValue({ data: { resumeId: 7 } });

    const a = await loadCandidateResume(2, 11);
    const b = await loadCandidateResume(2, 11);

    expect(mocked).toHaveBeenCalledTimes(2);
    expect(a).toEqual({ resumeId: 7 });
    expect(b).toEqual({ resumeId: 7 });
  });

  it('并发打开同一位也只发一次请求（缓存的是 Promise 而不是结果）', async () => {
    let resolve!: (v: any) => void;
    mocked.mockReturnValue(new Promise((r) => { resolve = r; }));

    const p1 = loadCandidateResume(2, 12);
    const p2 = loadCandidateResume(2, 12);
    resolve({ data: { resumeId: 9 } });

    await expect(p1).resolves.toEqual({ resumeId: 9 });
    await expect(p2).resolves.toEqual({ resumeId: 9 });
    expect(mocked).toHaveBeenCalledTimes(1);
  });

  it('不同周期的同一 scheduleId 不串数据', async () => {
    mocked.mockImplementation((cycleId: number) =>
      Promise.resolve({ data: { resumeId: cycleId * 100 } }));

    await expect(loadCandidateResume(2, 5)).resolves.toEqual({ resumeId: 200 });
    await expect(loadCandidateResume(3, 5)).resolves.toEqual({ resumeId: 300 });
    expect(mocked).toHaveBeenCalledTimes(2);
  });

  it('失败不留缓存 —— 否则一次网络抖动会把这位永久钉成加载失败', async () => {
    mocked.mockRejectedValueOnce(new Error('网络抖动'));
    await expect(loadCandidateResume(2, 13)).rejects.toThrow('网络抖动');


    mocked.mockResolvedValueOnce({ data: { resumeId: 13 } });
    await expect(loadCandidateResume(2, 13)).resolves.toEqual({ resumeId: 13 });
  });

  it('清空缓存后重新请求', async () => {
    mocked.mockResolvedValue({ data: { resumeId: 30 } });
    await loadCandidateResume(2, 30);
    clearCandidateResumeCache();
    await loadCandidateResume(2, 30);
    expect(mocked).toHaveBeenCalledTimes(2);
  });
});
