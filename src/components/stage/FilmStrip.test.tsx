// 胶片条的游动标尺交互。最要紧的一条：拖动时只预览、松手才切人 ——
// 评价工作台的 onSelect 是整页路由跳转（还会重连协同文档），拖过二十人不能跳二十次。
import React from 'react';
import { act, render, screen } from '@testing-library/react';
import FilmStrip, { FilmChip } from './FilmStrip';

const people = (n: number, selectedIndex = 0): FilmChip[] =>
  Array.from({ length: n }, (_, i) => ({
    key: i + 1,
    name: `同学${i + 1}`,
    tag: i % 2 ? '未评' : '80',
    tagTone: i % 2 ? 'muted' : 'good',
    selected: i === selectedIndex,
  }));

/** jsdom 不做布局：给标尺一个 1000px 宽、左边从 0 开始的尺寸 */
const sizeRuler = () => {
  const ruler = screen.getByTestId('film-ruler');
  ruler.getBoundingClientRect = () => ({
    left: 0, top: 0, right: 1000, bottom: 22, width: 1000, height: 22, x: 0, y: 0, toJSON: () => ({}),
  });
  return ruler;
};

/** React 在根上监听 pointer* 原生事件；jsdom 没有 PointerEvent，用同名 MouseEvent 派发 */
const pointer = (el: Element, type: string, clientX: number) => {
  act(() => {
    el.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX }));
  });
};

describe('胶片条的游动标尺', () => {
  it('每人一根刻度', () => {
    const { container } = render(<FilmStrip items={people(57)} onSelect={() => {}} />);
    expect(container.querySelectorAll('.film-ruler__tick')).toHaveLength(57);
  });

  it('人很多时合并成格，刻度数不超过 150', () => {
    const { container } = render(<FilmStrip items={people(400)} onSelect={() => {}} />);
    const ticks = container.querySelectorAll('.film-ruler__tick');
    expect(ticks.length).toBeLessThanOrEqual(150);
    expect(container.querySelectorAll('.film-ruler__tick.is-bucket').length).toBeGreaterThan(0);
  });

  it('ruler={false} 时不画标尺（打分舞台）、卡片照常可点', () => {
    const onSelect = jest.fn();
    const { container } = render(<FilmStrip items={people(57)} ruler={false} onSelect={onSelect} />);
    expect(screen.queryByTestId('film-ruler')).toBeNull();
    // 外壳带上 no-ruler 标记：据此恢复原生滚动条和原来的底边距
    expect(container.querySelector('.film--no-ruler')).toBeInTheDocument();
    act(() => { screen.getByText('同学5').closest('button')!.click(); });
    expect(onSelect).toHaveBeenCalledWith(5);
  });

  it('默认带标尺 —— 预录取与面试评价两个舞台不受打分舞台的开关影响', () => {
    const { container } = render(<FilmStrip items={people(10)} onSelect={() => {}} />);
    expect(screen.getByTestId('film-ruler')).toBeInTheDocument();
    expect(container.querySelector('.film--no-ruler')).toBeNull();
  });

  it('只有一个人时不画标尺 —— 没什么可导航的', () => {
    render(<FilmStrip items={people(1)} onSelect={() => {}} />);
    expect(screen.queryByTestId('film-ruler')).toBeNull();
  });

  it('点一下刻度：松手时切到那一位', () => {
    const onSelect = jest.fn();
    render(<FilmStrip items={people(10)} onSelect={onSelect} />);
    const ruler = sizeRuler();

    pointer(ruler, 'pointerdown', 750);   // 1000px 宽、10 人 → 第 8 位（下标 7）
    expect(onSelect).not.toHaveBeenCalled();   // 按下时还不切
    pointer(ruler, 'pointerup', 750);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(8);
  });

  it('拖过一串人：途中一次都不切，松手只切一次、切到松手的那位', () => {
    const onSelect = jest.fn();
    render(<FilmStrip items={people(10)} onSelect={onSelect} />);
    const ruler = sizeRuler();

    pointer(ruler, 'pointerdown', 50);
    [150, 250, 350, 450, 550].forEach((x) => pointer(ruler, 'pointermove', x));
    expect(onSelect).not.toHaveBeenCalled();

    pointer(ruler, 'pointerup', 950);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(10);
  });

  it('拖动被系统打断（pointercancel）就作废，不替用户做选择', () => {
    const onSelect = jest.fn();
    render(<FilmStrip items={people(10)} onSelect={onSelect} />);
    const ruler = sizeRuler();

    pointer(ruler, 'pointerdown', 300);
    pointer(ruler, 'pointercancel', 300);
    pointer(ruler, 'pointerup', 300);   // 之后的松手不能再生效

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('悬停时浮出「第几位 · 名字 · 状态」，移开就收起', () => {
    render(<FilmStrip items={people(10)} onSelect={() => {}} />);
    const ruler = sizeRuler();

    pointer(ruler, 'pointermove', 350);   // 第 4 位
    expect(screen.getByText('4 / 10 · 同学4 · 未评')).toBeInTheDocument();

    // React 的 onPointerLeave 不监听原生 pointerleave，而是由 pointerout +
    // relatedTarget 推算：指针从标尺移到标尺外的元素上
    act(() => {
      ruler.dispatchEvent(new MouseEvent('pointerout', { bubbles: true, relatedTarget: document.body }));
    });
    expect(screen.queryByText(/ \/ 10 · /)).toBeNull();
  });

  it('只是悬停划过不会切人', () => {
    const onSelect = jest.fn();
    render(<FilmStrip items={people(10)} onSelect={onSelect} />);
    const ruler = sizeRuler();
    [100, 400, 800].forEach((x) => pointer(ruler, 'pointermove', x));
    pointer(ruler, 'pointerup', 800);   // 没按下过就松手：不算点击
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('上方的卡片照常可点 —— 标尺是加出来的通道，不是替换', () => {
    const onSelect = jest.fn();
    render(<FilmStrip items={people(5)} onSelect={onSelect} />);
    act(() => { screen.getByText('同学3').closest('button')!.click(); });
    expect(onSelect).toHaveBeenCalledWith(3);
  });
});
