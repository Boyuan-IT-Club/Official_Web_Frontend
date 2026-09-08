import { myScoreOf, scorerLabel } from './scorePanel';

const entries = [
  { scorerId: 1, scorerName: '张三', score: 80 },
  { scorerId: 2, scorerName: null, score: 90 },
];

describe('多人打分面板逻辑', () => {
  it('输入框回显我打过的分，userId 字符串/数字都能匹配', () => {
    expect(myScoreOf(entries, 1)).toBe(80);
    expect(myScoreOf(entries, '1')).toBe(80);
  });

  it('没打过分回显空，而不是别人的分', () => {
    expect(myScoreOf(entries, 3)).toBeUndefined();
    expect(myScoreOf([], 1)).toBeUndefined();
    expect(myScoreOf(undefined, 1)).toBeUndefined();
    expect(myScoreOf(entries, undefined)).toBeUndefined();
  });

  it('打分人注销后显示「已注销」而不是空白', () => {
    expect(scorerLabel(entries[0])).toBe('张三');
    expect(scorerLabel(entries[1])).toBe('已注销');
  });
});
