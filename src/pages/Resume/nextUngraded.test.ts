// 「下一位未打分」的选人逻辑。容易错的是回绕与「别绕回刚打完的人」。
import { findNextUngraded, ResumeItem } from './index';

const r = (id: number, score: number | null): ResumeItem =>
  ({ resumeId: id, status: 2, resumeScore: score } as unknown as ResumeItem);

describe('下一位未打分', () => {
  it('从当前位置往后找最近的未打分', () => {
    const list = [r(1, 80), r(2, null), r(3, null)];
    expect(findNextUngraded(list, list[1])?.resumeId).toBe(3);
  });

  it('跳过已打分的人', () => {
    const list = [r(1, null), r(2, 90), r(3, 75), r(4, null)];
    expect(findNextUngraded(list, list[0])?.resumeId).toBe(4);
  });

  it('走到末尾会绕回列表开头 —— 前面跳过的人还得处理', () => {
    const list = [r(1, null), r(2, 88), r(3, 70)];
    expect(findNextUngraded(list, list[2])?.resumeId).toBe(1);
  });

  it('全部打完返回 null', () => {
    const list = [r(1, 80), r(2, 90)];
    expect(findNextUngraded(list, list[0])).toBeNull();
  });

  it('只剩自己没打分时返回 null —— 不能绕回刚打完的人自己', () => {
    const list = [r(1, 80), r(2, null), r(3, 90)];
    expect(findNextUngraded(list, list[1])).toBeNull();
  });

  it('0 分算已打分，不能当成未打分再转回去', () => {
    const list = [r(1, 0), r(2, 60)];
    expect(findNextUngraded(list, list[1])).toBeNull();
  });

  it('当前这位不在列表里（比如换了筛选）→ 从头找', () => {
    const list = [r(1, 70), r(2, null)];
    expect(findNextUngraded(list, r(99, null))?.resumeId).toBe(2);
  });

  it('空列表或无当前项都返回 null，不抛错', () => {
    expect(findNextUngraded([], r(1, null))).toBeNull();
    expect(findNextUngraded([r(1, null)], null)).toBeNull();
  });
});
