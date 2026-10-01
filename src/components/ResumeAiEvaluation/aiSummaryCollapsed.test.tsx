// 简历详情里的 AI 评价：等级标签直接可见，完整评分卡默认收起、点开再看。
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
  card: { summary: '与技术部对得上。', match: [], effort: { items: [] }, transfer_hint: { dept: '媒体部', is_second_choice: true } },
};

describe('AI 评价默认收起', () => {
  beforeEach(() => (getEvaluationScorecard as jest.Mock).mockResolvedValue({ data: detail }));

  it('不用点就能看到等级与调剂建议，完整评分卡收起', async () => {
    render(<ResumeAiSummary resumeId={1} cycleId={3} />);
    expect(await screen.findByText('部门匹配 良好')).toBeInTheDocument();
    expect(screen.getByText('认真程度 优秀')).toBeInTheDocument();
    expect(screen.getByText('建议调剂:媒体部(第二志愿)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /查看完整评价/ })).toBeInTheDocument();
    expect(screen.queryByText(/与技术部对得上/)).toBeNull();
  });

  it('点开才展示，可以再收起', async () => {
    render(<ResumeAiSummary resumeId={1} cycleId={3} />);
    fireEvent.click(await screen.findByRole('button', { name: /查看完整评价/ }));
    expect(screen.getByText(/与技术部对得上/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /收\s*起/ }));
    expect(screen.queryByText(/与技术部对得上/)).toBeNull();
    expect(screen.getByRole('button', { name: /查看完整评价/ })).toBeInTheDocument();
  });

  it('换一份简历重新收起，不把上一位的展开状态带过去', async () => {
    const { rerender } = render(<ResumeAiSummary resumeId={1} cycleId={3} />);
    fireEvent.click(await screen.findByRole('button', { name: /查看完整评价/ }));
    expect(screen.getByText(/与技术部对得上/)).toBeInTheDocument();
    rerender(<ResumeAiSummary resumeId={2} cycleId={3} />);
    expect(await screen.findByRole('button', { name: /查看完整评价/ })).toBeInTheDocument();
    expect(screen.queryByText(/与技术部对得上/)).toBeNull();
  });

  it('没有初筛结果时只留一行灰字，不给按钮', async () => {
    (getEvaluationScorecard as jest.Mock).mockResolvedValue({ data: null });
    render(<ResumeAiSummary resumeId={1} cycleId={3} />);
    expect(await screen.findByText(/暂无 AI 初筛结果/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /查看完整评价/ })).toBeNull();
  });
});

describe('AI 评价跟随盲评：没打分时手动查看，打完自动显示', () => {
  beforeEach(() => (getEvaluationScorecard as jest.Mock).mockResolvedValue({ data: detail }));

  it('我还没打分：只提示已出结果，不露等级', async () => {
    render(<ResumeAiSummary resumeId={1} cycleId={3} blind />);
    expect(await screen.findByText('已出结果，打分后自动显示')).toBeInTheDocument();
    expect(screen.queryByText('部门匹配 良好')).toBeNull();
  });

  it('点「查看」揭开，点「收起」再藏起', async () => {
    render(<ResumeAiSummary resumeId={1} cycleId={3} blind />);
    fireEvent.click(await screen.findByRole('button', { name: /查\s*看/ }));
    expect(screen.getByText('部门匹配 良好')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /收\s*起/ }));
    expect(screen.queryByText('部门匹配 良好')).toBeNull();
  });

  it('打完分（blind 变 false）自动显示等级', async () => {
    const { rerender } = render(<ResumeAiSummary resumeId={1} cycleId={3} blind />);
    await screen.findByText('已出结果，打分后自动显示');
    rerender(<ResumeAiSummary resumeId={1} cycleId={3} blind={false} />);
    expect(screen.getByText('部门匹配 良好')).toBeInTheDocument();
  });

  it('换一份简历重新藏起', async () => {
    const { rerender } = render(<ResumeAiSummary resumeId={1} cycleId={3} blind />);
    fireEvent.click(await screen.findByRole('button', { name: /查\s*看/ }));
    rerender(<ResumeAiSummary resumeId={2} cycleId={3} blind />);
    expect(await screen.findByText('已出结果，打分后自动显示')).toBeInTheDocument();
  });
});

