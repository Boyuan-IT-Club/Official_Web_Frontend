import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import TipsModal from '../TipsModal';

const TIPS = [
  { title: '隐私保护', content: '信息严格保密' },
  { title: '照片', content: '请上传免冠正面照' },
];

describe('填写提示弹窗', () => {
  it('打开时列出全部提示，并带序号', () => {
    render(<TipsModal open onClose={jest.fn()} tips={TIPS} />);
    expect(screen.getByText('填写提示')).toBeInTheDocument();
    TIPS.forEach((t) => {
      expect(screen.getByText(t.title)).toBeInTheDocument();
      expect(screen.getByText(t.content)).toBeInTheDocument();
    });
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('关闭按钮触发 onClose', () => {
    const onClose = jest.fn();
    render(<TipsModal open onClose={onClose} tips={TIPS} />);
    // antd 给纯中文按钮插空格，按正则匹配
    fireEvent.click(screen.getByRole('button', { name: /知道了/ }));
    expect(onClose).toHaveBeenCalled();
  });

  it('未打开时不渲染内容', () => {
    render(<TipsModal open={false} onClose={jest.fn()} tips={TIPS} />);
    expect(screen.queryByText('隐私保护')).not.toBeInTheDocument();
  });

  it('提示为空时不崩', () => {
    render(<TipsModal open onClose={jest.fn()} tips={[]} />);
    expect(screen.getByText('填写提示')).toBeInTheDocument();
  });
});
