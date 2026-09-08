import React from 'react';
import { render, screen } from '@testing-library/react';
import EvaluationDrawer from './EvaluationDrawer';

const dims: any[] = [
  { dimensionId: 1, name: '技术能力', maxScore: 40 },
  { dimensionId: 2, name: '沟通表达', maxScore: 30 },
];

describe('结果页的评价抽屉', () => {
  it('无评价给空态说明，不是一片空白', () => {
    render(<EvaluationDrawer open onClose={jest.fn()} candidateName="张三" summary={null} dimensions={dims} />);
    expect(screen.getByText(/还没有面试评价/)).toBeInTheDocument();
  });

  it('维度分、评语与署名、总评、面试官都展示出来', () => {
    const summary: any = {
      scheduleId: 5, resumeId: 1, userId: 7, candidateName: '张三', deptName: '技术部',
      totalScore: 86.5, recommendation: 1, status: 2,
      scores: { 1: 35, 2: 26 },
      dimensionNotes: { 1: '基础扎实，写过真实项目' },
      dimensionWriters: { 1: { userId: 2, name: '面试官甲' } },
      comment: '整体表现稳定，建议录取。',
      contributors: [{ userId: 2, name: '面试官甲' }, { userId: 3, name: '面试官乙' }],
      assignedInterviewerCount: 2,
      submittedByName: '面试官甲', submittedAt: '2026-09-07T20:00:00',
    };
    render(<EvaluationDrawer open onClose={jest.fn()} summary={summary} dimensions={dims} />);
    expect(screen.getByText('86.5')).toBeInTheDocument();
    expect(screen.getByText('倾向通过')).toBeInTheDocument();
    expect(screen.getByText(/基础扎实/)).toBeInTheDocument();
    expect(screen.getByText(/—— 面试官甲/)).toBeInTheDocument();
    expect(screen.getByText(/整体表现稳定/)).toBeInTheDocument();
    expect(screen.getByText('面试官乙')).toBeInTheDocument();
    // 没写评语的维度显示占位，不缺行
    expect(screen.getByText('沟通表达')).toBeInTheDocument();
  });
});
