// 周期复盘 · 报告分区的行为守卫。重点:
//   1. 报告生成没有开启(503)显示成「未开启」,不是出错;已有的报告照常可读可发布
//   2. 生成是后台任务:「生成中」要有自己的状态并自动刷新,不假设立刻有正文
//   3. 发布要二次确认,失败原因留在页面上
//   4. 被守卫删掉的句子(unverified)要让管理员看得到
//   5. 旧版 Agent 没有这些接口(404)时正常降级
//
// 取元素的小工具直接走 DOM(closest / querySelector):要定位 antd 的按钮与气泡确认框,
// Testing Library 没有对应的查询;getByRole 在这么大的 DOM 上太慢
/* eslint-disable testing-library/no-node-access */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Modal, message } from 'antd';
import ReportTab from '../ReportTab';

jest.mock('../../../api/manage/retrospectiveApis', () => ({
  runRetrospectiveReport: jest.fn(),
  getRetrospectiveReport: jest.fn(),
  listRetrospectiveReports: jest.fn(),
  publishRetrospectiveReport: jest.fn(),
}));
jest.mock('../../../api/manage/cycleApis', () => ({ getAllCycles: jest.fn() }));
// Markdown 渲染器依赖的 react-markdown 是纯 ESM,jest 里加载不了;这里只关心正文有没有交给它
jest.mock('../../../components/AgentChat/Markdown', () => ({
  __esModule: true,
  default: ({ content }: { content: string }) => <div data-testid="report-md">{content}</div>,
}));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const api = require('../../../api/manage/retrospectiveApis');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cycleApi = require('../../../api/manage/cycleApis');

const CYCLES = [
  { cycleId: 1, cycleName: '上届招新', startDate: '2000-09-01' },
  { cycleId: 2, cycleName: '本届招新', startDate: '2001-09-01' },
];

const signIn = (codes: string[]) => {
  const part = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64');
  localStorage.setItem('token', `${part({ alg: 'none' })}.${part({ permissionCodes: codes })}.x`);
};

const row = (version: number, status: string, over: any = {}) => ({
  cycle_id: 2, version, status, metrics_schema: 'cycle_metrics/v1', snapshot_version: 3,
  baseline_cycle_id: null, error: null, created_by: 7, created_at: '2026-11-12T08:30:00+08:00',
  finished_at: '2026-11-12T08:34:00+08:00', published_by: null, published_at: null, ...over,
});
const report = (version: number, status: string, over: any = {}) => ({
  ...row(version, status),
  sections: {
    summary: { text: '本届投递增长', metric_ids: ['funnel.resumes_total'] },
    sections: [
      { role: 'data', title: '招新漏斗与部门', status: 'ok', items: [], findings: [] },
      { role: 'qa', title: '对话与知识库', status: 'ok', items: [], findings: [] },
      { role: 'evaluation', title: '初筛与出题', status: 'ok', items: [], findings: [] },
    ],
    lessons: [], rubric_candidates: [], writer_status: 'ok',
  },
  report_md: '# 本届复盘\n\n投递数比上届多。',
  unverified: [],
  usage: { input_tokens: 5200, output_tokens: 610 },
  ...over,
});
const list = (...items: any[]) => ({ data: { items, total: items.length } });

const clickButton = (text: string | RegExp) =>
  fireEvent.click(screen.getByText(text).closest('button') as HTMLElement);
const buttonOf = (text: string) => screen.getByText(text).closest('button') as HTMLButtonElement;
/** 点气泡确认框里的确认按钮 */
const confirmPop = async () => {
  const ok = await waitFor(() => {
    const btn = document.querySelector('.ant-popconfirm .ant-btn-primary') as HTMLElement | null;
    if (!btn) throw new Error('没有出现确认框');
    return btn;
  });
  fireEvent.click(ok);
};

let toast: Record<'success' | 'error', jest.SpyInstance>;

beforeEach(() => {
  signIn(['resume:audit', 'evaluation:run']);
  cycleApi.getAllCycles.mockResolvedValue({ data: CYCLES });
  api.listRetrospectiveReports.mockResolvedValue(list(row(2, 'draft'), row(1, 'published')));
  api.getRetrospectiveReport.mockResolvedValue({ data: report(2, 'draft') });
  api.runRetrospectiveReport.mockResolvedValue({
    data: { cycle_id: 2, version: 3, status: 'generating', snapshot_version: 4, baseline_cycle_id: null },
  });
  api.publishRetrospectiveReport.mockResolvedValue({
    data: { cycle_id: 2, version: 2, status: 'published', published_by: 7, published_at: '2026-11-12T09:00:00+08:00' },
  });
  toast = {
    success: jest.spyOn(message, 'success').mockImplementation(() => (() => {}) as any),
    error: jest.spyOn(message, 'error').mockImplementation(() => (() => {}) as any),
  };
});

afterEach(() => {
  Modal.destroyAll();
  jest.restoreAllMocks();
  jest.clearAllMocks();
  localStorage.clear();
});

describe('接口还不存在时', () => {
  it('版本列表 404:说明暂不可用,不白屏,也不去取报告、不摆生成按钮', async () => {
    api.listRetrospectiveReports.mockRejectedValue({ status: 404, message: 'Not Found' });
    render(<ReportTab />);
    expect(await screen.findByText('复盘报告暂不可用')).toBeInTheDocument();
    expect(api.getRetrospectiveReport).not.toHaveBeenCalled();
    expect(screen.queryByText('生成报告')).not.toBeInTheDocument();
  });

  it('其他错误:显示服务端文案并可重试', async () => {
    api.listRetrospectiveReports.mockRejectedValueOnce({ status: 500, message: '查询失败,请稍后重试' });
    render(<ReportTab />);
    expect(await screen.findByText('查询失败,请稍后重试')).toBeInTheDocument();
    clickButton(/^重\s?试$/);
    expect(await screen.findByTestId('report-md')).toBeInTheDocument();
  });

  it('报告返回体缺字段:给出说明,不崩', async () => {
    api.getRetrospectiveReport.mockResolvedValue({ data: { cycle_id: 2 } });
    render(<ReportTab />);
    expect(await screen.findByText(/返回格式与预期不符/)).toBeInTheDocument();
  });
});

describe('查看报告', () => {
  it('默认读最新一版,正文交给 Markdown 渲染', async () => {
    render(<ReportTab />);
    expect(await screen.findByTestId('report-md')).toHaveTextContent('本届复盘');
    expect(api.listRetrospectiveReports).toHaveBeenCalledWith(2);
    expect(api.getRetrospectiveReport).toHaveBeenCalledWith({ cycle_id: 2 });
    expect(screen.getByText('草稿')).toBeInTheDocument();
  });

  it('这个周期还没有报告:空状态,不是出错', async () => {
    api.listRetrospectiveReports.mockResolvedValue(list());
    render(<ReportTab />);
    expect(await screen.findByText('这个周期还没有复盘报告。')).toBeInTheDocument();
    expect(api.getRetrospectiveReport).not.toHaveBeenCalled();
  });

  it('只有查看权:说明草稿看不到,不摆生成与发布按钮', async () => {
    signIn(['resume:audit']);
    api.listRetrospectiveReports.mockResolvedValue(list());
    render(<ReportTab />);
    expect(await screen.findByText(/还没有已发布的复盘报告/)).toBeInTheDocument();
    expect(screen.queryByText('生成报告')).not.toBeInTheDocument();
  });

  it('只有查看权时列表里有、读却 404:显示接口给的说明,不当成接口不存在', async () => {
    signIn(['resume:audit']);
    api.getRetrospectiveReport.mockRejectedValue({ status: 404, message: '该周期还没有已发布的报告' });
    render(<ReportTab />);
    expect(await screen.findByText('该周期还没有已发布的报告')).toBeInTheDocument();
    expect(screen.queryByText('复盘报告暂不可用')).not.toBeInTheDocument();
  });

  it('被守卫删掉的句子要列出来,带位置和原因', async () => {
    api.getRetrospectiveReport.mockResolvedValue({
      data: report(2, 'draft', {
        unverified: [{ where: 'summary', text: '投递数增长了 80%', reason: '快照里没有这个数' }],
      }),
    });
    render(<ReportTab />);
    expect(await screen.findByText('有 1 处内容没有进入报告')).toBeInTheDocument();
    expect(screen.getByText('投递数增长了 80%')).toBeInTheDocument();
    expect(screen.getByText(/快照里没有这个数/)).toBeInTheDocument();
  });

  it('撰稿人没有产出、某节分析员没有产出:审阅前先提示', async () => {
    const r = report(2, 'draft');
    r.sections.writer_status = 'failed';
    r.sections.sections[1].status = 'analyst_failed';
    api.getRetrospectiveReport.mockResolvedValue({ data: r });
    render(<ReportTab />);
    expect(await screen.findByText(/没有经过汇总/)).toBeInTheDocument();
    expect(screen.getByText(/「对话与知识库」这一节的分析员没有产出/)).toBeInTheDocument();
  });

  it('生成失败的版本:显示原因,没有正文也没有发布按钮', async () => {
    api.getRetrospectiveReport.mockResolvedValue({
      data: report(2, 'failed', { error: '生成超过 15 分钟,已判为失败', sections: {}, report_md: '' }),
    });
    render(<ReportTab />);
    expect(await screen.findByText('生成超过 15 分钟,已判为失败')).toBeInTheDocument();
    expect(screen.queryByTestId('report-md')).not.toBeInTheDocument();
    expect(screen.queryByText('发布这一版')).not.toBeInTheDocument();
  });

  it('已发布的版本没有发布按钮', async () => {
    api.getRetrospectiveReport.mockResolvedValue({
      data: report(1, 'published', { published_by: 7, published_at: '2026-11-12T09:00:00+08:00' }),
    });
    render(<ReportTab />);
    await screen.findByTestId('report-md');
    expect(screen.queryByText('发布这一版')).not.toBeInTheDocument();
  });
});

describe('生成中', () => {
  it('有自己的状态,不假设已经有正文;生成完自动显示', async () => {
    api.getRetrospectiveReport
      .mockResolvedValueOnce({ data: report(3, 'generating', { sections: {}, report_md: '' }) })
      .mockResolvedValue({ data: report(3, 'draft') });
    render(<ReportTab pollMs={20} />);
    expect(await screen.findByText('第 3 版报告正在生成')).toBeInTheDocument();
    expect(screen.queryByTestId('report-md')).not.toBeInTheDocument();

    expect(await screen.findByTestId('report-md')).toBeInTheDocument();
    expect(screen.queryByText('第 3 版报告正在生成')).not.toBeInTheDocument();
  });

  it('生成中时不能再点生成', async () => {
    api.getRetrospectiveReport.mockResolvedValue({ data: report(3, 'generating', { sections: {}, report_md: '' }) });
    render(<ReportTab pollMs={100000} />);
    await screen.findByText('第 3 版报告正在生成');
    expect(buttonOf('生成报告')).toBeDisabled();
  });
});

describe('生成报告', () => {
  it('要先确认;确认后带上周期,开始后提示并切到新版本', async () => {
    render(<ReportTab pollMs={100000} />);
    await screen.findByTestId('report-md');
    clickButton('生成报告');
    expect(api.runRetrospectiveReport).not.toHaveBeenCalled();
    await confirmPop();

    await waitFor(() => expect(api.runRetrospectiveReport).toHaveBeenCalledWith(2, null));
    await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1));
    expect(toast.success.mock.calls[0][0]).toContain('第 3 版');
    await waitFor(() =>
      expect(api.getRetrospectiveReport).toHaveBeenLastCalledWith({ cycle_id: 2, version: 3 }));
  });

  it('报告生成没有开启(503):显示成「还没有开启」,已有的报告照常显示', async () => {
    api.runRetrospectiveReport.mockRejectedValue({
      status: 503, message: '报告生成未开启;在配置里打开 retro_report_enabled 后可用',
    });
    render(<ReportTab />);
    await screen.findByTestId('report-md');
    clickButton('生成报告');
    await confirmPop();

    expect(await screen.findByText('报告生成还没有开启')).toBeInTheDocument();
    expect(screen.getByText('报告生成未开启;在配置里打开 retro_report_enabled 后可用')).toBeInTheDocument();
    expect(screen.queryByText('没有开始生成')).not.toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
    // 已有的报告还在,可以继续看、继续发布
    expect(screen.getByTestId('report-md')).toBeInTheDocument();
    expect(buttonOf('发布这一版')).toBeEnabled();
  });

  it('已有一份在生成(409):说明现在不能生成', async () => {
    api.runRetrospectiveReport.mockRejectedValue({ status: 409, message: '该周期已有一份报告在生成' });
    render(<ReportTab />);
    await screen.findByTestId('report-md');
    clickButton('生成报告');
    await confirmPop();
    expect(await screen.findByText('现在不能生成')).toBeInTheDocument();
    expect(screen.getByText('该周期已有一份报告在生成')).toBeInTheDocument();
  });
});

describe('发布', () => {
  const clickPublish = async () => {
    render(<ReportTab />);
    await screen.findByTestId('report-md');
    clickButton('发布这一版');
    // antd 的确认弹窗把标题渲染了两处(弹窗标题 + 确认框标题),所以用 findAll
    await screen.findAllByText('发布第 2 版复盘报告?');
  };

  it('要二次确认:点了按钮只弹确认,不直接发布', async () => {
    await clickPublish();
    expect(api.publishRetrospectiveReport).not.toHaveBeenCalled();
  });

  it('有被删掉的句子时,确认框里再提醒一次', async () => {
    api.getRetrospectiveReport.mockResolvedValue({
      data: report(2, 'draft', { unverified: [{ where: 'summary', text: 'x', reason: 'y' }] }),
    });
    await clickPublish();
    expect(screen.getByText(/这一版有 1 处内容因为对不上指标而没有进入报告/)).toBeInTheDocument();
  });

  it('确认后才发布;成功后提示并刷新', async () => {
    await clickPublish();
    clickButton('确认发布');
    await waitFor(() => expect(api.publishRetrospectiveReport).toHaveBeenCalledWith(2, 2));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('第 2 版报告已发布'));
    expect(api.listRetrospectiveReports.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('审计写入失败(503):原因留在页面上,并写明报告没有发布', async () => {
    api.publishRetrospectiveReport.mockRejectedValue({ status: 503, message: '审计写入失败,报告未发布' });
    await clickPublish();
    clickButton('确认发布');
    expect(await screen.findByText('审计写入失败,报告未发布')).toBeInTheDocument();
    expect(screen.getByText('报告没有发布,可以稍后重试。')).toBeInTheDocument();
    expect(buttonOf('发布这一版')).toBeEnabled();
  });
});
