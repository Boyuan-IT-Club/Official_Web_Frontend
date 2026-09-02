// 「返回」的行为。核心是别再造出 push/pop 混用的来回打转。
import { hasInAppHistory, safeBack } from '../safeBack';

const setIdx = (idx: unknown) => {
  Object.defineProperty(window, 'history', {
    configurable: true,
    value: { ...window.history, state: idx === undefined ? null : { idx } },
  });
};

describe('safeBack', () => {
  it('站内有上一页时走 pop，不 push 新历史', () => {
    setIdx(2);
    const navigate = jest.fn();
    safeBack(navigate as any, '/fallback');
    expect(navigate).toHaveBeenCalledWith(-1);
  });

  it('直接打开（idx=0）时 replace 到兜底，而不是把人退出本站', () => {
    setIdx(0);
    const navigate = jest.fn();
    safeBack(navigate as any, '/Activities');
    expect(navigate).toHaveBeenCalledWith('/Activities', { replace: true });
  });

  it('没有 history.state 时按「无来处」处理', () => {
    setIdx(undefined);
    expect(hasInAppHistory()).toBe(false);
  });

  it('idx 不是数字时不误判为有来处', () => {
    setIdx('2');
    expect(hasInAppHistory()).toBe(false);
  });

  it('兜底用 replace 而不是 push —— push 会再造出一条可往回走的历史，'
    + '正是活动页来回打转的根源', () => {
    setIdx(0);
    const navigate = jest.fn();
    safeBack(navigate as any, '/x');
    const [, opts] = navigate.mock.calls[0];
    expect(opts).toEqual({ replace: true });
  });
});
