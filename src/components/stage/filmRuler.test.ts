// 游动标尺的纯计算：刻度怎么切、合并后什么颜色、指针落在谁身上。
import { buildTicks, indexAtRatio, MAX_TICKS, visibleWindow } from './filmRuler';

const chip = (tagTone: 'good' | 'now' | 'warn' | 'muted', selected = false) => ({ tagTone, selected });

describe('刻度：每人一根', () => {
  it('人数不多时一人一根，颜色就是他自己的状态', () => {
    const ticks = buildTicks([chip('good'), chip('muted'), chip('warn')]);
    expect(ticks).toHaveLength(3);
    expect(ticks.map((t) => t.tone)).toEqual(['good', 'muted', 'warn']);
    expect(ticks.every((t) => t.start === t.end)).toBe(true);
  });

  it('标出当前这位', () => {
    const ticks = buildTicks([chip('good'), chip('muted', true), chip('good')]);
    expect(ticks.map((t) => t.selected)).toEqual([false, true, false]);
  });

  it('没有状态的按「未完成」画，不会凭空变成绿色', () => {
    expect(buildTicks([{}])[0].tone).toBe('muted');
  });

  it('空列表不画刻度', () => {
    expect(buildTicks([])).toEqual([]);
  });

  it('刚好 150 人还是一人一根', () => {
    expect(buildTicks(Array.from({ length: MAX_TICKS }, () => chip('good')))).toHaveLength(MAX_TICKS);
  });
});

describe('刻度：人多时合并成格', () => {
  it('超过 150 人就合并，格数不超过上限', () => {
    const ticks = buildTicks(Array.from({ length: 400 }, () => chip('good')));
    expect(ticks.length).toBeLessThanOrEqual(MAX_TICKS);
    expect(ticks.length).toBeGreaterThan(1);
  });

  it('合并后首尾相接、不漏人也不重复', () => {
    const n = 377;
    const ticks = buildTicks(Array.from({ length: n }, () => chip('good')));
    expect(ticks[0].start).toBe(0);
    expect(ticks[ticks.length - 1].end).toBe(n - 1);
    for (let i = 1; i < ticks.length; i += 1) {
      expect(ticks[i].start).toBe(ticks[i - 1].end + 1);
    }
  });

  it('一格里只要有人没评，就画成未评 —— 已评的绿色不能盖住没评的', () => {
    const ticks = buildTicks([chip('good'), chip('good'), chip('muted'), chip('good')], 2);
    expect(ticks.map((t) => t.tone)).toEqual(['good', 'muted']);
  });

  it('需要注意的最优先 —— 评价工作台的「面完未评」不能被合并吞掉', () => {
    const ticks = buildTicks([chip('good'), chip('muted'), chip('now'), chip('warn')], 1 /* 全并成一格 */);
    expect(ticks).toHaveLength(1);
    expect(ticks[0].tone).toBe('warn');
  });

  it('进行中压过已完成', () => {
    expect(buildTicks([chip('good'), chip('now')], 1)[0].tone).toBe('now');
  });

  it('当前这位落在哪一格，哪一格就标为选中', () => {
    const ticks = buildTicks([chip('good'), chip('good'), chip('good', true), chip('good')], 2);
    expect(ticks.map((t) => t.selected)).toEqual([false, true]);
  });
});

describe('指针落点 → 第几个人', () => {
  it('按比例换算，精确到人（合并显示只是画法）', () => {
    expect(indexAtRatio(0, 57)).toBe(0);
    expect(indexAtRatio(0.5, 57)).toBe(28);
    expect(indexAtRatio(0.999, 57)).toBe(56);
  });

  it('拖出标尺两端时钉在第一位 / 最后一位', () => {
    expect(indexAtRatio(-0.3, 57)).toBe(0);
    expect(indexAtRatio(1, 57)).toBe(56);
    expect(indexAtRatio(1.7, 57)).toBe(56);
  });

  it('没人或量不出宽度时返回 -1，不去选一个不存在的人', () => {
    expect(indexAtRatio(0.5, 0)).toBe(-1);
    expect(indexAtRatio(NaN, 57)).toBe(-1);
  });
});

describe('蓝框：胶片条当前看得到的那一段', () => {
  it('按滚动位置折算成百分比', () => {
    expect(visibleWindow(0, 1000, 5000)).toEqual({ left: 0, width: 20 });
    expect(visibleWindow(2500, 1000, 5000)).toEqual({ left: 50, width: 20 });
  });

  it('滚到头不会超出标尺', () => {
    const w = visibleWindow(4500, 1000, 5000);
    expect(w.left + w.width).toBeLessThanOrEqual(100);
  });

  it('一屏放得下时蓝框铺满', () => {
    expect(visibleWindow(0, 1200, 900)).toEqual({ left: 0, width: 100 });
  });
});
