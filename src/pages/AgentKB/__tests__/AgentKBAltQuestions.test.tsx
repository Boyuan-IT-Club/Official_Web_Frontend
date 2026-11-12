// 知识库页「附加问法」的行为守卫。重点:
//   1. 编辑 FAQ 时已有的问法要回填并原样带回去——上游把「不传」当成空列表,漏传会清掉
//   2. 旧版 Agent 不返回这个字段时按没有处理,不报错
//   3. 自由正文(doc)没有这一项,也不该发出去
//
// 取元素的小工具直接走 DOM(closest):要定位 antd 表格的行,Testing Library 没有对应的查询
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
// eslint-disable-next-line @typescript-eslint/no-var-requires
const kb = require('../../../api/manage/agentApis');

const base = { kind: 'normal', tags: [], enabled: true, updated_by: 'user:1', chunk_count: 1 };
const ROWS = [
  { ...base, source_id: 'kb_fee', title: '社团会费', type: 'faq', question: '加入社团需要交费吗?', answer: '不收费', alt_questions: ['入社要交钱吗', '会费多少'] },
  // 旧版 Agent 的返回:没有 alt_questions 字段
  { ...base, source_id: 'kb_old', title: '面试地点', type: 'faq', question: '面试在哪?', answer: '理科大楼' },
  { ...base, source_id: 'kb_doc', title: '技术部介绍', type: 'doc', content_md: '# 技术部\n正文' },
];

const rowOf = (title: string) => screen.getByText(title).closest('tr') as HTMLElement;
const clickButton = (text: string | RegExp) =>
  fireEvent.click(screen.getByText(text).closest('button') as HTMLElement);
const openEdit = async (title: string) => {
  fireEvent.click(within(rowOf(title)).getByText(/编\s?辑/));
  await screen.findByText('保存并重嵌');
};

beforeEach(() => {
  kb.listKbSources.mockResolvedValue({ data: { items: ROWS, total: ROWS.length } });
  kb.getKbSource.mockImplementation(async (id: string) => ({ data: ROWS.find((r) => r.source_id === id) }));
  kb.updateKbSource.mockResolvedValue({ data: {} });
  kb.createKbSource.mockResolvedValue({ data: { source_id: 'kb_new' } });
  jest.spyOn(message, 'success').mockImplementation(() => (() => {}) as any);
  jest.spyOn(message, 'error').mockImplementation(() => (() => {}) as any);
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe('知识条目的附加问法', () => {
  it('编辑 FAQ:已有的问法回填出来,不改也原样带回去', async () => {
    render(<AgentKB />);
    await screen.findByText('社团会费');
    await openEdit('社团会费');
    expect(await screen.findByText('入社要交钱吗')).toBeInTheDocument();
    expect(screen.getByText('会费多少')).toBeInTheDocument();

    clickButton('保存并重嵌');
    await waitFor(() => expect(kb.updateKbSource).toHaveBeenCalledTimes(1));
    expect(kb.updateKbSource.mock.calls[0][1]).toMatchObject({
      title: '社团会费', alt_questions: ['入社要交钱吗', '会费多少'],
    });
  });

  it('输入一种新问法回车后加进去,保存时带上', async () => {
    render(<AgentKB />);
    await screen.findByText('社团会费');
    await openEdit('社团会费');
    await screen.findByText('入社要交钱吗');

    const input = screen.getByLabelText('附加问法');
    fireEvent.change(input, { target: { value: '  要不要交会费  ' } });
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 13, which: 13 });
    expect(await screen.findByText('要不要交会费')).toBeInTheDocument();

    clickButton('保存并重嵌');
    await waitFor(() => expect(kb.updateKbSource).toHaveBeenCalledTimes(1));
    expect(kb.updateKbSource.mock.calls[0][1].alt_questions)
      .toEqual(['入社要交钱吗', '会费多少', '要不要交会费']);
  });

  it('旧版 Agent 不返回这个字段:按没有处理,保存时带空列表,不报错', async () => {
    render(<AgentKB />);
    await screen.findByText('面试地点');
    await openEdit('面试地点');
    await waitFor(() => expect(screen.getByLabelText('问题')).toHaveValue('面试在哪?'));

    clickButton('保存并重嵌');
    await waitFor(() => expect(kb.updateKbSource).toHaveBeenCalledTimes(1));
    expect(kb.updateKbSource.mock.calls[0][1]).toMatchObject({ title: '面试地点', alt_questions: [] });
  });

  it('自由正文没有这一项,请求里也不带', async () => {
    render(<AgentKB />);
    await screen.findByText('技术部介绍');
    await openEdit('技术部介绍');
    await waitFor(() => expect(screen.getByLabelText('标题')).toHaveValue('技术部介绍'));
    expect(screen.queryByLabelText('附加问法')).not.toBeInTheDocument();

    clickButton('保存并重嵌');
    await waitFor(() => expect(kb.updateKbSource).toHaveBeenCalledTimes(1));
    expect(kb.updateKbSource.mock.calls[0][1]).not.toHaveProperty('alt_questions');
  });
});
