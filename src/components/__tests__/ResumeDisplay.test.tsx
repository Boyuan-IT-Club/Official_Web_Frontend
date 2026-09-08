import React from 'react';
import { render, screen } from '@testing-library/react';
import ResumeDisplay from '../ResumeDisplay';

const mapping = { expected_interview_time: 42 };

describe('简历只读展示里的面试意向', () => {
  it('没有面试意向数据时不凭空显示「能参加」', () => {
    // 空简历上曾显示「是否能参加线下面试: 能参加」——那是解析兜底值，不是用户填的
    render(<ResumeDisplay fieldValues={[]} fieldIdMapping={mapping} />);
    expect(screen.queryByText(/是否能参加线下面试/)).not.toBeInTheDocument();
    expect(screen.queryByText('能参加')).not.toBeInTheDocument();
    expect(screen.queryByText(/线上面试/)).not.toBeInTheDocument();
  });

  it('填了「能参加」→ 显示能参加和面试时间', () => {
    render(
      <ResumeDisplay
        fieldIdMapping={mapping}
        fieldValues={[{ fieldId: 42, fieldValue: JSON.stringify({ first: '周六上午', second: '', canAttend: 'yes' }) }]}
      />,
    );
    expect(screen.getByText('能参加')).toBeInTheDocument();
    expect(screen.getByText('周六上午')).toBeInTheDocument();
  });

  it('填了「不能参加」→ 显示不能参加与线上面试', () => {
    render(
      <ResumeDisplay
        fieldIdMapping={mapping}
        fieldValues={[{ fieldId: 42, fieldValue: JSON.stringify({ first: '', second: '', canAttend: 'no' }) }]}
      />,
    );
    expect(screen.getByText('不能参加')).toBeInTheDocument();
    expect(screen.getByText(/线上面试/)).toBeInTheDocument();
  });

  it('老数据没有 canAttend 字段时按能参加处理（与导出逻辑一致）', () => {
    render(
      <ResumeDisplay
        fieldIdMapping={mapping}
        fieldValues={[{ fieldId: 42, fieldValue: JSON.stringify({ first: '周日下午', second: '' }) }]}
      />,
    );
    expect(screen.getByText('能参加')).toBeInTheDocument();
  });
});
