import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import RecruitProgressCard from '../RecruitProgressCard';

jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn() }));

jest.mock('../../api/interviewPreference', () => ({
  getMyPreference: jest.fn(),
  getMySchedule: jest.fn(),
  getMyResult: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const api = require('../../api/interviewPreference');

// 实现必须在 beforeEach 里给：CRA 的 jest 配置带 resetMocks: true，
// 写在 jest.mock 工厂里的 mockResolvedValue 会在每个用例前被清空，
// 接口就变成返回 undefined。
//
// 这个状态（已填意向、未排场次、未出结果）正是线上/线下两条路线的分岔点：
// 线下要显示「管理员安排中」，线上根本没有场次可等。
beforeEach(() => {
  api.getMyPreference.mockResolvedValue({ data: { preferenceId: 1 } });
  api.getMySchedule.mockResolvedValue({ data: null });
  api.getMyResult.mockResolvedValue({ data: null });
});

describe('招新进度卡的线上/线下两条路线', () => {
  it('能参加线下面试：第 4 步是「面试安排」', async () => {
    render(<RecruitProgressCard cycleId={1} resumeStatus={2} canAttendOffline />);
    await waitFor(() => expect(screen.getByText('面试安排')).toBeInTheDocument());
    expect(screen.queryByText('线上面试')).not.toBeInTheDocument();
  });

  it('不能参加线下面试：第 4 步换成「线上面试」', async () => {
    render(<RecruitProgressCard cycleId={1} resumeStatus={2} canAttendOffline={false} />);
    await waitFor(() => expect(screen.getByText('线上面试')).toBeInTheDocument());
    // 这类同学不会被排进线下场次，再显示「面试安排」会让人一直等场次通知
    expect(screen.queryByText('面试安排')).not.toBeInTheDocument();
    expect(screen.getByText('管理员将与你单独约时间')).toBeInTheDocument();
  });

  it('未填意向时按线下文案走，不擅自当成线上', async () => {
    render(<RecruitProgressCard cycleId={1} resumeStatus={2} canAttendOffline={null} />);
    await waitFor(() => expect(screen.getByText('面试安排')).toBeInTheDocument());
  });
});
