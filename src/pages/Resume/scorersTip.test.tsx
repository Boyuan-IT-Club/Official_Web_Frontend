import React from 'react';
import { render, screen } from '@testing-library/react';
import { scorersTip } from './ScorersTip';

describe('分数标签悬停：全部打分人', () => {
  it('列出每个人的分数和平均分，而不只是最后一个打分的人', () => {
    render(<>{scorersTip([
      { scorerId: 1, scorerName: '韩允泽', score: 85 },
      { scorerId: 2, scorerName: '杨承禹', score: 60 },
      { scorerId: 3, scorerName: null, score: 70 },
    ], 72, '丁华烨')}</>);
    expect(screen.getByText('3 人打分 · 平均 72')).toBeInTheDocument();
    expect(screen.getByText('韩允泽')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.getByText('已注销')).toBeInTheDocument();
    expect(screen.queryByText(/丁华烨/)).toBeNull();
  });

  it('没有明细的历史数据退回署名', () => {
    expect(scorersTip([], 80, '丁华烨')).toBe('丁华烨 评分');
    expect(scorersTip(undefined, 80, null, '点击收起')).toBe('已评分 · 点击收起');
  });

  it('可带末行说明', () => {
    render(<>{scorersTip([{ scorerId: 1, scorerName: '甲', score: 90 }], 90, null, '点击收起')}</>);
    expect(screen.getByText('点击收起')).toBeInTheDocument();
  });
});
