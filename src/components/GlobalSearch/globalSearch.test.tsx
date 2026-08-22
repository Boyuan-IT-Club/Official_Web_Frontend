// 全局搜索的行为守卫。重点在两条容易错的：
//   1. 无权限的页面不该出现在结果里（搜出来点进去 403 毫无意义）
//   2. 快速输入时后发先至的响应不能覆盖新结果
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GlobalSearch from './index';
import { globalSearch } from '../../api/manage/userApis';
import { getAllCycles } from '../../api/manage/cycleApis';

// react-router-dom v7 是 ESM-only，在 jest(CJS) 里加载它的再导出链会炸；
// 这里只需要 useNavigate 的存在性，直接 mock 掉，测试专注组件自身逻辑
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));

jest.mock('../../api/manage/userApis', () => ({ globalSearch: jest.fn() }));
jest.mock('../../api/manage/cycleApis', () => ({ getAllCycles: jest.fn() }));

const mockedSearch = globalSearch as jest.MockedFunction<any>;
const mockedCycles = getAllCycles as jest.MockedFunction<any>;

const PAGES = [
  { key: '/manage', label: '用户与角色' },
  { key: '/cycles', label: '招募周期' },
];

const setup = (pages = PAGES) => render(
  <GlobalSearch open onClose={() => {}} pages={pages} />,
);

describe('管理端全局搜索', () => {
  beforeEach(() => {
    mockedSearch.mockReset();
    mockNavigate.mockReset();
    mockedCycles.mockReset();
    mockedCycles.mockResolvedValue({ data: [] });
  });

  it('未输入时列出全部可见页面', async () => {
    setup();
    expect(await screen.findByText('用户与角色')).toBeInTheDocument();
    expect(screen.getByText('招募周期')).toBeInTheDocument();
  });

  it('只列传入的页面 —— 无权限的页面不出现在结果里', async () => {
    setup([{ key: '/manage', label: '用户与角色' }]);
    expect(await screen.findByText('用户与角色')).toBeInTheDocument();
    expect(screen.queryByText('招募周期')).not.toBeInTheDocument();
  });

  it('按关键词过滤页面', async () => {
    setup();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '周期' } });
    await waitFor(() => expect(screen.queryByText('用户与角色')).not.toBeInTheDocument());
    expect(screen.getByText('招募周期')).toBeInTheDocument();
  });

  it('展示用户结果，附带学号与邮箱', async () => {
    mockedSearch.mockResolvedValue({
      data: { users: [{ userId: 7, name: '丁华烨', username: '10245101480', email: 'a@b.c' }] },
    });
    setup();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '丁' } });

    expect(await screen.findByText('丁华烨')).toBeInTheDocument();
    expect(screen.getByText(/10245101480/)).toBeInTheDocument();
  });

  it('过期响应不覆盖新结果（后发先至的请求要被丢弃）', async () => {
    let resolveSlow!: (v: any) => void;
    mockedSearch
      .mockImplementationOnce(() => new Promise((r) => { resolveSlow = r; }))   // 「张」：慢
      .mockImplementationOnce(() => Promise.resolve({                            // 「李」：快
        data: { users: [{ userId: 2, name: '李四', username: 'b2' }] },
      }));

    setup();
    const box = screen.getByRole('textbox');

    // 必须等第一次防抖真的发出请求 —— 否则两次输入被合并成一个请求，
    // 也就压根不存在「后发先至」这回事（本用例初版就是这么写错的）
    fireEvent.change(box, { target: { value: '张' } });
    await waitFor(() => expect(mockedSearch).toHaveBeenCalledTimes(1));

    fireEvent.change(box, { target: { value: '李' } });
    await waitFor(() => expect(mockedSearch).toHaveBeenCalledTimes(2));

    expect(await screen.findByText('李四')).toBeInTheDocument();

    // 旧请求这时才回来，且带着「张三」——不能顶掉已显示的「李四」
    resolveSlow({ data: { users: [{ userId: 1, name: '张三', username: 'a1' }] } });
    await waitFor(() => expect(screen.getByText('李四')).toBeInTheDocument());
    expect(screen.queryByText('张三')).not.toBeInTheDocument();
  });

  it('点击结果会导航到对应路由；用户结果带上 ?q= 以便落地即筛好', async () => {
    mockedSearch.mockResolvedValue({
      data: { users: [{ userId: 7, name: '丁华烨', username: '10245101480' }] },
    });
    setup();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '丁' } });
    fireEvent.click(await screen.findByText('丁华烨'));

    expect(mockNavigate).toHaveBeenCalledWith('/manage?q=10245101480');
  });

  it('用户接口失败时不崩，页面结果照常可用', async () => {
    mockedSearch.mockRejectedValue(new Error('boom'));
    setup();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '用户' } });
    expect(await screen.findByText('用户与角色')).toBeInTheDocument();
  });
});
