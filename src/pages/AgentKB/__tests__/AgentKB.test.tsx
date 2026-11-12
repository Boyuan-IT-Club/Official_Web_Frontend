// 知识库页「招新周期」绑定的行为守卫。重点在几条容易悄悄出错的:
//   1. 绑定的周期不在开放期 → 列表与表单都要明说「检索不到」
//   2. 周期接口挂了 → 页面照常可用,已有绑定原样回写,不能被清成常青
//   3. 旧版 Agent 不返回/不认识 cycle_id → 按常青显示;绑定被丢掉时要告诉管理员
//
// 下面几个取元素的小工具直接走 DOM(closest / querySelector):要定位的是 antd 表格的行
// 和 Select 的内部节点,Testing Library 没有对应的查询;getByRole 能定位行,但太慢(见 clickButton)
/* eslint-disable testing-library/no-node-access */
import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { message } from 'antd';
import AgentKB from '../index';

jest.mock('../../../api/manage/agentApis', () => ({
  listKbSources: jest.fn(),
  getKbSource: jest.fn(),
  createKbSource: jest.fn(),
  updateKbSource: jest.fn(),
  setKbSourceEnabled: jest.fn(),
  deleteKbSource: jest.fn(),
  reembedKbSource: jest.fn(),
}));
jest.mock('../../../api/manage/cycleApis', () => ({
  getAllCycles: jest.fn(),
  getOpenCycles: jest.fn(),
}));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const kb = require('../../../api/manage/agentApis');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cycleApi = require('../../../api/manage/cycleApis');

const row = (over: any) => ({
  type: 'faq', kind: 'normal', tags: [], enabled: true, updated_by: 'user:1', chunk_count: 1,
  question: '问', answer: '答', ...over,
});

const ROWS = [
  // 旧版 Agent 的返回:根本没有 cycle_id 字段
  row({ source_id: 'kb_evergreen', title: '社团简介' }),
  row({ source_id: 'kb_open', title: '本届面试地点', cycle_id: 2 }),
  row({ source_id: 'kb_ended', title: '上届面试地点', cycle_id: 1 }),
];

// 日期取得足够远,测试不随「今天」变化
const CYCLES = [
  { cycleId: 1, cycleName: '上届招新', startDate: '2000-09-01', endDate: '2000-10-15' },
  { cycleId: 2, cycleName: '本届招新', startDate: '2000-11-01', endDate: '2099-12-31' },
];

const rowOf = (title: string) => screen.getByText(title).closest('tr') as HTMLElement;

// 按文字找按钮而不是 getByRole:后者在「表格 + 弹窗」这么大的 DOM 上一次要算上秒
const clickButton = (text: string | RegExp) =>
  fireEvent.click(screen.getByText(text).closest('button') as HTMLElement);

/** 周期选择器当前显示的文字 */
const shownCycle = () =>
  screen.getByLabelText('招新周期').closest('.ant-select')
    ?.querySelector('.ant-select-selection-item')?.textContent;

const pickCycle = async (label: string) => {
  fireEvent.mouseDown(screen.getByLabelText('招新周期'));
  const option = await waitFor(() => {
    const found = Array.from(document.querySelectorAll('.ant-select-item-option'))
      .find((n) => n.textContent === label);
    if (!found) throw new Error(`选择器里没有「${label}」`);
    return found;
  });
  fireEvent.click(option);
};

const openEdit = async (title: string) => {
  fireEvent.click(within(rowOf(title)).getByText(/编\s?辑/));
  await screen.findByText('保存并重嵌');
};

let warn: jest.SpyInstance;

beforeEach(() => {
  kb.listKbSources.mockResolvedValue({ data: { items: ROWS, total: ROWS.length } });
  kb.getKbSource.mockImplementation(async (id: string) => ({
    data: ROWS.find((r) => r.source_id === id),
  }));
  kb.createKbSource.mockResolvedValue({ data: { source_id: 'kb_new' } });
  kb.updateKbSource.mockResolvedValue({ data: {} });
  cycleApi.getAllCycles.mockResolvedValue({ data: CYCLES });
  cycleApi.getOpenCycles.mockResolvedValue({ data: [{ cycleId: 2, cycleName: '本届招新' }] });
  warn = jest.spyOn(message, 'warning').mockImplementation(() => (() => {}) as any);
});

afterEach(() => {
  warn.mockRestore();
  jest.clearAllMocks();
});

describe('列表里的周期绑定', () => {
  it('没有 cycle_id 字段的条目按常青显示,不报错', async () => {
    render(<AgentKB />);
    await screen.findByText('社团简介');
    expect(within(rowOf('社团简介')).getByText('常青')).toBeInTheDocument();
  });

  it('绑定开放中的周期:显示周期名,没有警示', async () => {
    render(<AgentKB />);
    const tag = await screen.findByText('本届招新');
    expect(rowOf('本届面试地点')).toContainElement(tag);
    expect(within(rowOf('本届面试地点')).queryByText('现在不会被检索到')).not.toBeInTheDocument();
  });

  it('绑定的周期已结束:标出状态并明说现在检索不到', async () => {
    render(<AgentKB />);
    await screen.findByText('上届招新 · 已结束');
    expect(within(rowOf('上届面试地点')).getByText('现在不会被检索到')).toBeInTheDocument();
    // 只有这一条该报
    expect(screen.getAllByText('现在不会被检索到')).toHaveLength(1);
  });
});

describe('周期接口取不到时', () => {
  beforeEach(() => {
    cycleApi.getAllCycles.mockRejectedValue({ status: 500, message: '服务器开小差了' });
    cycleApi.getOpenCycles.mockRejectedValue({ status: 500, message: '服务器开小差了' });
  });

  it('列表照常显示,绑定退回「周期 #id」,且不误报检索不到', async () => {
    render(<AgentKB />);
    await screen.findByText(/招新周期信息加载失败/);
    expect(screen.getByText('社团简介')).toBeInTheDocument();
    expect(within(rowOf('上届面试地点')).getByText('周期 #1')).toBeInTheDocument();
    expect(screen.queryByText('现在不会被检索到')).not.toBeInTheDocument();
  });

  it('编辑其他字段后保存,原绑定原样带回去', async () => {
    render(<AgentKB />);
    await screen.findByText(/招新周期信息加载失败/);
    await openEdit('上届面试地点');
    await waitFor(() => expect(shownCycle()).toBe('周期 #1'));

    fireEvent.change(screen.getByLabelText('标题'), { target: { value: '上届面试地点(改)' } });
    clickButton('保存并重嵌');

    await waitFor(() => expect(kb.updateKbSource).toHaveBeenCalledTimes(1));
    expect(kb.updateKbSource).toHaveBeenCalledWith(
      'kb_ended',
      expect.objectContaining({ title: '上届面试地点(改)', cycle_id: 1 }),
    );
  });

  it('点重试会重新取周期,取到后恢复正常', async () => {
    render(<AgentKB />);
    await screen.findByText(/招新周期信息加载失败/);
    cycleApi.getAllCycles.mockResolvedValue({ data: CYCLES });
    cycleApi.getOpenCycles.mockResolvedValue({ data: [{ cycleId: 2 }] });

    clickButton(/^重\s?试$/);

    await screen.findByText('上届招新 · 已结束');
    expect(screen.queryByText(/招新周期信息加载失败/)).not.toBeInTheDocument();
  });
});

describe('表单里的周期选择', () => {
  const fillFaq = () => {
    fireEvent.change(screen.getByLabelText('标题'), { target: { value: '新条目' } });
    fireEvent.change(screen.getByLabelText('问题'), { target: { value: '怎么报名' } });
    fireEvent.change(screen.getByLabelText('回答'), { target: { value: '官网报名' } });
  };
  const openCreate = async () => {
    render(<AgentKB />);
    await screen.findByText('社团简介');
    clickButton('新建条目');
    await screen.findByText('创建并入库');
  };

  it('新建默认常青,请求里显式带 cycle_id: null', async () => {
    await openCreate();
    expect(shownCycle()).toBe('常青(不绑定周期)');
    fillFaq();
    clickButton('创建并入库');

    await waitFor(() => expect(kb.createKbSource).toHaveBeenCalledTimes(1));
    const payload = kb.createKbSource.mock.calls[0][0];
    expect(payload).toHaveProperty('cycle_id', null);
  });

  it('选了周期就带上该周期 id', async () => {
    await openCreate();
    fillFaq();
    await pickCycle('本届招新(开放中)');
    clickButton('创建并入库');

    await waitFor(() => expect(kb.createKbSource).toHaveBeenCalledTimes(1));
    expect(kb.createKbSource.mock.calls[0][0]).toMatchObject({ title: '新条目', cycle_id: 2 });
  });

  it('选了不在开放期的周期,表单里当场提示检索不到', async () => {
    await openCreate();
    await pickCycle('上届招新(已结束)');
    expect(await screen.findByText(/周期已结束,这条内容现在不会被检索到/)).toBeInTheDocument();
  });

  it('已绑定的条目可以改回常青', async () => {
    render(<AgentKB />);
    await screen.findByText('本届招新');
    await openEdit('本届面试地点');
    await waitFor(() => expect(shownCycle()).toBe('本届招新(开放中)'));

    await pickCycle('常青(不绑定周期)');
    clickButton('保存并重嵌');

    await waitFor(() => expect(kb.updateKbSource).toHaveBeenCalledTimes(1));
    expect(kb.updateKbSource.mock.calls[0][1]).toHaveProperty('cycle_id', null);
  });

  it('详情取不到时也不丢绑定:用列表行里的值垫上', async () => {
    kb.getKbSource.mockRejectedValue({ status: 502, message: 'Agent 不可用' });
    jest.spyOn(message, 'error').mockImplementation(() => (() => {}) as any);
    render(<AgentKB />);
    await screen.findByText('本届招新');
    await openEdit('本届面试地点');
    await waitFor(() => expect(shownCycle()).toBe('本届招新(开放中)'));
  });
});

describe('旧版 Agent 把绑定丢掉时', () => {
  const createBound = async () => {
    render(<AgentKB />);
    await screen.findByText('社团简介');
    clickButton('新建条目');
    await screen.findByText('创建并入库');
    fireEvent.change(screen.getByLabelText('标题'), { target: { value: '新条目' } });
    fireEvent.change(screen.getByLabelText('问题'), { target: { value: '怎么报名' } });
    fireEvent.change(screen.getByLabelText('回答'), { target: { value: '官网报名' } });
    await pickCycle('本届招新(开放中)');
    clickButton('创建并入库');
    await waitFor(() => expect(kb.createKbSource).toHaveBeenCalledTimes(1));
  };

  it('存完回读发现绑定没落上,明确告诉管理员', async () => {
    // 旧版照常保存成功,只是回读的条目里没有 cycle_id
    kb.getKbSource.mockResolvedValue({ data: row({ source_id: 'kb_new', title: '新条目' }) });
    await createBound();
    await waitFor(() => expect(warn).toHaveBeenCalledTimes(1));
    expect(warn.mock.calls[0][0]).toContain('周期绑定没有生效');
  });

  it('绑定落上了就不打扰', async () => {
    kb.getKbSource.mockResolvedValue({
      data: row({ source_id: 'kb_new', title: '新条目', cycle_id: 2 }),
    });
    await createBound();
    await waitFor(() => expect(kb.getKbSource).toHaveBeenCalledWith('kb_new'));
    // 回读的 promise 落定后再断言
    await Promise.resolve();
    expect(warn).not.toHaveBeenCalled();
  });

  it('回读本身失败不影响已经成功的保存,也不误报', async () => {
    kb.getKbSource.mockRejectedValue({ status: 502, message: 'Agent 不可用' });
    await createBound();
    await waitFor(() => expect(kb.getKbSource).toHaveBeenCalledWith('kb_new'));
    await Promise.resolve();
    expect(warn).not.toHaveBeenCalled();
  });
});
