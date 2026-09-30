// 简历详情里的 AI 评价默认收起：先自己看简历、下判断，想参考再点开。
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResumeAiSummary } from './index';
import { getEvaluationScorecard } from '@/api/manage/evaluationApis';

jest.mock('@/api/manage/evaluationApis', () => ({
  getEvaluationScorecard: jest.fn(),
  getEvaluationQbank: jest.fn(),
  pickQuestions: jest.fn(),
}));

const detail: any = {
  card_version: 1,
  status: 'draft',
  hard_zero: false,
  total: null,
  match_level: '良好',
  effort_level: '优秀',
  card: { summary: '与技术部对得上。', match: [], effort: { items: [] } },
};

describe('AI 评价默认收起', () => {
  beforeEach(() => (getEvaluationScorecard as jest.Mock).mockResolvedValue({ data: detail }));

  it('初始只有一颗「查看 AI 评价」按钮，看不到等级', async () => {
    render(<ResumeAiSummary resumeId={1} cycleId={3} />);
    expect(await screen.findByRole('button', { name: /查看 AI 评价/ })).toBeInTheDocument();
    expect(screen.queryByText(/与技术部对得上/)).toBeNull();
    expect(screen.queryByText(/认真程度/)).toBeNull();
  });

  it('点开才展示，可以再收起', async () => {
    render(<ResumeAiSummary resumeId={1} cycleId={3} />);
    fireEvent.click(await screen.findByRole('button', { name: /查看 AI 评价/ }));
    expect(screen.getByText(/与技术部对得上/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /收\s*起/ }));
    expect(screen.queryByText(/与技术部对得上/)).toBeNull();
    expect(screen.getByRole('button', { name: /查看 AI 评价/ })).toBeInTheDocument();
  });

  it('换一份简历重新收起，不把上一位的展开状态带过去', async () => {
    const { rerender } = render(<ResumeAiSummary resumeId={1} cycleId={3} />);
    fireEvent.click(await screen.findByRole('button', { name: /查看 AI 评价/ }));
    expect(screen.getByText(/与技术部对得上/)).toBeInTheDocument();
    rerender(<ResumeAiSummary resumeId={2} cycleId={3} />);
    expect(await screen.findByRole('button', { name: /查看 AI 评价/ })).toBeInTheDocument();
    expect(screen.queryByText(/与技术部对得上/)).toBeNull();
  });

  it('没有初筛结果时只留一行灰字，不给按钮', async () => {
    (getEvaluationScorecard as jest.Mock).mockResolvedValue({ data: null });
    render(<ResumeAiSummary resumeId={1} cycleId={3} />);
    expect(await screen.findByText(/暂无 AI 初筛结果/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /查看 AI 评价/ })).toBeNull();
  });
});
