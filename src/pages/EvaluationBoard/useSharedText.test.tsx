import { act, renderHook } from '@testing-library/react';
import { useSharedText } from './collab';

/**
 * 评价舞台换人时，评语框显示的还是上一位的文字（线上报的 bug）。
 *
 * 原因：这个 hook 只在协同文档 version 变化时重读，而换人时文档没有任何变化，
 * version 原地不动。分数不走 hook、每次渲染直读文档，所以「数字在变、文字不变」。
 * 更要命的是 state 里的文字同时就是待写入的值：有人在这个状态下补一个字，
 * 写出去的是「上一位的全文 + 这次的改动」，会盖掉当前这位的评语。
 */
describe('useSharedText 跟着格子走', () => {
  const setup = (cells: Record<string, string>) => {
    const write = jest.fn((cell: string, text: string) => { cells[cell] = text; });
    return renderHook(
      ({ cell, version }: { cell: string; version: number }) => useSharedText(
        () => cells[cell] ?? '',
        (text) => write(cell, text),
        version,
        cell,
      ),
      { initialProps: { cell: 'a', version: 0 } },
    );
  };

  it('换人后显示新那一位的评语，而不是上一位的', () => {
    const { result, rerender } = setup({ a: '甲的评语', b: '乙的评语' });
    expect(result.current[0]).toBe('甲的评语');

    // 换人：文档没变，version 原地不动
    rerender({ cell: 'b', version: 0 });

    expect(result.current[0]).toBe('乙的评语');
  });

  it('新那一位还没人写时显示空，不把上一位的文字带过去', () => {
    const { result, rerender } = setup({ a: '甲的评语' });
    rerender({ cell: 'b', version: 0 });
    expect(result.current[0]).toBe('');
  });

  it('自己刚写完就换人，上一位的文字不会被写进新那一位的格子', () => {
    const cells: Record<string, string> = { a: '', b: '乙的评语' };
    const { result, rerender } = renderHook(
      ({ cell, version }: { cell: string; version: number }) => useSharedText(
        () => cells[cell] ?? '',
        (text) => { cells[cell] = text; },
        version,
        cell,
      ),
      { initialProps: { cell: 'a', version: 0 } },
    );

    act(() => result.current[1]('我写的内容'));
    expect(cells.a).toBe('我写的内容');

    rerender({ cell: 'b', version: 0 });
    expect(result.current[0]).toBe('乙的评语');

    // 换人后再补一个字，只能改到乙自己的格子，且不含甲的内容
    act(() => result.current[1]('乙的评语。'));
    expect(cells.b).toBe('乙的评语。');
    expect(cells.a).toBe('我写的内容');
  });

  it('同一格里别人改了内容，仍按 version 同步过来', () => {
    const cells: Record<string, string> = { a: '原文' };
    const { result, rerender } = renderHook(
      ({ cell, version }: { cell: string; version: number }) => useSharedText(
        () => cells[cell] ?? '', () => {}, version, cell,
      ),
      { initialProps: { cell: 'a', version: 0 } },
    );

    cells.a = '同事改过的内容';
    rerender({ cell: 'a', version: 1 });

    expect(result.current[0]).toBe('同事改过的内容');
  });

  it('自己正在输入时，不被自己写回的同一份内容打断', () => {
    const cells: Record<string, string> = { a: '' };
    const { result, rerender } = renderHook(
      ({ cell, version }: { cell: string; version: number }) => useSharedText(
        () => cells[cell] ?? '',
        (text) => { cells[cell] = text; },
        version,
        cell,
      ),
      { initialProps: { cell: 'a', version: 0 } },
    );

    act(() => result.current[1]('正在输入'));
    rerender({ cell: 'a', version: 1 });

    expect(result.current[0]).toBe('正在输入');
  });
});
