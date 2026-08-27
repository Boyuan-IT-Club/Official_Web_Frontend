// 新手指引的行为守卫。
//
// 三条容易错的：
//   1. 首次登录（该账号没看过）才自动弹，看过就再也不烦人
//   2. 「看过」按端 + 账号记：同一台电脑换账号登录要重新判断
//   3. 顶栏入口随时能重看，不受「看过」标记影响
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useOnboardingTour } from './index';

const Demo: React.FC<{ userId?: string | number | null }> = ({ userId }) => {
  const tour = useOnboardingTour({
    mode: 'user',
    userId,
    title: '欢迎使用',
    intro: <p>这是使用说明</p>,
    steps: [{ selector: 'body', title: '第一步', description: '看看这里' }],
  });
  return (
    <div>
      {tour.node}
      <button type="button" onClick={tour.open}>使用指引</button>
    </div>
  );
};

const renderDemo = (userId?: string | number | null) => {
  const view = render(<Demo userId={userId} />);
  // 自动弹窗有 600ms 的等布局延迟
  act(() => { jest.advanceTimersByTime(700); });
  return view;
};

describe('新手指引', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('该账号首次进来 → 自动弹出使用说明', () => {
    renderDemo(7);
    expect(screen.getByText('这是使用说明')).toBeInTheDocument();
  });

  it('还没拿到 userId → 不弹（无从判断看没看过）', () => {
    renderDemo(undefined);
    expect(screen.queryByText('这是使用说明')).not.toBeInTheDocument();
  });

  it('点「先自己看看」关掉 → 记住已看过，下次不再自动弹', () => {
    const { unmount } = renderDemo(7);
    fireEvent.click(screen.getByText('先自己看看'));
    expect(localStorage.getItem('boyuan.tour.user.v1:7')).toBe('1');

    unmount();
    renderDemo(7);
    expect(screen.queryByText('这是使用说明')).not.toBeInTheDocument();
  });

  it('换一个账号登录 → 按新账号重新判断，照样弹', () => {
    localStorage.setItem('boyuan.tour.user.v1:7', '1');
    renderDemo(8);
    expect(screen.getByText('这是使用说明')).toBeInTheDocument();
  });

  it('点「开始导览」→ 说明关闭、分步导览打开，同样记为已看过', () => {
    renderDemo(7);
    fireEvent.click(screen.getByText('开始导览'));
    expect(screen.getByText('第一步')).toBeInTheDocument();
    expect(localStorage.getItem('boyuan.tour.user.v1:7')).toBe('1');
  });

  it('看过之后仍可从「使用指引」入口重看', () => {
    localStorage.setItem('boyuan.tour.user.v1:7', '1');
    renderDemo(7);
    expect(screen.queryByText('这是使用说明')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('使用指引'));
    expect(screen.getByText('这是使用说明')).toBeInTheDocument();
  });
});
