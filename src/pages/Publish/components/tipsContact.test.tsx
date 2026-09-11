import React from 'react';
import { render, screen } from '@testing-library/react';
import TipsModal from '@/pages/Publish/components/TipsModal';

// 负责人联系方式此前只有未录取邮件在用，投递阶段想找人问反而没处看。
// 这两条锁住「配了就显示、没配不留空块」。
describe('填写提示里的负责人联系方式', () => {
  const tips = [{ title: '邮箱', content: '请填常用邮箱' }];

  it('周期配了联系方式就显示出来', () => {
    render(<TipsModal open onClose={jest.fn()} tips={tips} contactInfo="oyty@boyuan.club" />);
    expect(screen.getByText('本届负责人')).toBeInTheDocument();
    expect(screen.getByText('oyty@boyuan.club')).toBeInTheDocument();
  });

  it('没配或只有空白时整块不渲染，不留一个空壳', () => {
    const { rerender, container } = render(<TipsModal open onClose={jest.fn()} tips={tips} />);
    expect(container.querySelector('.tips-modal__contact')).toBeNull();
    rerender(<TipsModal open onClose={jest.fn()} tips={tips} contactInfo="   " />);
    expect(container.querySelector('.tips-modal__contact')).toBeNull();
  });
});
