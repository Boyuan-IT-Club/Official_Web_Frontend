import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import CycleUpcomingNotice from '../CycleUpcomingNotice';

const TODAY = new Date(2026, 8, 3);   // 2026-09-03

describe('招募周期预告', () => {
  it('说清「还没开始」和「什么时候开始」', () => {
    render(
      <CycleUpcomingNotice
        cycleName="2026 春季招新"
        startDate="2026-09-10"
        endDate="2026-09-30"
        today={TODAY}
      />,
    );
    expect(screen.getByText('2026 春季招新')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('天后开启')).toBeInTheDocument();
    expect(screen.getByText('9月10日 — 9月30日')).toBeInTheDocument();
    expect(screen.getByText(/还未开始/)).toBeInTheDocument();
  });

  it('没有开始日期时不显示倒计时，也不崩', () => {
    render(<CycleUpcomingNotice cycleName="下一届" today={TODAY} />);
    expect(screen.getByText('时间待定')).toBeInTheDocument();
    expect(screen.queryByText('天后开启')).not.toBeInTheDocument();
  });

  it('没有周期名时用兜底名称，不显示空标题', () => {
    render(<CycleUpcomingNotice startDate="2026-09-10" today={TODAY} />);
    expect(screen.getByText('下一届招新')).toBeInTheDocument();
  });

  it('表单还没配好时给一句提示', () => {
    // 管理员多半会先用学生视角点进来看预告长什么样，
    // 那时发现表单没配，比开放当天才发现好得多
    render(<CycleUpcomingNotice startDate="2026-09-10" fieldCount={0} today={TODAY} />);
    expect(screen.getByText(/报名表单还在准备中/)).toBeInTheDocument();
  });

  it('表单已配好时不出现那句提示', () => {
    render(<CycleUpcomingNotice startDate="2026-09-10" fieldCount={12} today={TODAY} />);
    expect(screen.queryByText(/报名表单还在准备中/)).not.toBeInTheDocument();
  });

  it('返回按钮只在给了回调时出现', () => {
    const onBack = jest.fn();
    const { rerender } = render(<CycleUpcomingNotice startDate="2026-09-10" today={TODAY} />);
    expect(screen.queryByText('返回首页')).not.toBeInTheDocument();

    rerender(<CycleUpcomingNotice startDate="2026-09-10" today={TODAY} onBack={onBack} />);
    fireEvent.click(screen.getByText('返回首页'));
    expect(onBack).toHaveBeenCalled();
  });

  it('整屏不出现任何可投递的入口', () => {
    // 这一屏的全部意义就是「还不能投」，出现填写/提交入口是自相矛盾的
    const { container } = render(
      <CycleUpcomingNotice cycleName="X" startDate="2026-09-10" today={TODAY} onBack={jest.fn()} />,
    );
    // 断言交互元素而不是文案：正文里本来就有「暂时不能投递简历」这句
    expect(container.querySelectorAll('input, textarea, select')).toHaveLength(0);

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveTextContent('返回首页');
  });
});
