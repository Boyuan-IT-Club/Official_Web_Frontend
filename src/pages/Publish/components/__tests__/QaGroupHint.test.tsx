import React from 'react';
import { render, screen } from '@testing-library/react';
import QaGroupHint from '../QaGroupHint';

describe('招新答疑群提示', () => {
  it('有二维码时渲染，并明说可以点开放大', () => {
    // 84px 的二维码用手机对着屏幕扫不出来；不写这句用户只会以为就这么大
    render(<QaGroupHint imageUrl="https://x/qr.png" remark="2026 招新答疑群" />);
    expect(screen.getByAltText('招新答疑群二维码')).toBeInTheDocument();
    expect(screen.getByText(/点击可放大/)).toBeInTheDocument();
    expect(screen.getByText(/2026 招新答疑群/)).toBeInTheDocument();
  });

  it('没有备注时用默认名称', () => {
    render(<QaGroupHint imageUrl="https://x/qr.png" />);
    expect(screen.getByText(/招新答疑群/)).toBeInTheDocument();
  });

  it('没配二维码时整块不渲染，不留空壳', () => {
    const { container } = render(<QaGroupHint imageUrl={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('二维码可点击预览（antd Image 而不是裸 img）', () => {
    // 裸 <img> 点不开也没有指针样式，想扫的人没有任何办法把它放大
    const { container } = render(<QaGroupHint imageUrl="https://x/qr.png" />);
    expect(container.querySelector('.ant-image')).toBeInTheDocument();
    expect(container.querySelector('.ant-image-mask')).toBeInTheDocument();
  });
});
