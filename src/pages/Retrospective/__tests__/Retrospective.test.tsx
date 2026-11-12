// 周期复盘 · 指标快照页的行为守卫。重点:
//   1. 接口不存在(旧版 Agent / 代理没上线)时不白屏、不报错
//   2. 被抑制的小样本值显示「<5」等字样,绝不显示成 0
//   3. 基线比不了(409 等)时,本周期的数照常给
//
// 取元素的小工具直接走 DOM(closest / querySelector):要定位 antd 表格的行与 Select 的选项,
// Testing Library 没有对应的查询;getByRole 在这么大的 DOM 上太慢
/* eslint-disable testing-library/no-node-access */
import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { message } from 'antd';
import dayjs from 'dayjs';
import Retrospective from '../index';

jest.mock('../../../api/manage/retrospectiveApis', () => ({
  takeRetrospectiveSnapshot: jest.fn(),
  getRetrospectiveSnapshot: jest.fn(),
  listRetrospectiveSnapshots: jest.fn(),
}));
jest.mock('../../../api/manage/cycleApis', () => ({ getAllCycles: jest.fn() }));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const api = require('../../../api/manage/retrospectiveApis');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cycleApi = require('../../../api/manage/cycleApis');

// 日期取得足够远,默认选中的周期不随「今天」变化:已经开始的里面最新的是「本届」
const CYCLES = [
  { cycleId: 1, cycleName: '上届招新', startDate: '2000-09-01', endDate: '2000-10-15' },
  { cycleId: 2, cycleName: '本届招新', startDate: '2001-09-01', endDate: '2099-12-31' },
];

/** 不验签的假令牌,只为让页面读到权限码 */
const signIn = (codes: string[]) => {
  const part = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64');
  localStorage.setItem('token', `${part({ alg: 'none' })}.${part({ permissionCodes: codes })}.x`);
};

const m = (over: any) => ({ key: null, unit: 'count', suppressed: false, side: null, ...over });

const SNAPSHOT = {
  schema: 'cycle_metrics/v1',
  cycle_id: 2,
  window: { start: '2026-09-01T00:00:00+08:00', end: '2026-12-16T00:00:00+08:00', timezone: 'Asia/Shanghai' },
  small_cell_min: 5,
  params: { kb_min_score: 0.5 },
  domains: {
    funnel: { status: 'ok' },
    conversation: { status: 'ok' },
    agreement: { status: 'pending', reason: '该域指标暂缺,见目录' },
  },
  catalog: [
    { id: 'funnel.resumes_total', domain: 'funnel', name: '投递总数', definition: '该周期的简历总数', unit: 'count', status: 'ok', reason: '' },
    { id: 'funnel.decisions', domain: 'funnel', name: '各决定计数', definition: '按最终决定分格', unit: 'count', status: 'ok', reason: '' },
    { id: 'funnel.evaluated_candidates', domain: 'funnel', name: '已评价人数', definition: '', unit: 'count', status: 'ok', reason: '' },
    { id: 'conversation.error_rate', domain: 'conversation', name: '错误率', definition: '', unit: 'ratio', status: 'ok', reason: '' },
    { id: 'conversation.cache_hit_rate', domain: 'conversation', name: '缓存命中率', definition: '', unit: 'ratio', status: 'ok', reason: '' },
    { id: 'agreement.rank', domain: 'agreement', name: '排序一致率', definition: '', unit: 'ratio', status: 'pending', reason: '人工信号用哪一个还没定' },
  ],
  metrics: [
    m({ id: 'funnel.resumes_total', metric: 'funnel.resumes_total', value: 128, n: 128 }),
    m({ id: 'funnel.decisions[passed]', metric: 'funnel.decisions', key: 'passed', value: 40, n: 40 }),
    m({ id: 'funnel.decisions[rejected]', metric: 'funnel.decisions', key: 'rejected', value: null, n: null, suppressed: true, side: 'low' }),
    m({ id: 'conversation.error_rate', metric: 'conversation.error_rate', unit: 'ratio', value: null, n: 300, suppressed: true, side: 'low' }),
    m({ id: 'conversation.cache_hit_rate', metric: 'conversation.cache_hit_rate', unit: 'ratio', value: 0.8125, n: 290 }),
  ],
  absent: [{ id: 'funnel.evaluated_candidates', reason: '该周期没开评价表' }],
};

const response = (snapshot: any = SNAPSHOT, over: any = {}) => ({
  data: {
    cycle_id: 2, version: 3, metrics_schema: 'cycle_metrics/v1', taken_by: 7,
    taken_at: '2026-11-12T08:30:00+08:00', snapshot, ...over,
  },
});

const VERSIONS = {
  data: {
    items: [
      { cycle_id: 2, version: 3, taken_at: '2026-11-12T08:30:00+08:00', domains: SNAPSHOT.domains },
      { cycle_id: 2, version: 2, taken_at: '2026-11-01T08:30:00+08:00', domains: { funnel: { status: 'unavailable' } } },
    ],
    total: 2,
  },
};

const rowOf = (text: string) => screen.getByText(text).closest('tr') as HTMLElement;
const clickButton = (text: string | RegExp) =>
  fireEvent.click(screen.getByText(text).closest('button') as HTMLElement);

const pick = async (selectLabel: string, optionText: string) => {
  // antd 把 aria-label 同时放在外层与内部输入框上,取外层再找到可点的选择框
  const selector = screen.getAllByLabelText(selectLabel)[0]
    .closest('.ant-select')?.querySelector('.ant-select-selector') as HTMLElement;
  fireEvent.mouseDown(selector);
  const option = await waitFor(() => {
    const found = Array.from(document.querySelectorAll('.ant-select-item-option'))
      .find((n) => n.textContent === optionText);
    if (!found) throw new Error(`下拉里没有「${optionText}」`);
    return found;
  });
  fireEvent.click(option);
};

let toast: Record<'success' | 'info' | 'warning' | 'error', jest.SpyInstance>;

beforeEach(() => {
  signIn(['resume:audit', 'evaluation:run']);
  cycleApi.getAllCycles.mockResolvedValue({ data: CYCLES });
  api.listRetrospectiveSnapshots.mockResolvedValue(VERSIONS);
  api.getRetrospectiveSnapshot.mockResolvedValue(response());
  api.takeRetrospectiveSnapshot.mockResolvedValue(response(SNAPSHOT, { version: 4, created: true }));
  toast = {
    success: jest.spyOn(message, 'success').mockImplementation(() => (() => {}) as any),
    info: jest.spyOn(message, 'info').mockImplementation(() => (() => {}) as any),
    warning: jest.spyOn(message, 'warning').mockImplementation(() => (() => {}) as any),
    error: jest.spyOn(message, 'error').mockImplementation(() => (() => {}) as any),
  };
});

afterEach(() => {
  Object.values(toast).forEach((spy) => spy.mockRestore());
  jest.clearAllMocks();
  localStorage.clear();
});

describe('接口还不存在时', () => {
  it('版本列表 404:说明暂不可用,不白屏,也不再去取快照', async () => {
    api.listRetrospectiveSnapshots.mockRejectedValue({ status: 404, message: 'Not Found' });
    render(<Retrospective />);
    expect(await screen.findByText('指标快照暂不可用')).toBeInTheDocument();
    expect(api.getRetrospectiveSnapshot).not.toHaveBeenCalled();
    // 接口都没有,采集按钮也不该摆出来
    expect(screen.queryByText('采集快照')).not.toBeInTheDocument();
  });

  it('其他错误:显示服务端文案并可重试', async () => {
    api.listRetrospectiveSnapshots.mockRejectedValueOnce({ status: 403, message: '需要 resume:audit 权限' });
    render(<Retrospective />);
    expect(await screen.findByText('需要 resume:audit 权限')).toBeInTheDocument();

    clickButton(/^重\s?试$/);
    expect(await screen.findByText('投递总数')).toBeInTheDocument();
  });

  it('返回体里没有 snapshot:给出说明,不崩', async () => {
    api.getRetrospectiveSnapshot.mockResolvedValue({ data: { cycle_id: 2, version: 3 } });
    render(<Retrospective />);
    expect(await screen.findByText(/返回格式与预期不符/)).toBeInTheDocument();
  });

  it('周期列表取不到:提示并可重试', async () => {
    cycleApi.getAllCycles.mockRejectedValueOnce({ status: 500, message: '服务器开小差了' });
    render(<Retrospective />);
    expect(await screen.findByText(/招新周期列表加载失败/)).toBeInTheDocument();
    expect(api.listRetrospectiveSnapshots).not.toHaveBeenCalled();

    clickButton(/^重\s?试$/);
    expect(await screen.findByText('投递总数')).toBeInTheDocument();
  });
});

describe('周期还没有快照', () => {
  beforeEach(() => {
    api.listRetrospectiveSnapshots.mockResolvedValue({ data: { items: [], total: 0 } });
  });

  it('有执行权:空态里给采集入口', async () => {
    render(<Retrospective />);
    expect(await screen.findByText(/这个周期还没有指标快照/)).toBeInTheDocument();
    expect(screen.getByText('采集快照')).toBeInTheDocument();
    expect(api.getRetrospectiveSnapshot).not.toHaveBeenCalled();
  });

  it('只有查看权:不摆采集按钮,并说明需要的权限', async () => {
    signIn(['resume:audit']);
    render(<Retrospective />);
    expect(await screen.findByText(/采集需要 evaluation:run 权限/)).toBeInTheDocument();
    expect(screen.queryByText('采集快照')).not.toBeInTheDocument();
  });
});

describe('查看快照', () => {
  it('默认取已开始的周期里最新的一个,读它的最新一版', async () => {
    render(<Retrospective />);
    await screen.findByText('投递总数');
    expect(api.listRetrospectiveSnapshots).toHaveBeenCalledWith(2);
    expect(api.getRetrospectiveSnapshot).toHaveBeenCalledWith({ cycle_id: 2 });
    expect(screen.getByText('第 3 版')).toBeInTheDocument();
    expect(screen.getByText('2026-09-01 00:00 ~ 2026-12-16 00:00(Asia/Shanghai)')).toBeInTheDocument();
  });

  it('被抑制的计数显示「<5」,不显示成 0', async () => {
    render(<Retrospective />);
    await screen.findByText('投递总数');
    const row = rowOf('rejected');
    expect(within(row).getByText('<5')).toBeInTheDocument();
    expect(within(row).queryByText('0')).not.toBeInTheDocument();
  });

  it('被抑制的比率显示「不足 5 / n」,正常的比率显示百分比', async () => {
    render(<Retrospective />);
    await screen.findByText('投递总数');
    expect(within(rowOf('错误率')).getByText('不足 5 / 300')).toBeInTheDocument();
    expect(within(rowOf('错误率')).queryByText(/^0/)).not.toBeInTheDocument();
    expect(within(rowOf('缓存命中率')).getByText('81.25%')).toBeInTheDocument();
  });

  it('暂缺与本次未取到的指标各有标注,不留空也不写 0', async () => {
    render(<Retrospective />);
    await screen.findByText('投递总数');
    expect(within(rowOf('排序一致率')).getByText('暂缺')).toBeInTheDocument();
    expect(within(rowOf('已评价人数')).getByText('本次未取到')).toBeInTheDocument();
  });

  it('有域没采到:提示稍后重新采集', async () => {
    api.getRetrospectiveSnapshot.mockResolvedValue(response({
      ...SNAPSHOT,
      domains: { ...SNAPSHOT.domains, conversation: { status: 'unavailable', reason: '对话日志库连不上' } },
    }));
    render(<Retrospective />);
    expect(await screen.findByText(/有 1 个数据域没有采到/)).toBeInTheDocument();
    expect(screen.getByText('对话助理:对话日志库连不上')).toBeInTheDocument();
  });

  it('没有基线时不出「基线周期 / 变化」两列', async () => {
    render(<Retrospective />);
    await screen.findByText('投递总数');
    expect(screen.queryByText('基线周期')).not.toBeInTheDocument();
  });

  it('切到指定版本时带上 version', async () => {
    render(<Retrospective />);
    await screen.findByText('投递总数');
    // 版本下拉里的时间按浏览器所在时区显示。期望值用同一种方式算出来,
    // 不能写死成某个时区下的样子——CI 跑在 UTC,写死东八区的「08:30」在那里永远对不上
    const takenAt = dayjs(VERSIONS.data.items[1].taken_at).format('MM-DD HH:mm');
    await pick('快照版本', `第 2 版 · ${takenAt} · 有缺域`);
    await waitFor(() =>
      expect(api.getRetrospectiveSnapshot).toHaveBeenLastCalledWith({ cycle_id: 2, version: 2 }));
  });
});

describe('对比基线', () => {
  const COMPARED = {
    ...SNAPSHOT,
    baseline: { cycle_id: 1, schema: 'cycle_metrics/v1' },
    metrics: SNAPSHOT.metrics.map((x) =>
      x.id === 'funnel.resumes_total'
        ? { ...x, prev: 110, delta: 18, delta_ratio: 0.1636 }
        : x.id === 'conversation.cache_hit_rate'
          ? { ...x, prev: 0.8, delta: 0.0125, delta_ratio: null }
          : { ...x, prev: null, delta: null, delta_ratio: null }),
  };

  it('选了基线:请求带 baseline_cycle_id,并显示基线值与变化', async () => {
    render(<Retrospective />);
    await screen.findByText('投递总数');
    api.getRetrospectiveSnapshot.mockResolvedValue(response(COMPARED));
    await pick('对比基线', '上届招新');

    await waitFor(() =>
      expect(api.getRetrospectiveSnapshot).toHaveBeenLastCalledWith({ cycle_id: 2, baseline_cycle_id: 1 }));
    expect((await screen.findAllByText('基线周期')).length).toBeGreaterThan(0);
    expect(within(rowOf('投递总数')).getByText('110')).toBeInTheDocument();
    expect(within(rowOf('投递总数')).getByText('+18(+16.36%)')).toBeInTheDocument();
    // 比率是百分点差
    expect(within(rowOf('缓存命中率')).getByText('+1.25 个百分点')).toBeInTheDocument();
  });

  it('基线比不了(409):说明原因,本周期的数照常显示', async () => {
    render(<Retrospective />);
    await screen.findByText('投递总数');
    api.getRetrospectiveSnapshot.mockImplementation(async (params: any) => {
      if (params.baseline_cycle_id != null) {
        return Promise.reject({ status: 409, message: '基线周期没有 cycle_metrics/v1 版指标定义的快照,不能对比' });
      }
      return response();
    });
    await pick('对比基线', '上届招新');

    expect(await screen.findByText(/没有与「上届招新」对比:基线周期没有 cycle_metrics\/v1/)).toBeInTheDocument();
    expect(screen.getByText('投递总数')).toBeInTheDocument();
    expect(screen.queryByText('基线周期')).not.toBeInTheDocument();
  });
});

describe('采集快照', () => {
  it('落了新版本:提示版本号并刷新', async () => {
    render(<Retrospective />);
    await screen.findByText('投递总数');
    clickButton('采集快照');

    await waitFor(() => expect(api.takeRetrospectiveSnapshot).toHaveBeenCalledWith(2));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('已采集并保存为第 4 版'));
    await waitFor(() => expect(api.listRetrospectiveSnapshots).toHaveBeenCalledTimes(2));
  });

  it('内容与最新一版相同:说明没有新增版本,不说成「已保存」', async () => {
    api.takeRetrospectiveSnapshot.mockResolvedValue(response(SNAPSHOT, { version: 3, created: false }));
    render(<Retrospective />);
    await screen.findByText('投递总数');
    clickButton('采集快照');

    await waitFor(() => expect(toast.info).toHaveBeenCalledWith('内容与第 3 版相同,没有新增版本'));
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('采集成功但有域没采到:额外提醒稍后重采', async () => {
    api.takeRetrospectiveSnapshot.mockResolvedValue(response(
      { ...SNAPSHOT, domains: { funnel: { status: 'unavailable', reason: '后端统计接口超时' } } },
      { version: 4, created: true },
    ));
    render(<Retrospective />);
    await screen.findByText('投递总数');
    clickButton('采集快照');

    await waitFor(() => expect(toast.warning).toHaveBeenCalledTimes(1));
    expect(toast.warning.mock.calls[0][0]).toContain('招新漏斗');
  });

  it('采集失败:显示服务端文案', async () => {
    api.takeRetrospectiveSnapshot.mockRejectedValue({ status: 500, message: '采集指标失败,请稍后重试' });
    render(<Retrospective />);
    await screen.findByText('投递总数');
    clickButton('采集快照');

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('采集指标失败,请稍后重试'));
  });

  it('只有查看权时没有采集按钮', async () => {
    signIn(['resume:audit']);
    render(<Retrospective />);
    await screen.findByText('投递总数');
    expect(screen.queryByText('采集快照')).not.toBeInTheDocument();
  });
});
