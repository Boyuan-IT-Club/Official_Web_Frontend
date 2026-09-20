import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import MemberNoApplyNotice from '../MemberNoApplyNotice';

describe('投递页社员态', () => {
  it('整页只说「你已是社员」，不渲染任何简历字段', () => {
    const { container } = render(<MemberNoApplyNotice />);
    expect(screen.getByText('你已经是博远的社员')).toBeInTheDocument();
    // 以前这里是薄提示条 + 底下一整份简历（多半还是刚建出来的空草稿）
    expect(screen.queryByText(/未填写/)).not.toBeInTheDocument();
    // 「草稿」是内部概念，整屏都不该出现——正文里那句「也不会再为你建草稿」
    // 已经去掉，所以这里可以直接断言整个词不存在，比只挡旧标签更严
    expect(screen.queryByText(/草稿/)).not.toBeInTheDocument();
    expect(container.querySelectorAll('input, textarea, select')).toHaveLength(0);
  });

  it('有名字时对人说话', () => {
    render(<MemberNoApplyNotice name="丁华烨" />);
    expect(screen.getByText('丁华烨，你已经是博远的社员')).toBeInTheDocument();
  });

  it('正文只说「这页没你要填的」，不解释系统怎么实现的', () => {
    render(<MemberNoApplyNotice />);
    expect(
      screen.getByText('简历投递是给还没加入的同学准备的，这一页没有需要你填的内容。'),
    ).toBeInTheDocument();
  });

  it('投过简历的社员给「看我的投递记录」入口', () => {
    const onViewHistory = jest.fn();
    render(<MemberNoApplyNotice historyCount={3} onViewHistory={onViewHistory} />);
    fireEvent.click(screen.getByText('看我的投递记录'));
    expect(onViewHistory).toHaveBeenCalled();
  });

  it('从没投过的社员不给历史入口——点进去是空的', () => {
    render(<MemberNoApplyNotice historyCount={0} />);
    expect(screen.queryByText('看我的投递记录')).not.toBeInTheDocument();
  });

  it('返回首页按钮只在给了回调时出现', () => {
    const onBack = jest.fn();
    const { rerender } = render(<MemberNoApplyNotice />);
    expect(screen.queryByText('返回首页')).not.toBeInTheDocument();

    rerender(<MemberNoApplyNotice onBack={onBack} />);
    fireEvent.click(screen.getByText('返回首页'));
    expect(onBack).toHaveBeenCalled();
  });

  it('把「想参与招新工作」指向管理端，而不是这一页', () => {
    render(<MemberNoApplyNotice />);
    expect(screen.getByText(/开通对应权限/)).toBeInTheDocument();
  });
});
