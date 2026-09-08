import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import NoOpenCycleNotice from '../NoOpenCycleNotice';

describe('投递页空状态', () => {
  it('没有招新时直说，不渲染任何简历字段', () => {
    const { container } = render(<NoOpenCycleNotice kind="no-recruitment" />);
    expect(screen.getByText('当前没有进行中的招新')).toBeInTheDocument();
    // 以前这一屏是一份空简历：「未填写姓名」「草稿（不可修改）」「能参加」
    expect(screen.queryByText(/未填写/)).not.toBeInTheDocument();
    expect(screen.queryByText(/草稿/)).not.toBeInTheDocument();
    expect(container.querySelectorAll('input, textarea, select')).toHaveLength(0);
  });

  it('这一届结束且没投过：标题带上周期名', () => {
    render(<NoOpenCycleNotice kind="ended-no-resume" cycleName="2025 秋季招新" />);
    expect(screen.getByText('2025 秋季招新 已结束')).toBeInTheDocument();
    expect(screen.getByText(/没有投递记录/)).toBeInTheDocument();
  });

  it('周期名缺失时用通用标题', () => {
    render(<NoOpenCycleNotice kind="ended-no-resume" />);
    expect(screen.getByText('这一届的招募已结束')).toBeInTheDocument();
  });

  it('列表拿不到时说「加载失败」并给刷新按钮，不冒充「没有招新」', () => {
    const onRetry = jest.fn();
    render(<NoOpenCycleNotice kind="cycles-unavailable" onRetry={onRetry} />);
    expect(screen.getByText('暂时无法获取招新信息')).toBeInTheDocument();
    expect(screen.queryByText(/没有进行中的招新/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('刷新重试'));
    expect(onRetry).toHaveBeenCalled();
  });

  it('其它两种不出现刷新按钮', () => {
    render(<NoOpenCycleNotice kind="no-recruitment" />);
    expect(screen.queryByText('刷新重试')).not.toBeInTheDocument();
  });

  it('历届投递单独列出，点击切换周期', () => {
    // 切换器少于两项就不渲染，用户唯一一份历史简历会没有入口
    const onPick = jest.fn();
    render(
      <NoOpenCycleNotice
        kind="no-recruitment"
        history={[{ cycleId: 3, cycleName: '2024 秋季招新' }]}
        onPickHistory={onPick}
      />,
    );
    expect(screen.getByText('查看历届投递')).toBeInTheDocument();
    fireEvent.click(screen.getByText('2024 秋季招新'));
    expect(onPick).toHaveBeenCalledWith(3);
  });

  it('没有历届投递时不渲染那一块', () => {
    render(<NoOpenCycleNotice kind="no-recruitment" history={[]} />);
    expect(screen.queryByText('查看历届投递')).not.toBeInTheDocument();
  });

  it('返回按钮只在给了回调时出现', () => {
    const onBack = jest.fn();
    const { rerender } = render(<NoOpenCycleNotice kind="no-recruitment" />);
    expect(screen.queryByText('返回首页')).not.toBeInTheDocument();
    rerender(<NoOpenCycleNotice kind="no-recruitment" onBack={onBack} />);
    fireEvent.click(screen.getByText('返回首页'));
    expect(onBack).toHaveBeenCalled();
  });
});
