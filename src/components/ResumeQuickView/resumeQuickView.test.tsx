import React from 'react';
import { render, screen } from '@testing-library/react';
import ResumeQuickView from './index';

jest.mock('@/hooks/useResumePhoto', () => ({ useResumePhoto: () => null }));

const f = (fieldId: number, fieldKey: string, fieldLabel: string, fieldValue: string) =>
  ({ fieldId, fieldKey, fieldLabel, fieldValue });

describe('简历速览', () => {
  it('不把「存储位」字段原样打出来 —— 它们存的是机器读的 JSON', () => {
    render(<ResumeQuickView resume={{ resumeId: 1, simpleFields: [
      f(1, 'name', '姓名', '李明'),
      f(2, 'major', '专业', '计算机科学与技术'),
      // 面试意向、能否线下都塞在这个字段的 JSON 里；照原样显示就是一段乱码
      f(3, 'expected_interview_time', '第一面试时间',
        '{"first":"","second":"","canAttend":"yes","customTime":""}'),
      f(4, 'can_attend_offline_interview', '能否参加线下面试', 'yes'),
    ] }} />);

    expect(screen.getByText('李明')).toBeInTheDocument();
    expect(screen.getByText('计算机科学与技术')).toBeInTheDocument();
    expect(screen.queryByText('第一面试时间')).not.toBeInTheDocument();
    expect(screen.queryByText(/canAttend/)).not.toBeInTheDocument();
    expect(screen.queryByText('能否参加线下面试')).not.toBeInTheDocument();
  });

  it('管理员自建的字段没有 spec，照常显示', () => {
    render(<ResumeQuickView resume={{ resumeId: 1, simpleFields: [
      f(1, 'name', '姓名', '李明'),
      f(9, 'club_experience', '社团经历', '学生会宣传部'),
    ] }} />);
    expect(screen.getByText('社团经历')).toBeInTheDocument();
    expect(screen.getByText('学生会宣传部')).toBeInTheDocument();
  });
});
