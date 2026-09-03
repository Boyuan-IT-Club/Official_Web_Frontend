import React from 'react';
import { render, screen } from '@testing-library/react';
import StatusNotice from '../StatusNotice';

describe('状态条', () => {
  it('渲染标题与说明', () => {
    render(<StatusNotice title="本周期已停止投递" description="以下内容仅供查看。" />);
    expect(screen.getByText('本周期已停止投递')).toBeInTheDocument();
    expect(screen.getByText('以下内容仅供查看。')).toBeInTheDocument();
  });

  it('状态值渲染成等宽 chip，而不是埋进说明里', () => {
    // 「已提交（不可修改）」是整条里唯一要被一眼扫到的信息
    const { container } = render(
      <StatusNotice title="简历状态" badge="已提交（不可修改）" description="内容仅供查看。" />,
    );
    const badge = container.querySelector('code.status-notice__badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('已提交（不可修改）');
  });

  it('语气由 tone 决定，四档各有各的类名', () => {
    (['info', 'warning', 'success', 'muted'] as const).forEach((tone) => {
      const { container } = render(<StatusNotice tone={tone} title="x" />);
      expect(container.querySelector(`.status-notice.is-${tone}`)).toBeInTheDocument();
    });
  });

  it('内容左对齐——不继承外层标题区的居中', () => {
    // antd Alert 就是栽在这：message 跟着外层居中，description 却靠左，两行错位
    const { container } = render(<StatusNotice title="x" description="y" />);
    const el = container.querySelector('.status-notice') as HTMLElement;
    expect(getComputedStyle(el).textAlign === 'center').toBe(false);
  });

  it('没有说明与 chip 时只渲染标题，不留空节点', () => {
    const { container } = render(<StatusNotice title="只有标题" />);
    expect(container.querySelector('.status-notice__desc')).toBeNull();
    expect(container.querySelector('.status-notice__badge')).toBeNull();
  });
});
