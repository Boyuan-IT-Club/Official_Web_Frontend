// 退出打分舞台后落在哪。以前一律落进「进舞台时那一位」的详情页，
// 从总览进去的也一样，得再点一次返回。
import { resolveStageExit, ResumeItem } from './index';

const r = (id: number, score: number | null = null): ResumeItem =>
  ({ resumeId: id, status: 2, resumeScore: score } as unknown as ResumeItem);

describe('退出打分舞台', () => {
  it('从总览进的：回总览', () => {
    expect(resolveStageExit('list', r(7), [r(7, 88)])).toBeNull();
  });

  it('从某人详情页进的：回那个人的详情', () => {
    expect(resolveStageExit('detail', r(7), null)?.resumeId).toBe(7);
  });

  it('回详情时换上舞台里打的最新分 —— 不然详情页还显示进舞台前的旧分', () => {
    const back = resolveStageExit('detail', r(7, null), [r(3, 70), r(7, 92)]);
    expect((back as any).resumeScore).toBe(92);
  });

  it('全量队列里找不到那个人（取数失败只拿到当前页）就用进舞台时那份', () => {
    expect(resolveStageExit('detail', r(7), [r(1), r(2)])?.resumeId).toBe(7);
  });

  it('来源是详情但没有起点那一位（刷新丢了）：按总览处理', () => {
    expect(resolveStageExit('detail', null, [r(1)])).toBeNull();
  });
});
