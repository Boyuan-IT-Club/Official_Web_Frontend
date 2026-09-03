import React from 'react';
import { render, screen } from '@testing-library/react';
import UpcomingCycleBanner from '../UpcomingCycleBanner';

const TODAY = new Date(2026, 8, 3);   // 2026-09-03
const cycle = (over: any = {}) => ({
  cycleId: 9, cycleName: '2026 春季招新', academicYear: '2026-2027',
  startDate: '2026-09-10', endDate: '2026-09-30', fieldCount: 12, ...over,
});

describe('下一届招新预告条', () => {
  it('报出周期名与倒计时', () => {
    render(<UpcomingCycleBanner cycles={[cycle()]} today={TODAY} />);
    expect(screen.getByText('2026 春季招新')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('即将开放')).toBeInTheDocument();
  });

  it('没有下一届时不渲染任何东西', () => {
    const { container } = render(<UpcomingCycleBanner cycles={[]} today={TODAY} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('多届已排期时全部列出，最快的那届在最前并带倒计时', () => {
    // 原来只渲染 cycles[0]，管理员同时排了好几届时其余的凭空消失
    render(
      <UpcomingCycleBanner
        cycles={[cycle({ cycleName: '三天后', startDate: '2026-09-06' }),
                 cycle({ cycleId: 10, cycleName: '一个月后', startDate: '2026-10-03' })]}
        today={TODAY}
      />,
    );
    expect(screen.getByText('三天后')).toBeInTheDocument();
    expect(screen.getByText('一个月后')).toBeInTheDocument();
    expect(screen.getByText('共 2 届已排期')).toBeInTheDocument();

    // 只有最近那届给倒计时的完整措辞，其余压成一行
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText(/30 天后/)).toBeInTheDocument();
  });

  it('只有一届时不显示「共 N 届」', () => {
    render(<UpcomingCycleBanner cycles={[cycle()]} today={TODAY} />);
    expect(screen.queryByText(/共 .* 届已排期/)).not.toBeInTheDocument();
  });

  it('缺开始日期时只报日期待定，不硬凑倒计时', () => {
    render(<UpcomingCycleBanner cycles={[cycle({ startDate: '' })]} today={TODAY} />);
    expect(screen.getByText(/待定/)).toBeInTheDocument();
    expect(screen.queryByText(/还有/)).not.toBeInTheDocument();
  });

  it('不提供任何点进去投递的入口', () => {
    // 这届还没开始，出现可点的投递入口就是自相矛盾
    const { container } = render(<UpcomingCycleBanner cycles={[cycle()]} today={TODAY} />);
    expect(container.querySelectorAll('button, a')).toHaveLength(0);
  });
});
