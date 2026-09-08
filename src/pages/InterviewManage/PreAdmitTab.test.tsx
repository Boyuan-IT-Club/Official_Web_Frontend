import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import PreAdmitTab from './PreAdmitTab';

jest.mock('../../api/manage/interviewAdmin', () => ({
  listPreAdmission: jest.fn(),
  removePreAdmission: jest.fn(),
  finalizePreAdmission: jest.fn(),
  savePreAdmission: jest.fn(),
}));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const api = require('../../api/manage/interviewAdmin');

beforeEach(() => {
  api.listPreAdmission.mockResolvedValue({
    data: {
      total: 2,
      candidates: [
        { draftId: 1, cycleId: 6, resultId: 7, assignedDeptId: 2, userId: 21, userName: '丁华烨', departmentName: '综合部', updatedAt: '2026-09-08T18:00:00' },
        { draftId: 2, cycleId: 6, resultId: 8, assignedDeptId: 1, userId: 22, userName: '饶俊晨', departmentName: '技术部', updatedAt: '2026-09-08T18:05:00' },
      ],
      departmentStats: [
        { deptId: 1, departmentName: '技术部', candidateCount: 1 },
        { deptId: 2, departmentName: '综合部', candidateCount: 1 },
      ],
    },
  });
  api.finalizePreAdmission.mockResolvedValue({ data: { published: 2 } });
});

describe('预录取名单页', () => {
  it('渲染部门统计胶囊与名单行，点胶囊按部门过滤', async () => {
    render(<PreAdmitTab cycleId={6} />);
    await waitFor(() => expect(screen.getByText('丁华烨')).toBeInTheDocument());
    expect(screen.getByText('技术部 · 1')).toBeInTheDocument();

    fireEvent.click(screen.getByText('技术部 · 1'));
    expect(screen.queryByText('丁华烨')).not.toBeInTheDocument();
    expect(screen.getByText('饶俊晨')).toBeInTheDocument();
  });

  it('最终录取的确认弹窗列出各部门人数，确认后调 finalize', async () => {
    render(<PreAdmitTab cycleId={6} />);
    await waitFor(() => expect(screen.getByText(/按名单最终录取（2 人）/)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/按名单最终录取（2 人）/));

    await waitFor(() => expect(screen.getByText('按名单最终录取？')).toBeInTheDocument());
    expect(screen.getByText('技术部 · 1 人')).toBeInTheDocument();
    fireEvent.click(screen.getByText('确认录取'));
    await waitFor(() => expect(api.finalizePreAdmission).toHaveBeenCalledWith({ cycleId: 6 }));
  });

  it('空名单给指路空态而不是白板', async () => {
    api.listPreAdmission.mockResolvedValue({ data: { total: 0, candidates: [], departmentStats: [] } });
    render(<PreAdmitTab cycleId={6} />);
    await waitFor(() => expect(screen.getByText(/名单还是空的/)).toBeInTheDocument());
  });
});
