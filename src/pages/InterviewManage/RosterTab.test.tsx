import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
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
  scheduleId, resumeId: scheduleId + 100, userId: scheduleId, name, sessionId: 17,
  interviewTime: '2026-10-11T09:00:00', deptName: '技术部', location: '教书院 205', resumeStatus,
});

const SESSIONS = [
  { sessionId: 17, cycleId: 14, timeSlotId: 1, deptId: 1, deptName: '技术部',
    location: '教书院205', capacity: 12, currentOccupied: 11, remaining: 1, status: 1 },
  { sessionId: 19, cycleId: 14, timeSlotId: 1, deptId: 3, deptName: '媒体部',
    location: '教书院306', capacity: 12, currentOccupied: 6, remaining: 6, status: 1 },
  { sessionId: 21, cycleId: 14, timeSlotId: 2, deptId: 1, deptName: '技术部',
    location: '教书院205', capacity: 12, currentOccupied: 12, remaining: 0, status: 1 },
];

/** 打开某一行的「调时间/地点」弹窗，返回弹窗根节点（页面上还有筛选条的下拉，要限定范围） */
const openDialog = async (name: string): Promise<HTMLElement> => {
  await screen.findByText(name);
  fireEvent.click(screen.getAllByRole('button', { name: '调时间/地点' })[0]);
  const title = await screen.findByText(/调整面试时间 \/ 地点/);
  return title.closest('.ant-modal') as HTMLElement;
};

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

describe('面试名单 · 调整时间与地点', () => {
  beforeEach(() => {
    api.listSchedulesRoster.mockResolvedValue({ data: [row(1, '甲')] });
    api.listSessions.mockResolvedValue({ data: SESSIONS });
    api.updateScheduleInterviewTime.mockResolvedValue({ data: {} });
  });

  it('弹窗里能选场次，默认停在该同学当前的场次', async () => {
    render(<RosterTab cycleId={14} />);
    const dialog = await openDialog('甲');
    expect(within(dialog).getByText('面试地点（场次）')).toBeInTheDocument();
    // 当前场次 17 的地点回显在选择框里
    expect(within(dialog).getByText(/教书院205（#17/)).toBeInTheDocument();
  });

  it('没换场次时只提交时间，不带 sessionId', async () => {
    render(<RosterTab cycleId={14} />);
    await openDialog('甲');
    fireEvent.click(screen.getByRole('button', { name: '保 存' }));
    await waitFor(() => expect(api.updateScheduleInterviewTime).toHaveBeenCalled());
    expect(api.updateScheduleInterviewTime).toHaveBeenCalledWith(
      1, '2026-10-11T09:00:00', undefined);
  });

  it('换成别的场次时带上 sessionId（即改面试地点）', async () => {
    render(<RosterTab cycleId={14} />);
    const dialog = await openDialog('甲');
    fireEvent.mouseDown(within(dialog).getByRole('combobox'));
    fireEvent.click(await screen.findByText(/教书院306（#19/));
    fireEvent.click(screen.getByRole('button', { name: '保 存' }));
    await waitFor(() => expect(api.updateScheduleInterviewTime).toHaveBeenCalledWith(
      1, '2026-10-11T09:00:00', 19));
  });

  it('已满的场次在下拉里禁选', async () => {
    render(<RosterTab cycleId={14} />);
    const dialog = await openDialog('甲');
    fireEvent.mouseDown(within(dialog).getByRole('combobox'));
    const full = await screen.findByText(/教书院205（#21/);
    expect(full.closest('.ant-select-item')).toHaveClass('ant-select-item-option-disabled');
  });
});
