import { buildExportData } from '../exportResume';

/**
 * 复现线上崩溃：TypeError: s.filter is not a function (exportResume.ts:34)
 *
 * 成因：某字段存的值是 123（不是 JSON 数组），parseJsonField 的 <string[]> 只是
 * 类型断言，JSON.parse 返回数字 123 后被 setTechStackItems 收下，
 * 到了这里 techStackItems.filter 就炸了，整页白屏（错误边界兜住）。
 *
 * 本函数是导出用的公共工具，不能因为调用方传了脏数据就崩。
 */
describe('buildExportData 对脏输入的容忍', () => {
  const mapping = { tech_stack: 18, name: 4 };
  const emptyMap = new Map<number, any>();
  const depts = { first: '', second: '' };

  it('techStackItems 不是数组时不抛异常（线上崩的就是这条）', () => {
    expect(() =>
      // 故意传数字，模拟 JSON.parse("123") 的结果流进来
      buildExportData(mapping, emptyMap, depts, 123 as any, ''),
    ).not.toThrow();
  });

  it.each([
    ['数字', 123],
    ['字符串', 'abc'],
    ['null', null],
    ['undefined', undefined],
    ['对象', { a: 1 }],
  ])('techStackItems 为 %s 时 techStack 退化为空数组', (_label, bad) => {
    const out = buildExportData(mapping, emptyMap, depts, bad as any, '');
    expect(Array.isArray(out.techStack)).toBe(true);
    expect(out.techStack).toEqual([]);
  });

  it('字段值本身不是 JSON 数组时，回退到传入的 items', () => {
    const map = new Map<number, any>([[18, { fieldValue: '123' }]]);
    const out = buildExportData(mapping, map, depts, ['Java', ''], '');
    expect(out.techStack).toEqual(['Java']);   // 过滤掉空串
  });

  it('字段值是合法 JSON 数组时优先用它', () => {
    const map = new Map<number, any>([[18, { fieldValue: '["C++","Go"]' }]]);
    const out = buildExportData(mapping, map, depts, ['忽略'], '');
    expect(out.techStack).toEqual(['C++', 'Go']);
  });
});
