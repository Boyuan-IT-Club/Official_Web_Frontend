import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import PreAdmitTab from './PreAdmitTab';

jest.mock('../../api/manage/interviewAdmin', () => ({
  listPreAdmission: jest.fn(),
  removePreAdmission: jest.fn(),
  finalizePreAdmission: jest.fn(),
  savePreAdmission: jest.fn(),
  listAllResults: jest.fn(),
  listSchedulesRoster: jest.fn(),
  getResultSummary: jest.fn(),
  RESULT_ERROR: jest.requireActual('../../api/manage/interviewAdmin').RESULT_ERROR,
}));
jest.mock('../../api/manage/interviewEvaluation', () => ({
  getEvaluationSummary: jest.fn(),
  // 筛选栏的「结论」下拉要用它；只 mock 发请求的函数会让这个常量变成 undefined
  RECOMMENDATION_OPTIONS: jest.requireActual('../../api/manage/interviewEvaluation')
    .RECOMMENDATION_OPTIONS,
}));
jest.mock('../../utils', () => ({
  // 组件树用到的工具（displayName 等）保留真实实现，只拦掉发请求的 request
  ...jest.requireActual('../../utils'),
  request: jest.fn(),
}));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const api = require('../../api/manage/interviewAdmin');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const evalApi = require('../../api/manage/interviewEvaluation');

const DEPTS = [
  { deptId: 1, deptName: '技术部' }, { deptId: 2, deptName: '项目部' },
  { deptId: 3, deptName: '媒体部' }, { deptId: 4, deptName: '综合部' },
];

beforeEach(() => {
  api.listAllResults.mockResolvedValue({ data: { interviewResults: [
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
  api.getResultSummary.mockResolvedValue({ data: {
    totals: { candidates: 2, pending: 2, adjusting: 0, admitted: 0, rejected: 0, inPreAdmission: 1, notified: 0 },
    departments: [{
      deptId: 1, deptName: '技术部', firstChoice: 1, secondChoice: 0, preAdmitted: 1, admitted: 0,
      admittedFirstChoice: 0, admittedSecondChoice: 0, admittedOther: 0, admittedNotified: 0,
    }],
  } });
});

/** 切到舞台视图（不全屏） */
const openStage = () => fireEvent.click(screen.getByText('舞台'));

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
    openStage();

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

  it('按名单最终录取：确认弹窗列部门人数、如实说明后果与名单外的待定，并调 finalize', async () => {
    render(<PreAdmitTab cycleId={6} depts={DEPTS} />);
    await waitFor(() => expect(screen.getByText(/按名单最终录取（1 人）/)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/按名单最终录取（1 人）/));
    await waitFor(() => expect(screen.getByText('按名单最终录取？')).toBeInTheDocument());
    expect(screen.getByText('技术部 · 1 人')).toBeInTheDocument();
    expect(screen.getByText(/学生刷新页面就能看到「已录取」/)).toBeInTheDocument();
    expect(screen.getByText(/名单外还有 1 位待定的同学/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('确认录取'));
    await waitFor(() => expect(api.finalizePreAdmission).toHaveBeenCalledWith({ cycleId: 6 }));
  });

  it('部门标签显示「预录取 / 已录取」，并单列名单外的待定人数', async () => {
    render(<PreAdmitTab cycleId={6} depts={DEPTS} />);
    expect(await screen.findByText('技术部 · 预录取 1 / 已录取 0')).toBeInTheDocument();
    expect(screen.getByText('待定未入名单 1')).toBeInTheDocument();
  });
});

describe('已定即锁', () => {
  beforeEach(() => {
    // 饶俊晨已经被录取了，却还挂在预录取名单里（历史数据）
    api.listAllResults.mockResolvedValue({ data: { interviewResults: [
      { resultId: 8, scheduleId: 5, userId: 2, userName: '饶俊晨', decision: 1, assignedDeptId: 1, evalTotalScore: 39 },
      { resultId: 7, scheduleId: null, userId: 1, userName: '丁华烨', decision: 2, resumeScore: 90 },
    ] } });
  });

  it('冲突的人在矩阵里标红并可移出；转正弹窗点名且不让确认', async () => {
    render(<PreAdmitTab cycleId={6} depts={DEPTS} />);
    await waitFor(() => expect(screen.getByText('饶俊晨 ▾')).toBeInTheDocument());
    expect(screen.getAllByText('冲突').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText(/按名单最终录取（1 人）/));
    expect(await screen.findByText('名单里有 1 人已经有正式结果，转正不了')).toBeInTheDocument();
    expect(screen.getByText(/饶俊晨（已录取）/)).toBeInTheDocument();
    expect(screen.getByText('确认录取').closest('button')).toBeDisabled();
  });

  it('已定的人在舞台上部门按钮置灰，点了也不会加入名单', async () => {
    render(<PreAdmitTab cycleId={6} depts={DEPTS} />);
    await waitFor(() => expect(screen.getByText('饶俊晨 ▾')).toBeInTheDocument());
    openStage();
    const btn = await screen.findByRole('button', { name: /项目部/ });
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(api.savePreAdmission).not.toHaveBeenCalled();
  });
});

describe('舞台键盘', () => {
  it('页签没在显示时，数字键不会把人加进名单', async () => {
    render(<PreAdmitTab cycleId={6} depts={DEPTS} active={false} />);
    await waitFor(() => expect(screen.getByText('饶俊晨 ▾')).toBeInTheDocument());
    openStage();
    await screen.findByText('39.0');
    fireEvent.keyDown(window, { key: '2' });
    expect(api.savePreAdmission).not.toHaveBeenCalled();
  });

  it('页签在显示时，数字键预录取到对应部门；翻到最后一位再按 → 不会回到第一位', async () => {
    render(<PreAdmitTab cycleId={6} depts={DEPTS} />);
    await waitFor(() => expect(screen.getByText('饶俊晨 ▾')).toBeInTheDocument());
    openStage();
    await screen.findByText('39.0');
    fireEvent.keyDown(window, { key: '2' });
    await waitFor(() => expect(api.savePreAdmission).toHaveBeenCalledWith({
      cycleId: 6, resultIds: [8], assignedDeptId: 2,
    }));
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    await screen.findByRole('heading', { name: /丁华烨/ });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByRole('heading', { name: /丁华烨/ })).toBeInTheDocument();
  });
});

describe('全屏与视图模式互不绑定', () => {
  it('在终审舞台里切到总览矩阵/名单仍是全屏，退出键才回到普通页面', async () => {
    render(<PreAdmitTab cycleId={6} depts={DEPTS} />);
    await waitFor(() => expect(screen.getByText('饶俊晨 ▾')).toBeInTheDocument());
    openStage();
    fireEvent.click(screen.getByRole('button', { name: '全屏' }));
    await waitFor(() => expect(document.querySelector('.stage-shell')).toBeInTheDocument());

    // 用户实际撞到的：切到矩阵就被踢出全屏
    fireEvent.click(screen.getByText('总览矩阵'));
    expect(document.querySelector('.stage-shell')).toBeInTheDocument();

    fireEvent.click(screen.getByText('名单'));
    expect(document.querySelector('.stage-shell')).toBeInTheDocument();

    fireEvent.click(screen.getByText(/退出/));
    await waitFor(() => expect(document.querySelector('.stage-shell')).not.toBeInTheDocument());
  });

});

describe('就地预录取与筛选', () => {
  it('矩阵里就地改预录取部门，不用进舞台', async () => {
    render(<PreAdmitTab cycleId={6} depts={DEPTS} />);
    await waitFor(() => expect(screen.getByText('饶俊晨 ▾')).toBeInTheDocument());

    // 预录取列是个下拉：选一个部门就应当直接落库
    const pickers = document.querySelectorAll('.ant-table-tbody .ant-select-selector');
    expect(pickers.length).toBeGreaterThan(0);
    fireEvent.mouseDown(pickers[0]);
    await waitFor(() => expect(screen.getAllByText('项目部').length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByText('项目部').slice(-1)[0]);

    await waitFor(() => expect(api.savePreAdmission).toHaveBeenCalledWith(
      expect.objectContaining({ cycleId: 6, assignedDeptId: 2 })));
  });

  it('按结论筛选，矩阵与舞台看到的是同一批人', async () => {
    render(<PreAdmitTab cycleId={6} depts={DEPTS} />);
    await waitFor(() => expect(screen.getByText('饶俊晨 ▾')).toBeInTheDocument());
    // 丁华烨没有评价、也就没有结论，筛「倾向通过」后应当只剩饶俊晨
    expect(screen.getByText('丁华烨 ▾')).toBeInTheDocument();

    // 「结论」在表头也出现，这里要的是筛选栏那个下拉的 placeholder
    const conclusion = document.querySelector('.ant-select-selection-placeholder');
    const picker = Array.from(document.querySelectorAll('.ant-select-selection-placeholder'))
      .find((el) => el.textContent === '结论') ?? conclusion;
    fireEvent.mouseDown(picker!);
    await waitFor(() => expect(screen.getAllByText('倾向通过').length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByText('倾向通过').slice(-1)[0]);

    await waitFor(() => expect(screen.queryByText('丁华烨 ▾')).not.toBeInTheDocument());
    expect(screen.getByText('饶俊晨 ▾')).toBeInTheDocument();
    expect(screen.getByText(/筛选后 1 \/ 2 人/)).toBeInTheDocument();
  });
});
