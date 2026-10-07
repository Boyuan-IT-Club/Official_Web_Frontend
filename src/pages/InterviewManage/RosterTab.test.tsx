import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import RosterTab from './RosterTab';

jest.mock('../../api/manage/interviewAdmin', () => ({
  listSchedulesRoster: jest.fn(),
  listSessions: jest.fn(),
  updateScheduleInterviewTime: jest.fn(),
  cancelSchedules: jest.fn(),
}));
jest.mock('../../api/manage/interviewEvaluation', () => ({
  getCandidateResume: jest.fn(),
}));
jest.mock('../Resume/ResumeDetail', () => () => null);
jest.mock('../../utils', () => ({
  ...jest.requireActual('../../utils'),
  request: jest.fn(),
}));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const api = require('../../api/manage/interviewAdmin');

const row = (scheduleId: number, name: string, resumeStatus = 2) => ({
  scheduleId, resumeId: scheduleId + 100, userId: scheduleId, name,
  interviewTime: '2026-10-11T09:00:00', deptName: '技术部', location: '教书院 205', resumeStatus,
});

beforeEach(() => {
  jest.clearAllMocks();
  api.listSessions.mockResolvedValue({ data: [] });
  api.cancelSchedules.mockResolvedValue({ data: { cancelled: 1, skipped: [] } });
});

describe('面试名单 · 取消安排按钮', () => {
  it('全员过了初筛、也没勾人时不显示', async () => {
    api.listSchedulesRoster.mockResolvedValue({ data: [row(1, '甲'), row(2, '乙')] });
    render(<RosterTab cycleId={14} />);
    await screen.findByText('甲');
    expect(screen.queryByRole('button', { name: /取消/ })).toBeNull();
  });

  it('全员过了初筛时，勾选后仍能取消所选（改场次部门后重排要用）', async () => {
    api.listSchedulesRoster.mockResolvedValue({ data: [row(1, '甲'), row(2, '乙')] });
    render(<RosterTab cycleId={14} />);
    await screen.findByText('甲');

    // 第 0 个是表头全选，第 1 个是第一行
    fireEvent.click(screen.getAllByRole('checkbox')[1]);
    fireEvent.click(await screen.findByRole('button', { name: '取消所选 1 条安排' }));
    fireEvent.click(await screen.findByRole('button', { name: '确认取消' }));

    await waitFor(() => expect(api.cancelSchedules).toHaveBeenCalledWith(14, [1]));
  });

  it('有初筛未通过的人且没勾人时，默认摘出那批（原有用法不变）', async () => {
    api.listSchedulesRoster.mockResolvedValue({ data: [row(1, '甲'), row(2, '乙', 5)] });
    render(<RosterTab cycleId={14} />);
    await screen.findByText('甲');

    fireEvent.click(await screen.findByRole('button', { name: '取消 1 条初筛未通过的安排' }));
    fireEvent.click(await screen.findByRole('button', { name: '确认取消' }));

    await waitFor(() => expect(api.cancelSchedules).toHaveBeenCalledWith(14, [2]));
  });
});
