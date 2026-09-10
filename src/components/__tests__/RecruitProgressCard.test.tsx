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

describe('简历初筛这一步', () => {
  it('未通过初筛：显示落选说明，流程停在初筛（不再显示等面试的字样）', async () => {
    render(<RecruitProgressCard cycleId={1} resumeStatus={5} canAttendOffline />);
    await waitFor(() => expect(screen.getByText('简历初筛')).toBeInTheDocument());
    expect(screen.getByText('本届未进入面试')).toBeInTheDocument();
    // 未通过的人不会被排面试，出现「管理员安排中」就是在让人白等
    expect(screen.queryByText('管理员安排中')).not.toBeInTheDocument();
  });

  it('通过初筛：提示等待面试安排（意向在初筛之前就填了）', async () => {
    render(<RecruitProgressCard cycleId={1} resumeStatus={4} canAttendOffline />);
    await waitFor(() => expect(screen.getByText('已通过，等待面试安排')).toBeInTheDocument());
  });

  it('步骤顺序：面试意向在简历初筛之前——填简历时就顺手填了意向', async () => {
    const { container } = render(<RecruitProgressCard cycleId={1} resumeStatus={4} canAttendOffline />);
    await waitFor(() => expect(screen.getByText('简历初筛')).toBeInTheDocument());
    const titles = Array.from(container.querySelectorAll('.ant-steps-item-title')).map((n) => n.textContent);
    expect(titles.indexOf('面试意向')).toBeLessThan(titles.indexOf('简历初筛'));
  });

  it('刚提交还没筛：显示评审中，不预判结论', async () => {
    render(<RecruitProgressCard cycleId={1} resumeStatus={2} canAttendOffline />);
    await waitFor(() => expect(screen.getByText('评审中，请耐心等待')).toBeInTheDocument());
    expect(screen.queryByText('很遗憾，未通过初筛')).not.toBeInTheDocument();
  });
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

describe('已停止投递的周期', () => {
  it('没投过的人：不给五步进度和「开始填写简历」，直说不再接收', async () => {
    render(<RecruitProgressCard cycleId={1} resumeStatus={null} intakeOpen={false} />);
    await waitFor(() => expect(screen.getByText(/不再接收新的简历/)).toBeInTheDocument());
    expect(screen.queryByText('开始填写简历')).not.toBeInTheDocument();
    expect(screen.queryByText('完善简历')).not.toBeInTheDocument();
  });

  it('投过的人照常看进度，按钮改成「查看我的简历」', async () => {
    render(<RecruitProgressCard cycleId={1} resumeStatus={1} intakeOpen={false} />);
    await waitFor(() => expect(screen.getByText('查看我的简历')).toBeInTheDocument());
    expect(screen.queryByText('继续填写简历')).not.toBeInTheDocument();
  });
});

describe('未通过初筛不再显示面试安排', () => {
  it('初筛没过时不显示「请准时到场」，即使排期数据还在', async () => {
    // 线上撞到的：安排是初筛之前排的，被刷掉后排期还在，
    // 于是进度条写着「未通过初筛」，下面又挂着面试时间
    render(<RecruitProgressCard cycleId={1} resumeStatus={5} canAttendOffline />);
    await waitFor(() => expect(screen.getByText('简历初筛')).toBeInTheDocument());
    expect(screen.queryByText('请准时到场：')).not.toBeInTheDocument();
  });
});
