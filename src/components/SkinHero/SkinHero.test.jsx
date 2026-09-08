import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SkinHero from './index';

// 版式变体的契约：不同 layout 渲染不同结构，classic/未知不渲染（页面用原横幅）
describe('SkinHero 版式变体', () => {
  it('classic 与未知版式返回空——默认皮肤的首屏由页面原有横幅负责', () => {
    const { container: c1 } = render(<SkinHero layout="classic" />);
    const { container: c2 } = render(<SkinHero layout="whatever" />);
    expect(c1.firstChild).toBeNull();
    expect(c2.firstChild).toBeNull();
  });

  it('split 渲染终端窗，CTA 可点', () => {
    const onApply = jest.fn();
    render(<SkinHero layout="split" onApply={onApply} onExplore={jest.fn()} />);
    expect(screen.getByText(/join --club boyuan/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('投递简历'));
    expect(onApply).toHaveBeenCalled();
  });

  it('bento 渲染传入的统计块，最多四块', () => {
    const stats = [
      { title: '优秀社员', count: '100+' }, { title: '项目成果', count: '50+' },
      { title: '竞赛奖项', count: '30+' }, { title: '社团活动', count: '80+' },
      { title: '多余的', count: '999' },
    ];
    render(<SkinHero layout="bento" stats={stats} onApply={jest.fn()} onExplore={jest.fn()} />);
    expect(screen.getByText('100+')).toBeInTheDocument();
    expect(screen.getByText('社团活动')).toBeInTheDocument();
    expect(screen.queryByText('999')).not.toBeInTheDocument();
  });

  it('editorial 渲染招新季眉题', () => {
    render(<SkinHero layout="editorial" onApply={jest.fn()} onExplore={jest.fn()} />);
    expect(screen.getByText(/秋季招新/)).toBeInTheDocument();
  });
});
