// 「录取结果」页的交互守卫：录取去向、行内看评价、待定全部标为未通过、已定即锁（更正须填原因）。
import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { ResultTab } from './index';

jest.mock('../../api/manage/interviewAdmin', () => ({
  ...jest.requireActual('../../api/manage/interviewAdmin'),
  listAllResults: jest.fn(),
  listSchedulesRoster: jest.fn(),
  listPreAdmission: jest.fn(),
  batchDecision: jest.fn(),
  getResultSummary: jest.fn(),
  updateResult: jest.fn(),
}));
jest.mock('../../api/manage/interviewEvaluation', () => ({
  ...jest.requireActual('../../api/manage/interviewEvaluation'),
  getEvaluationSummary: jest.fn(),
}));
jest.mock('../../utils', () => ({
  ...jest.requireActual('../../utils'),
  request: jest.fn(),
}));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const api = require('../../api/manage/interviewAdmin');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const evalApi = require('../../api/manage/interviewEvaluation');

const DEPTS = [{ deptId: 1, deptName: '技术部' }, { deptId: 2, deptName: '项目部' }];

beforeEach(() => {
  api.listAllResults.mockResolvedValue({ data: { interviewResults: [
    // 待定、有评价
    { resultId: 1, scheduleId: 11, userId: 101, userName: '甲待定', decision: 0, evalTotalScore: 21 },
    // 已录取到技术部
    { resultId: 2, scheduleId: 12, userId: 102, userName: '乙录技术', decision: 1, assignedDeptId: 1 },
    // 已录取到项目部
    { resultId: 3, scheduleId: 13, userId: 103, userName: '丙录项目', decision: 1, assignedDeptId: 2 },
    // 待定、线上、还没评价
    { resultId: 4, scheduleId: null, userId: 104, userName: '丁线上', decision: 0, onlineInterview: true },
    // 已婉拒
    { resultId: 5, scheduleId: 15, userId: 105, userName: '戊婉拒', decision: 2 },
  ], total: 5 } });
  api.listSchedulesRoster.mockResolvedValue({ data: [] });
  api.listPreAdmission.mockResolvedValue({ data: { total: 0, candidates: [], departmentStats: [] } });
  api.batchDecision.mockResolvedValue({ data: { updated: 2, skipped: [] } });
  api.updateResult.mockResolvedValue({ data: null });
  const dept = (deptId: number, deptName: string, admitted: number) => ({
    deptId, deptName, firstChoice: 0, secondChoice: 0, preAdmitted: 0, admitted,
    admittedFirstChoice: admitted, admittedSecondChoice: 0, admittedOther: 0, admittedNotified: 0,
  });
  api.getResultSummary.mockResolvedValue({ data: {
    totals: { candidates: 5, pending: 2, adjusting: 0, admitted: 2, rejected: 1, inPreAdmission: 0, notified: 0 },
    departments: [dept(1, '技术部', 1), dept(2, '项目部', 1)],
  } });
  evalApi.getEvaluationSummary.mockResolvedValue({ data: {
    dimensions: [{ dimensionId: 7, name: '能力', maxScore: 10, weight: 1 }],
    candidates: [
      { scheduleId: 11, totalScore: 21, recommendation: 2, scores: { 7: 7 },
        dimensionNotes: { 7: '讲清楚了栈和队列的区别' }, dimensionWriters: { 7: { userId: 9, name: '陈睿' } },
        contributors: [{ userId: 9, name: '陈睿' }] },
      { scheduleId: 12, totalScore: 27, recommendation: 1, scores: { 7: 9 }, dimensionNotes: {}, contributors: [] },
    ],
  } });
});

const renderTab = async () => {
  render(<ResultTab cycleId={14} depts={DEPTS} />);
  await screen.findByText('甲待定');
};

describe('录取结果页', () => {
  it('上方列出各部门最终录了几个人，点部门只看录到那里的人', async () => {
    await renderTab();
    expect(screen.getByText(/已录取/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('技术部 1'));
    await waitFor(() => expect(screen.queryByText('丙录项目')).not.toBeInTheDocument());
    expect(screen.getByText('乙录技术')).toBeInTheDocument();
    expect(screen.queryByText('甲待定')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('看全部'));
    await screen.findByText('丙录项目');
  });

  it('「展开全部评价」后不用点抽屉就能看到各维度评语与署名', async () => {
    await renderTab();
    expect(screen.queryByText('讲清楚了栈和队列的区别')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('展开全部评价'));
    expect(await screen.findByText('讲清楚了栈和队列的区别')).toBeInTheDocument();
    expect(screen.getAllByText(/陈睿/).length).toBeGreaterThan(0);
  });

  it('待定全部标为未通过：只发待定的人（服务端再判一次）', async () => {
    await renderTab();
    fireEvent.click(screen.getByText('待定全部标为未通过（2）'));

    const dialog = await screen.findByRole('dialog');
    // antd 确认框的标题会渲染两份（一份给读屏），按「至少一处」断言
    expect(within(dialog).getAllByText('把 2 位待定的同学标为未通过？').length).toBeGreaterThan(0);
    // 最容易误伤的两类单独点出来
    expect(within(dialog).getByText(/1 人还没有任何面试评价/)).toBeInTheDocument();
    expect(within(dialog).getByText(/1 人是线上面试/)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByText('全部标为未通过'));
    await waitFor(() => expect(api.batchDecision).toHaveBeenCalledWith({
      cycleId: 14, resultIds: [1, 4], decision: 2,
    }));
  });

  const pick = async (placeholder: string, title: string) => {
    const select = screen.getByText(placeholder).closest('.ant-select') as HTMLElement;
    fireEvent.mouseDown(select.querySelector('.ant-select-selector') as HTMLElement);
    const option = await waitFor(() => {
      const el = document.querySelector(`.ant-select-item-option[title="${title}"]`);
      if (!el) throw new Error('下拉选项还没出来');
      return el as HTMLElement;
    });
    fireEvent.click(option);
  };

  it('按部门筛选时一键按钮禁用：未通过是最终结果、不分部门，按部门一键婉拒会误伤别的志愿', async () => {
    await renderTab();
    expect(screen.getByText('待定全部标为未通过（2）').closest('button')).not.toBeDisabled();
    await pick('按部门筛选', '技术部');
    await waitFor(() => expect(screen.getByText('待定全部标为未通过（2）').closest('button')).toBeDisabled());
  });

  it('按结果筛「通过」不影响一键按钮：它始终作用于全部待定的人', async () => {
    await renderTab();
    await pick('按结果筛选', '通过');
    await waitFor(() => expect(screen.queryByText('甲待定')).not.toBeInTheDocument());
    expect(screen.getByText('待定全部标为未通过（2）').closest('button')).not.toBeDisabled();
  });

  it('预录取名单里的人不算进一键标记，确认框里单独说明', async () => {
    api.listPreAdmission.mockResolvedValue({ data: { total: 1, departmentStats: [],
      candidates: [{ draftId: 1, cycleId: 14, resultId: 1, assignedDeptId: 1 }] } });
    await renderTab();
    fireEvent.click(await screen.findByText('待定全部标为未通过（1）'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/另有 1 位待定的同学在预录取名单里/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByText('全部标为未通过'));
    await waitFor(() => expect(api.batchDecision).toHaveBeenCalledWith({
      cycleId: 14, resultIds: [4], decision: 2,
    }));
  });

  it('录取统一走预录取：没有「批量录取」和「从面试安排生成名单」', async () => {
    await renderTab();
    expect(screen.queryByText(/^批量录取/)).not.toBeInTheDocument();
    expect(screen.queryByText('从面试安排生成名单')).not.toBeInTheDocument();
    expect(screen.getByText('预录取（已选 0）')).toBeInTheDocument();
  });

  it('已定的人不能勾选，行操作是「更正」；待定的人是「录入」', async () => {
    await renderTab();
    const rowOf = (name: string) => screen.getByText(name).closest('tr') as HTMLElement;
    expect(within(rowOf('乙录技术')).getByRole('checkbox')).toBeDisabled();
    expect(within(rowOf('甲待定')).getByRole('checkbox')).not.toBeDisabled();
    expect(within(rowOf('乙录技术')).getByText('更正')).toBeInTheDocument();
    expect(within(rowOf('甲待定')).getByText('录入')).toBeInTheDocument();
  });

  it('更正已定的结果：讲清后果，不填原因不提交，填了原因带上原因', async () => {
    await renderTab();
    const row = screen.getByText('乙录技术').closest('tr') as HTMLElement;
    fireEvent.click(within(row).getByText('更正'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('学生刷新页面就会看到新结果。')).toBeInTheDocument();
    expect(within(dialog).getByText(/对方可能已经扫码进群/)).toBeInTheDocument();

    // 改成未通过
    fireEvent.mouseDown(within(dialog).getByText('通过（录取）').closest('.ant-select-selector') as HTMLElement);
    const option = await waitFor(() => {
      const el = document.querySelector('.ant-select-item-option[title="未通过"]');
      if (!el) throw new Error('下拉选项还没出来');
      return el as HTMLElement;
    });
    fireEvent.click(option);

    fireEvent.click(within(dialog).getByText('确认更正'));
    expect(api.updateResult).not.toHaveBeenCalled();

    fireEvent.change(within(dialog).getByPlaceholderText(/复核发现/), { target: { value: '面试记录记错了人' } });
    fireEvent.click(within(dialog).getByText('确认更正'));
    await waitFor(() => expect(api.updateResult).toHaveBeenCalledWith(2, {
      decision: 2, assignedDeptId: undefined, reason: '面试记录记错了人',
    }));
  });

  it('预录取名单里的人：结果列标出拟录取部门，录入置灰，要到预录取页处理', async () => {
    api.listPreAdmission.mockResolvedValue({ data: { total: 1, departmentStats: [],
      candidates: [{ draftId: 1, cycleId: 14, resultId: 1, assignedDeptId: 1, departmentName: '技术部' }] } });
    await renderTab();
    const row = screen.getByText('甲待定').closest('tr') as HTMLElement;
    expect(await within(row).findByText('预录取·技术部')).toBeInTheDocument();
    expect(within(row).getByText('录入').closest('button')).toBeDisabled();
  });
});
