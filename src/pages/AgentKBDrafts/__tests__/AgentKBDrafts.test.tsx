// 知识库草稿审核页的行为守卫。重点:
//   1. 「批准」会真的改知识库:必须二次确认;失败说明(知识库有没有被改动)原样留在页面上
//   2. 草稿列表多数环境里是空的(起草默认关闭):空状态要说明原因,不是出错
//   3. 旧版 Agent 没有这些接口(404)时正常降级
//
// 取元素的小工具直接走 DOM(closest / querySelector):要定位 antd 表格的行与弹窗里的按钮,
// Testing Library 没有对应的查询;getByRole 在这么大的 DOM 上太慢
/* eslint-disable testing-library/no-node-access */
import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Modal, message } from 'antd';
import AgentKBDrafts from '../index';

jest.mock('../../../api/manage/kbDraftsApis', () => ({
  listKbDrafts: jest.fn(),
  getKbDraft: jest.fn(),
  updateKbDraft: jest.fn(),
  approveKbDraft: jest.fn(),
  rejectKbDraft: jest.fn(),
}));
jest.mock('../../../api/manage/cycleApis', () => ({ getAllCycles: jest.fn() }));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const api = require('../../../api/manage/kbDraftsApis');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cycleApi = require('../../../api/manage/cycleApis');

const base = {
  run_id: 'kbops_aaa', status: 'pending', cycle_id: null, conflict_with: [], evidence: [],
  support: { query_count: 9, thread_count: 5, near_miss_count: 6 },
  samples: [{ query: '入社要交钱吗', injection_suspect: false }],
  review: { findings: [], conflicts: [], revised: false, downgraded: false, converted_from: '', mixed_cycles: false, note: '' },
  created_at: '2026-11-12T09:00:00+08:00', published_source_id: null,
};
const NEW_FAQ = {
  ...base, draft_id: 17, topic_rank: 1, kind: 'new_faq', topic: '社团会费',
  question: '加入社团需要交费吗?', answer: '加入社团不收取任何费用。', cycle_id: 2,
  evidence: [{ sentence: '加入社团不收取任何费用。', chunk_id: 'kb_a#2', quote: '本社团不向成员收取会费', source_id: 'kb_a', source_title: '社团章程' }],
  conflict_with: ['kb_old_fee'],
  review: { ...base.review, findings: [{ index: 1, verdict: 'supported', reason: '' }], conflicts: [{ source_id: 'kb_old_fee', reason: '现有条目说要收费' }] },
  target: null,
};
const ALT = {
  ...base, draft_id: 18, topic_rank: 2, kind: 'alt_question', topic: '面试地点',
  question: '面试在哪栋楼', answer: '', target_source_id: 'kb_place',
  target: { source_id: 'kb_place', title: '面试时间与地点', question: '面试在哪?', answer: '理科大楼 B226', alt_questions: ['面试地点在哪'], enabled: true },
};
const MISSING = {
  ...base, draft_id: 19, topic_rank: 3, kind: 'missing', topic: '线上面试', question: '面试可以线上参加吗?', answer: '',
  review: { ...base.review, downgraded: true }, target: null,
};
const ALL = [NEW_FAQ, ALT, MISSING];
const listOf = (items: any[]) => ({ data: { items: items.map(({ target, ...rest }) => rest), total: items.length, page: 1, size: 20 } });

const rowOf = (text: string) => screen.getByText(text).closest('tr') as HTMLElement;
const clickButton = (text: string | RegExp) =>
  fireEvent.click(screen.getByText(text).closest('button') as HTMLElement);
const buttonOf = (text: string) => screen.getByText(text).closest('button') as HTMLButtonElement;

const openDraft = async (topic: string) => {
  fireEvent.click(within(rowOf(topic)).getByText(/审\s?核|查\s?看/));
  await screen.findByText('用户是怎么问的', { exact: false });
};

let toast: Record<'success' | 'error', jest.SpyInstance>;

beforeEach(() => {
  api.listKbDrafts.mockResolvedValue(listOf(ALL));
  api.getKbDraft.mockImplementation(async (id: number) => ({ data: ALL.find((d) => d.draft_id === id) }));
  api.updateKbDraft.mockResolvedValue({ data: { draft_id: 19, status: 'pending' } });
  api.approveKbDraft.mockResolvedValue({
    data: { draft_id: 17, status: 'approved', published_source_id: 'kb_draft17', audit_recorded: true },
  });
  api.rejectKbDraft.mockResolvedValue({ data: { draft_id: 17, status: 'rejected' } });
  cycleApi.getAllCycles.mockResolvedValue({ data: [{ cycleId: 2, cycleName: '本届招新' }] });
  toast = {
    success: jest.spyOn(message, 'success').mockImplementation(() => (() => {}) as any),
    error: jest.spyOn(message, 'error').mockImplementation(() => (() => {}) as any),
  };
});

afterEach(() => {
  Modal.destroyAll();
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe('列表', () => {
  it('默认只看待审的草稿', async () => {
    render(<AgentKBDrafts />);
    await screen.findByText('社团会费');
    expect(api.listKbDrafts).toHaveBeenCalledWith({ status: 'pending', page: 1, size: 20 });
  });

  it('与现有条目冲突的草稿在列表上就标出来', async () => {
    render(<AgentKBDrafts />);
    await screen.findByText('社团会费');
    expect(within(rowOf('社团会费')).getByText('与现有条目冲突')).toBeInTheDocument();
    expect(within(rowOf('面试地点')).queryByText('与现有条目冲突')).not.toBeInTheDocument();
    // 绑定的周期显示成名字
    expect(within(rowOf('社团会费')).getByText('本届招新')).toBeInTheDocument();
    expect(within(rowOf('面试地点')).getByText('常青')).toBeInTheDocument();
  });

  it('没有待审草稿:说明起草默认关闭,不显示成出错', async () => {
    api.listKbDrafts.mockResolvedValue(listOf([]));
    render(<AgentKBDrafts />);
    expect(await screen.findByText('没有待审的草稿。')).toBeInTheDocument();
    expect(screen.getByText(/起草功能默认是关闭的/)).toBeInTheDocument();
    expect(screen.queryByText('草稿列表加载失败')).not.toBeInTheDocument();
  });

  it('切到别的状态时带上 status,并回到第 1 页', async () => {
    render(<AgentKBDrafts />);
    await screen.findByText('社团会费');
    fireEvent.click(screen.getByText('已批准'));
    await waitFor(() =>
      expect(api.listKbDrafts).toHaveBeenLastCalledWith({ status: 'approved', page: 1, size: 20 }));
  });
});

describe('接口还不存在时', () => {
  it('列表 404:说明暂不可用,可重新检查', async () => {
    api.listKbDrafts.mockRejectedValueOnce({ status: 404, message: 'Not Found' });
    render(<AgentKBDrafts />);
    expect(await screen.findByText('草稿审核暂不可用')).toBeInTheDocument();
    clickButton('重新检查');
    expect(await screen.findByText('社团会费')).toBeInTheDocument();
  });

  it('其他错误:显示服务端文案并可重试', async () => {
    api.listKbDrafts.mockRejectedValueOnce({ status: 500, message: '查询失败,请稍后重试' });
    render(<AgentKBDrafts />);
    expect(await screen.findByText('查询失败,请稍后重试')).toBeInTheDocument();
    clickButton(/^重\s?试$/);
    expect(await screen.findByText('社团会费')).toBeInTheDocument();
  });

  it('列表返回体缺字段:当成没有草稿,不崩', async () => {
    api.listKbDrafts.mockResolvedValue({ data: {} });
    render(<AgentKBDrafts />);
    expect(await screen.findByText('没有待审的草稿。')).toBeInTheDocument();
  });

  it('周期列表取不到:照常审核,周期显示成「周期 #id」', async () => {
    cycleApi.getAllCycles.mockRejectedValue({ status: 500, message: 'x' });
    render(<AgentKBDrafts />);
    await screen.findByText('社团会费');
    expect(within(rowOf('社团会费')).getByText('周期 #2')).toBeInTheDocument();
  });
});

describe('审核一份草稿', () => {
  it('冲突要醒目提示,并写明和哪条、为什么', async () => {
    render(<AgentKBDrafts />);
    await screen.findByText('社团会费');
    await openDraft('社团会费');
    expect(screen.getByText('这份草稿与现有条目的说法不一致')).toBeInTheDocument();
    expect(screen.getByText('kb_old_fee:现有条目说要收费')).toBeInTheDocument();
  });

  it('答案里每句话的出处和审核结论都列出来', async () => {
    render(<AgentKBDrafts />);
    await screen.findByText('社团会费');
    await openDraft('社团会费');
    expect(screen.getByText('有出处')).toBeInTheDocument();
    expect(screen.getByText(/社团章程 ——「本社团不向成员收取会费」/)).toBeInTheDocument();
  });

  it('补问法:和目标 FAQ 的现有内容放在一起对照', async () => {
    render(<AgentKBDrafts />);
    await screen.findByText('面试地点');
    await openDraft('面试地点');
    expect(screen.getByText('面试时间与地点')).toBeInTheDocument();
    expect(screen.getByText('理科大楼 B226')).toBeInTheDocument();
    expect(screen.getByText('面试地点在哪')).toBeInTheDocument();
    // 补问法沿用目标的答案,不出答案编辑框
    expect(screen.queryByLabelText('答案')).not.toBeInTheDocument();
  });

  it('补问法的目标 FAQ 已被删除:说明只能驳回,批准按钮不可点', async () => {
    api.getKbDraft.mockResolvedValue({ data: { ...ALT, target: null } });
    render(<AgentKBDrafts />);
    await screen.findByText('面试地点');
    await openDraft('面试地点');
    expect(screen.getByText('这条 FAQ 已经不存在了')).toBeInTheDocument();
    expect(buttonOf('批准并发布')).toBeDisabled();
  });

  it('「待补充」没写答案不能批准;写了、保存了才可以', async () => {
    render(<AgentKBDrafts />);
    await screen.findByText('线上面试');
    await openDraft('线上面试');
    expect(buttonOf('批准并发布')).toBeDisabled();

    fireEvent.change(screen.getByLabelText('答案'), { target: { value: '可以,提前联系负责人' } });
    // 改了还没保存:批准的是已保存的内容,所以仍不可点
    expect(buttonOf('批准并发布')).toBeDisabled();
    api.getKbDraft.mockResolvedValue({ data: { ...MISSING, answer: '可以,提前联系负责人' } });
    clickButton('保存修改');

    await waitFor(() => expect(api.updateKbDraft).toHaveBeenCalledWith(19, {
      question: '面试可以线上参加吗?', answer: '可以,提前联系负责人', cycle_id: null,
    }));
    await waitFor(() => expect(buttonOf('批准并发布')).toBeEnabled());
  });

  it('保存撞上「草稿已被处理」(409):说明留在页面上', async () => {
    api.updateKbDraft.mockRejectedValue({ status: 409, message: '草稿已被处理,无法修改' });
    render(<AgentKBDrafts />);
    await screen.findByText('线上面试');
    await openDraft('线上面试');
    fireEvent.change(screen.getByLabelText('答案'), { target: { value: '可以' } });
    clickButton('保存修改');
    expect(await screen.findByText('草稿已被处理,无法修改')).toBeInTheDocument();
  });
});

describe('批准并发布', () => {
  const openAndClickApprove = async () => {
    render(<AgentKBDrafts />);
    await screen.findByText('社团会费');
    await openDraft('社团会费');
    clickButton('批准并发布');
    // antd 的确认弹窗把标题渲染了两处(弹窗标题 + 确认框标题),所以用 findAll
    await screen.findAllByText('批准并发布到知识库?');
  };

  it('要二次确认:点了按钮只弹确认,不直接发布', async () => {
    await openAndClickApprove();
    expect(api.approveKbDraft).not.toHaveBeenCalled();
    expect(screen.getByText(/发布后立即参与检索/)).toBeInTheDocument();
  });

  it('确认里点「再看看」就不发布', async () => {
    await openAndClickApprove();
    clickButton('再看看');
    await waitFor(() => expect(screen.queryAllByText('批准并发布到知识库?')).toHaveLength(0));
    expect(api.approveKbDraft).not.toHaveBeenCalled();
  });

  it('确认后才发布;成功后提示条目 id 并刷新列表', async () => {
    await openAndClickApprove();
    clickButton('确认发布');
    await waitFor(() => expect(api.approveKbDraft).toHaveBeenCalledWith(17));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('已批准并发布到知识库(条目 kb_draft17)'));
    expect(api.listKbDrafts.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('已发布但审计没记上:用需要点掉的弹窗提示联系运维', async () => {
    api.approveKbDraft.mockResolvedValue({
      data: { draft_id: 17, status: 'approved', published_source_id: 'kb_draft17', audit_recorded: false },
    });
    await openAndClickApprove();
    clickButton('确认发布');
    expect((await screen.findAllByText('已发布,但审计没有记上')).length).toBeGreaterThan(0);
    expect(screen.getByText(/联系运维补记/)).toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('失败:接口的说明原样留在页面上,并写明知识库没有被改动', async () => {
    api.approveKbDraft.mockRejectedValue({ status: 503, message: '审计服务不可用,草稿未发布,请稍后重试' });
    await openAndClickApprove();
    clickButton('确认发布');
    expect(await screen.findByText('审计服务不可用,草稿未发布,请稍后重试')).toBeInTheDocument();
    expect(screen.getByText('知识库没有被改动。')).toBeInTheDocument();
    // 抽屉没有关,草稿还在,可以重试
    expect(buttonOf('批准并发布')).toBeInTheDocument();
  });

  it('内容其实已经写入知识库(500):说明再点一次即可,不会重复发布', async () => {
    api.approveKbDraft.mockRejectedValue({
      status: 500, message: '内容已写入知识库(条目 kb_draft17),但草稿状态更新失败;请重试批准,重试不会重复发布',
    });
    await openAndClickApprove();
    clickButton('确认发布');
    expect(await screen.findByText(/内容已写入知识库\(条目 kb_draft17\)/)).toBeInTheDocument();
    expect(screen.getByText(/内容其实已经发布/)).toBeInTheDocument();
    expect(screen.queryByText('知识库没有被改动。')).not.toBeInTheDocument();
  });
});

describe('驳回', () => {
  it('确认后驳回,提示并刷新列表', async () => {
    render(<AgentKBDrafts />);
    await screen.findByText('社团会费');
    await openDraft('社团会费');
    clickButton(/^驳\s?回$/);
    // Popconfirm 里的确认按钮
    const confirm = await waitFor(() => {
      const btn = document.querySelector('.ant-popconfirm .ant-btn-primary') as HTMLElement | null;
      if (!btn) throw new Error('没有出现驳回确认');
      return btn;
    });
    expect(api.rejectKbDraft).not.toHaveBeenCalled();
    fireEvent.click(confirm);
    await waitFor(() => expect(api.rejectKbDraft).toHaveBeenCalledWith(17));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('已驳回,这份草稿不会发布'));
  });
});

describe('已处理的草稿', () => {
  it('只能看:没有批准、驳回、保存这些按钮', async () => {
    const done = { ...NEW_FAQ, status: 'approved', published_source_id: 'kb_draft17', decided_by: 2 };
    api.listKbDrafts.mockResolvedValue(listOf([done]));
    api.getKbDraft.mockResolvedValue({ data: done });
    render(<AgentKBDrafts />);
    await screen.findByText('社团会费');
    await openDraft('社团会费');
    expect(screen.queryByText('批准并发布')).not.toBeInTheDocument();
    expect(screen.queryByText('保存修改')).not.toBeInTheDocument();
    expect(screen.getByText(/已发布为条目 kb_draft17/)).toBeInTheDocument();
  });
});
