import React from 'react';
import { render, screen } from '@testing-library/react';
import { resumeScoreTip } from './evalStage';

const ENTRIES = [
  { scorerId: 1, scorerName: '陈睿', score: 100 },
  { scorerId: 2, scorerName: '黄胤锦', score: 95 },
  { scorerId: 3, scorerName: '韩允泽', score: 95 },
];

describe('打分舞台 · 初筛分悬停', () => {
  it('管理员能看到全部打分人，而不只是最后打分的那一个', () => {
    render(<>{resumeScoreTip(true, ENTRIES, 96, '韩允泽')}</>);
    expect(screen.getByText('3 人打分 · 平均 96')).toBeInTheDocument();
    ['陈睿', '黄胤锦', '韩允泽'].forEach((n) => expect(screen.getByText(n)).toBeInTheDocument());
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('面试官只看到「简历初筛分」，不露打分人', () => {
    expect(resumeScoreTip(false, ENTRIES, 96, '韩允泽')).toBe('简历初筛分');
  });

  it('没有明细的历史数据退回署名', () => {
    expect(resumeScoreTip(true, [], 96, '韩允泽')).toBe('韩允泽 评分');
    expect(resumeScoreTip(true, undefined, 96, null)).toBe('已评分');
  });
});
