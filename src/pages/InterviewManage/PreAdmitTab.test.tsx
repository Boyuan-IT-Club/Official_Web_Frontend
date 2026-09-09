import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import PreAdmitTab from './PreAdmitTab';

jest.mock('../../api/manage/interviewAdmin', () => ({
  listPreAdmission: jest.fn(),
  removePreAdmission: jest.fn(),
  finalizePreAdmission: jest.fn(),
  savePreAdmission: jest.fn(),
  listResults: jest.fn(),
  listSchedulesRoster: jest.fn(),
}));
jest.mock('../../api/manage/interviewEvaluation', () => ({
  getEvaluationSummary: jest.fn(),
}));
jest.mock('../../utils', () => ({ request: jest.fn() }));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const api = require('../../api/manage/interviewAdmin');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const evalApi = require('../../api/manage/interviewEvaluation');

const DEPTS = [
  { deptId: 1, deptName: '技术部' }, { deptId: 2, deptName: '项目部' },
  { deptId: 3, deptName: '媒体部' }, { deptId: 4, deptName: '综合部' },
];

beforeEach(() => {
  api.listResults.mockResolvedValue({ data: { interviewResults: [
    { resultId: 8, scheduleId: 5, userId: 2, userName: '饶俊晨', resumeScore: 100, firstDeptName: '技术部', evalTotalScore: 39, evalRecommendation: 1 },
    { resultId: 7, scheduleId: null, userId: 1, userName: '丁华烨', resumeScore: 90 },
  ] } });
  evalApi.getEvaluationSummary.mockResolvedValue({ data: {
    dimensions: [
      { dimensionId: 1, name: '技术能力', maxScore: 40, weight: 0.4 },
      { dimensionId: 2, name: '沟通表达', maxScore: 30, weight: 0.3 },
    ],
    candidates: [{
      scheduleId: 5, resumeId: 9, userId: 2, candidateName: '饶俊晨',
      scores: { 1: 38, 2: 24 }, dimensionNotes: { 1: '基础扎实' },
      dimensionWriters: { 1: { userId: 3, name: '面试官甲' } },
      totalScore: 39, recommendation: 1, status: 2, contributors: [{ userId: 3, name: '面试官甲' }],
    }],
  } });
  api.listPreAdmission.mockResolvedValue({ data: {
    total: 1,
    candidates: [{ draftId: 1, cycleId: 6, resultId: 8, assignedDeptId: 1, userName: '饶俊晨', departmentName: '技术部' }],
    departmentStats: [{ deptId: 1, departmentName: '技术部', candidateCount: 1 }],
  } });
  api.listSchedulesRoster.mockResolvedValue({ data: [{ userId: 2, username: '10265101597' }] });
  api.savePreAdmission.mockResolvedValue({ data: { affected: 1, skipped: [] } });
  api.finalizePreAdmission.mockResolvedValue({ data: { published: 1 } });
  api.removePreAdmission.mockResolvedValue({ data: { affected: 1, skipped: [] } });
});

describe('终审工作台', () => {
  it('默认总览矩阵：维度列、着色分数、预录取列都在，悬浮格有评语', async () => {
    render(<PreAdmitTab cycleId={6} depts={DEPTS} />);
    await waitFor(() => expect(screen.getByText('饶俊晨 ▾')).toBeInTheDocument());
    expect(screen.getAllByText('技术能力/40').length).toBeGreaterThan(0);   // 固定列会让表头渲染两份
    expect(screen.getAllByText('38').length).toBeGreaterThan(0);
    expect(screen.getAllByText('技术部').length).toBeGreaterThan(0);
    // 无面试的丁华烨也在，不缺人
    expect(screen.getByText('丁华烨 ▾')).toBeInTheDocument();
  });

  it('点姓名展开整行评语（含署名与总评占位）', async () => {
    render(<PreAdmitTab cycleId={6} depts={DEPTS} />);
    await waitFor(() => expect(screen.getByText('饶俊晨 ▾')).toBeInTheDocument());
    fireEvent.click(screen.getByText('饶俊晨 ▾'));
    await waitFor(() => expect(screen.getByText(/基础扎实/)).toBeInTheDocument());
    expect(screen.getAllByText(/面试官甲/).length).toBeGreaterThan(0);
  });

  it('进入舞台：Hero 面板显示大分数与部门胶囊，点部门调单人加入', async () => {
    render(<PreAdmitTab cycleId={6} depts={DEPTS} />);
    // 等数据到位——按钮在空数据时禁用
    await waitFor(() => expect(screen.getByText('饶俊晨 ▾')).toBeInTheDocument());
    fireEvent.click(screen.getByText('进入终审舞台'));

    // 排名第一的饶俊晨在舞台上：加权总分大字 + 结论
    await waitFor(() => expect(screen.getByText('39.0')).toBeInTheDocument());
    expect(screen.getAllByText(/倾向通过/).length).toBeGreaterThan(0);   // Tag 内文本被拆节点，匹配结论文案
    // 点「项目部」胶囊 → 单人预录取（长度为一的批量）
    fireEvent.click(screen.getByRole('button', { name: /项目部/ }));   // 胶囊里带快捷键角标，文本被拆节点
    await waitFor(() => expect(api.savePreAdmission).toHaveBeenCalledWith({
      cycleId: 6, resultIds: [8], assignedDeptId: 2,
    }));
  });

  it('名单段：只列草稿成员，可移出', async () => {
    render(<PreAdmitTab cycleId={6} depts={DEPTS} />);
    await waitFor(() => expect(screen.getByText('饶俊晨 ▾')).toBeInTheDocument());
    fireEvent.click(screen.getByText('名单'));
    await waitFor(() => expect(screen.getByText('移出')).toBeInTheDocument());
    // 未入名单的丁华烨不在名单段
    expect(screen.queryByText('丁华烨')).not.toBeInTheDocument();
  });

  it('按名单最终录取：确认弹窗列部门人数并调 finalize', async () => {
    render(<PreAdmitTab cycleId={6} depts={DEPTS} />);
    await waitFor(() => expect(screen.getByText(/按名单最终录取（1 人）/)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/按名单最终录取（1 人）/));
    await waitFor(() => expect(screen.getByText('按名单最终录取？')).toBeInTheDocument());
    expect(screen.getByText('技术部 · 1 人')).toBeInTheDocument();
    fireEvent.click(screen.getByText('确认录取'));
    await waitFor(() => expect(api.finalizePreAdmission).toHaveBeenCalledWith({ cycleId: 6 }));
  });
});
