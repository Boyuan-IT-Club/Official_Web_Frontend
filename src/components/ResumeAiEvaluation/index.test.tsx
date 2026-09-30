import React from 'react';
import { render, screen } from '@testing-library/react';
import { AiGradeTags, AiScorecardBody } from './index';
import { ScorecardDetail } from '@/api/manage/evaluationApis';

describe('AI 初筛两维等级', () => {
  it('显示部门匹配度与认真程度两个等级,以及调剂建议', () => {
    render(
      <AiGradeTags
        grades={{
          hard_zero: false,
          match_level: '一般',
          effort_level: '优秀',
          transfer_hint: { dept: '媒体部', is_second_choice: true },
        }}
      />,
    );
    expect(screen.getByText('部门匹配 一般')).toBeInTheDocument();
    expect(screen.getByText('认真程度 优秀')).toBeInTheDocument();
    expect(screen.getByText('建议调剂:媒体部(第二志愿)')).toBeInTheDocument();
  });

  it('旧版结果只提示重新初筛,不拿旧总分冒充等级', () => {
    render(<AiGradeTags grades={{ hard_zero: false, needs_rerun: true }} />);
    expect(screen.getByText('旧版初筛结果,请重新初筛')).toBeInTheDocument();
    expect(screen.queryByText(/部门匹配/)).toBeNull();
  });

  it('命中重点复核时突出标出', () => {
    render(<AiGradeTags grades={{ hard_zero: true, match_level: '一般', effort_level: '一般' }} />);
    expect(screen.getByText('需重点复核')).toBeInTheDocument();
  });

  it('维卡展示面试提示与等级依据', () => {
    const detail: ScorecardDetail = {
      card_version: 1,
      status: 'draft',
      hard_zero: false,
      total: null,
      match_level: '良好',
      effort_level: '良好',
      grade_basis: 'pool',
      pool: '技术部',
      pool_size: 40,
      card: {
        schema: 'evaluation_scorecard/v2',
        intended: { first: '技术部', second: null },
        match: [{ dept: '技术部', items: [{ item: '技术基础', met: true, quote: '写过小程序', reason: 'r' }] }],
        effort: { items: [] },
        summary: '与技术部对得上。',
        attitude: { verdict: 'sincere', reason: '认真' },
        interview_hints: ['非计算机类专业(汉语言文学):请询问未来规划'],
      },
    };
    render(<AiScorecardBody detail={detail} />);
    expect(screen.getByText('非计算机类专业(汉语言文学):请询问未来规划')).toBeInTheDocument();
    expect(screen.getByText(/同报「技术部」的 40 名候选人/)).toBeInTheDocument();
  });
});
