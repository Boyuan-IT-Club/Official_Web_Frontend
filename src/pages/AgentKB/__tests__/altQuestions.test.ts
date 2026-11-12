import { ALT_QUESTIONS_MAX, normalizeAltQuestions } from '../altQuestions';

describe('附加问法的整理', () => {
  it('去掉首尾空白、丢掉空的、去重并保留先出现的', () => {
    expect(normalizeAltQuestions(['  入社要交钱吗 ', '', '   ', '会费多少', '入社要交钱吗']))
      .toEqual(['入社要交钱吗', '会费多少']);
  });

  it('旧版 Agent 不返回这个字段,或形状不对:按没有处理', () => {
    expect(normalizeAltQuestions(undefined)).toEqual([]);
    expect(normalizeAltQuestions(null)).toEqual([]);
    expect(normalizeAltQuestions('入社要交钱吗')).toEqual([]);
    expect(normalizeAltQuestions([1, null, { q: 'x' }, '会费多少'])).toEqual(['会费多少']);
  });

  it('超过上限的截掉(接口至多收 20 条,多了会被拒)', () => {
    const many = Array.from({ length: 25 }, (_, i) => `问法 ${i}`);
    expect(normalizeAltQuestions(many)).toHaveLength(ALT_QUESTIONS_MAX);
    expect(normalizeAltQuestions(many)[0]).toBe('问法 0');
  });
});
