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

// 整张 antd Table + Popconfirm 渲染，本地 1~2 秒，CI 机器上会超过默认 5 秒（#247 CI 实测）
jest.setTimeout(15000);

const row = (scheduleId: number, name: string, resumeStatus = 2) => ({
  scheduleId, resumeId: scheduleId + 100, userId: scheduleId, name,
  interviewTime: '2026-10-11T09:00:00', deptName: '技术部', location: '教书院 205', resumeStatus,
});

beforeEach(() => {
  jest.clearAllMocks();
  api.listSessions.mockResolvedValue({ data: [] });
  api.cancelSchedules.mockResolvedValue({ data: { cancelled: 1, skipped: [] } });
});

describe('面试名单 · 批量取消', () => {
  it('没勾人时按钮常驻但禁用，并提示怎么用', async () => {
    api.listSchedulesRoster.mockResolvedValue({ data: [row(1, '甲'), row(2, '乙')] });
    render(<RosterTab cycleId={14} />);
    await screen.findByText('甲');
    expect(screen.getByRole('button', { name: /取消安排/ })).toBeDisabled();
    expect(screen.getByText(/勾选安排后可批量取消/)).toBeInTheDocument();
    // 没有初筛未通过的人时，不出现「摘出」按钮
    expect(screen.queryByRole('button', { name: /摘出/ })).toBeNull();
  });

  it('全员过了初筛时，勾选后仍能取消所选（改场次部门后重排要用）', async () => {
    api.listSchedulesRoster.mockResolvedValue({ data: [row(1, '甲'), row(2, '乙')] });
    render(<RosterTab cycleId={14} />);
    await screen.findByText('甲');

    // 第 0 个是表头全选，第 1 个是第一行
    fireEvent.click(screen.getAllByRole('checkbox')[1]);
    expect(screen.getByText('已选 1 条安排')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /取消安排/ }));
    expect(await screen.findByText('取消所选 1 条面试安排？')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: '确认取消' }));

    await waitFor(() => expect(api.cancelSchedules).toHaveBeenCalledWith(14, [1]));
  });

  it('全选时确认框点明是「全部」并提醒只勾要调整的人', async () => {
    api.listSchedulesRoster.mockResolvedValue({ data: [row(1, '甲'), row(2, '乙')] });
    render(<RosterTab cycleId={14} />);
    await screen.findByText('甲');

    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    fireEvent.click(screen.getByRole('button', { name: /取消安排/ }));
    expect(await screen.findByText('取消本周期全部 2 条面试安排？')).toBeInTheDocument();
    expect(screen.getByText(/请只勾那一部分/)).toBeInTheDocument();
  });

  it('有初筛未通过的人时，可一键摘出那批（原有用法保留）', async () => {
    api.listSchedulesRoster.mockResolvedValue({ data: [row(1, '甲'), row(2, '乙', 5)] });
    render(<RosterTab cycleId={14} />);
    await screen.findByText('甲');

    fireEvent.click(await screen.findByRole('button', { name: /摘出 1 名初筛未通过/ }));
    fireEvent.click(await screen.findByRole('button', { name: '确认取消' }));

    await waitFor(() => expect(api.cancelSchedules).toHaveBeenCalledWith(14, [2]));
  });
});
