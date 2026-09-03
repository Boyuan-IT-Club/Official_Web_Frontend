import React from 'react';
import { render, screen } from '@testing-library/react';
import CycleSwitcher from '../index';

const cycle = (over: any = {}) => ({
  cycleId: 1, cycleName: 'A', academicYear: '2026-2027',
  startDate: '2026-09-02', endDate: '2026-10-12', fieldCount: 20, ...over,
});

const renderList = (cycles: any[], extra: any = {}) =>
  render(<CycleSwitcher cycles={cycles} value={1} onChange={jest.fn()} {...extra} />);

describe('周期切换器的日期显示', () => {
  it('两头齐全时显示「起 ~ 止」', () => {
    renderList([cycle(), cycle({ cycleId: 2, cycleName: 'B' })]);
    expect(screen.getAllByText(/2026-09-02 ~ 2026-10-12/).length).toBe(2);
  });

  it('日期缺失时整行省掉，不留一个孤零零的「~」', () => {
    // 线上就是这样：所有卡片的日历图标后只剩一个 ~，
    // 因为组装列表时把 startDate/endDate 丢了
    const { container } = renderList([
      cycle({ startDate: undefined, endDate: undefined }),
      cycle({ cycleId: 2, cycleName: 'B', startDate: undefined, endDate: undefined }),
    ]);
    expect(container.querySelectorAll('.cycle-card__date')).toHaveLength(0);
    expect(container.textContent).not.toContain('~');
  });

  it('只有一头也不显示——半截日期比不显示更糟', () => {
    const { container } = renderList([
      cycle({ endDate: undefined }),
      cycle({ cycleId: 2, cycleName: 'B', endDate: undefined }),
    ]);
    expect(container.querySelectorAll('.cycle-card__date')).toHaveLength(0);
    expect(container.textContent).not.toContain('undefined');
  });

  it('只有一个周期时整个切换器不渲染', () => {
    // 没得切，多一个控件只是噪音
    const { container } = renderList([cycle()]);
    expect(container).toBeEmptyDOMElement();
  });
});
