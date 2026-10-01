import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ScoreComments from './ScoreComments';
import { resetScoreRevealForTest, useScoreReveal, isRevealed } from './scoreReveal';
import { renderHook } from '@testing-library/react';

const entries: any[] = [
  { scorerId: 9, scorerName: '韩允泽', score: 85, comment: '项目经历扎实\n表达清楚', scoredAt: '2026-10-01T14:20:33' },
  { scorerId: 7, scorerName: '丁华烨', score: 70, comment: '想追问一下实习细节', scoredAt: '2026-10-01T15:02:00' },
  { scorerId: 10, scorerName: '陈睿', score: 60, comment: null },
  { scorerId: 11, scorerName: null, score: 50, comment: '   ' },
];

describe('打分评语卡', () => {
  beforeEach(() => { window.localStorage.clear(); resetScoreRevealForTest(); });

  it('只列写了评语的人：姓名、分数、时间、评语，我的那条标「我」', () => {
    render(<ScoreComments resumeId={1} entries={entries} myUserId={7} blind={false} />);
    expect(screen.getByText('打分评语')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();          // 条数：空白评语不算
    expect(screen.getByText('韩允泽')).toBeInTheDocument();
    expect(screen.getByText('85 分')).toBeInTheDocument();
    expect(screen.getByText('10-01 14:20')).toBeInTheDocument();
    expect(screen.getByText(/项目经历扎实/)).toBeInTheDocument();
    expect(screen.getByText('我')).toBeInTheDocument();
    expect(screen.queryByText('陈睿')).toBeNull();
  });

  it('盲评下只露条数，点「查看」揭开这一份', () => {
    const { result } = renderHook(() => useScoreReveal());
    render(<ScoreComments resumeId={1} entries={entries} myUserId={7} blind />);
    expect(screen.getByText('已有 2 条评语，打分后可见')).toBeInTheDocument();
    expect(screen.queryByText(/项目经历扎实/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /查\s*看/ }));
    expect(isRevealed(result.current, 1)).toBe(true);
  });

  it('没有任何评语时整块不渲染', () => {
    const { container } = render(
      <ScoreComments resumeId={1} entries={[{ scorerId: 1, scorerName: '甲', score: 80 }]} myUserId={7} blind={false} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
