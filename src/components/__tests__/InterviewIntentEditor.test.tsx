import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import InterviewIntentEditor from '../InterviewIntentEditor';

jest.mock('../../api/interviewPreference', () => ({
  getMyPreference: jest.fn(),
  listOpenTimeSlots: jest.fn(),
  submitPreference: jest.fn(),
}));
jest.mock('../../api/manage/deptManage', () => ({ getValidDept: jest.fn() }));
jest.mock('../../utils', () => ({ request: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const api = require('../../api/interviewPreference');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const deptApi = require('../../api/manage/deptManage');

const SLOT_OPEN = { timeSlotId: 5, slotName: '周六上午', interviewDate: '2026-09-12', startTime: '09:00', endTime: '12:00' };

// resetMocks: true —— 实现必须写在 beforeEach 里，见 RecruitProgressCard.test.tsx 的注释
beforeEach(() => {
  deptApi.getValidDept.mockResolvedValue({ data: [{ deptId: 1, deptName: '技术部' }, { deptId: 2, deptName: '综合部' }] });
  api.listOpenTimeSlots.mockResolvedValue({ data: [SLOT_OPEN] });
  // 上次志愿里勾过两个时间窗：5 还开放，9 已被管理员关闭（列表里不再出现）
  api.getMyPreference.mockResolvedValue({
    data: {
      preferenceId: 1, firstDeptId: 1, secondDeptId: null,
      acceptedTimeSlots: [SLOT_OPEN, { timeSlotId: 9, slotName: '已关闭的窗', interviewDate: '2026-09-13', startTime: '14:00', endTime: '17:00' }],
    },
  });
  api.submitPreference.mockResolvedValue({ data: {} });
});

describe('面试意向弹窗对失效时间窗的处理', () => {
  it('预填时丢弃已不在开放列表里的时间窗，提交的 id 只含可见项', async () => {
    render(<InterviewIntentEditor open cycleId={6} onClose={jest.fn()} />);
    await waitFor(() => expect(screen.getByText(/周六上午/)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /OK|确 定/ }));

    // 修复前：上次勾的 9 号窗被原样预填，看不见、去不掉，
    // 提交必带 9 → 后端 3611「所选时间窗无效或不属于该周期」，学生卡死
    await waitFor(() => expect(api.submitPreference).toHaveBeenCalled());
    expect(api.submitPreference.mock.calls[0][0].timeSlotIds).toEqual([5]);
  });

  it('提交撞上 3611（表单开着时窗被关）就刷新列表并剔除失效勾选', async () => {
    api.submitPreference.mockRejectedValue({ code: 3611, message: '所选时间窗无效或不属于该周期' });
    render(<InterviewIntentEditor open cycleId={6} onClose={jest.fn()} />);
    await waitFor(() => expect(screen.getByText(/周六上午/)).toBeInTheDocument());
    // 提交瞬间 5 号窗也被关掉了
    api.listOpenTimeSlots.mockResolvedValue({ data: [] });

    fireEvent.click(screen.getByRole('button', { name: /OK|确 定/ }));

    await waitFor(() => expect(screen.getByText(/已为你刷新/)).toBeInTheDocument());
    // 列表刷新成空，失效勾选被清掉，学生能看到真实状态重新选
    await waitFor(() => expect(screen.queryByText(/周六上午/)).not.toBeInTheDocument());
  });
});
