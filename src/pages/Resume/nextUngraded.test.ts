// 「下一位」的选人逻辑。
//
// 这两个函数现在只管**本页内向后找**，不回绕 —— 回绕与翻页由组件负责，
// 因为只有它知道总页数、也只有它能去取下一页。
// 原来它们在本页内回绕，于是翻到页尾会跳回本页第一个人，
// 表现就是用户报的「同一页无限循环」。
import {
  findNextSequential, findNextUngraded, findNextInPage, pagesToScan, ResumeItem,
} from './index';

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

  it('本页走到末尾返回 null —— 不再绕回本页开头，交给组件去翻页', () => {
    const list = [r(1, null), r(2, 88), r(3, 70)];
    expect(findNextUngraded(list, list[2])).toBeNull();
  });

  it('前面有未打分的也不往回找 —— 回绕是组件按整个结果集做的，不是本页', () => {
    const list = [r(1, null), r(2, 88), r(3, 70)];
    expect(findNextUngraded(list, list[1])).toBeNull();
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

describe('顺序浏览的下一位（含已打分）', () => {
  it('已打过分的人也会被翻到——复查场景不被「未打分」过滤挡住', () => {
    const list = [r(1, 80), r(2, 90), r(3, null)];
    expect(findNextSequential(list, list[0])?.resumeId).toBe(2);
  });

  it('本页末尾返回 null —— 这正是「同一页无限循环」的修复点', () => {
    const list = [r(1, 80), r(2, 90)];
    expect(findNextSequential(list, list[1])).toBeNull();
  });

  it('列表只有当前一个人时返回 null，而不是绕回自己', () => {
    const list = [r(1, 80)];
    expect(findNextSequential(list, list[0])).toBeNull();
    expect(findNextSequential([], list[0])).toBeNull();
  });
});

describe('findNextInPage 的通用行为', () => {
  it('自定义条件：只找分数低于 60 的', () => {
    const list = [r(1, 90), r(2, 30), r(3, 20)];
    const low = (x: ResumeItem) => ((x as any).resumeScore ?? 100) < 60;
    expect(findNextInPage(list, list[0], low)?.resumeId).toBe(2);
  });

  it('永远排除自己，即使自己符合条件', () => {
    const list = [r(1, null), r(2, 80)];
    expect(findNextInPage(list, list[0], () => true)?.resumeId).toBe(2);
    expect(findNextInPage([r(1, null)], r(1, null))).toBeNull();
  });
});

describe('本页没有下一位时该翻哪几页', () => {
  it('顺序浏览只往后翻，到最后一页为止', () => {
    expect(pagesToScan(1, 3, false)).toEqual([2, 3]);
    expect(pagesToScan(2, 3, false)).toEqual([3]);
  });

  it('顺序浏览在最后一页返回空 —— 不再回绕，这就是「同一页无限循环」的修复', () => {
    expect(pagesToScan(3, 3, false)).toEqual([]);
  });

  it('只有一页时两种模式都不用翻页', () => {
    expect(pagesToScan(1, 1, false)).toEqual([]);
    expect(pagesToScan(1, 1, true)).toEqual([1]);
  });

  it('找未打分的会回绕：往后翻完再从第 1 页扫回来', () => {
    expect(pagesToScan(2, 3, true)).toEqual([3, 1, 2]);
    expect(pagesToScan(3, 3, true)).toEqual([1, 2, 3]);
  });

  it('回绕也只扫一圈，不会无限翻下去', () => {
    const scanned = pagesToScan(2, 4, true);
    expect(scanned).toEqual([3, 4, 1, 2]);
    expect(new Set(scanned).size).toBe(scanned.length);
  });
});
