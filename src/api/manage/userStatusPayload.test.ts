// 冻结类请求必须带 status：后端按该值校验，缺了就是 400。
// 而且批量冻结与批量解冻走同一条路由，全靠 status 区分——
// 曾经两个函数发的请求一模一样，既分不出动作也过不了校验。
export {};   // 本文件只用 require 取 mock，没有顶层 import/export 会被
             // --isolatedModules 判成全局脚本（CI 的 Type check 步骤报 TS1208）

jest.mock('@/utils/request', () => ({ request: jest.fn(() => Promise.resolve({})) }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { request } = require('@/utils/request');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const api = require('./userApis');

const lastCall = () => request.mock.calls[request.mock.calls.length - 1][0];

beforeEach(() => { request.mockClear(); request.mockImplementation(() => Promise.resolve({})); });

describe('用户状态类请求的载荷', () => {
  it('冻结带 status=frozen', () => {
    api.freezeUser(7);
    expect(lastCall().url).toContain('/users/7/freeze');
    expect(lastCall().data).toEqual({ status: 'frozen' });
  });

  it('批量冻结与批量解冻靠 status 区分，不能发出相同请求', () => {
    api.batchFreezeUsers([1, 2]);
    const freeze = lastCall();
    api.batchUnfreezeUsers([1, 2]);
    const unfreeze = lastCall();
    expect(freeze.data).toEqual({ userIds: [1, 2], status: 'frozen' });
    expect(unfreeze.data).toEqual({ userIds: [1, 2], status: 'active' });
    expect(freeze.data).not.toEqual(unfreeze.data);
  });

  it('解冻与删除打在后端真实存在的路由上', () => {
    api.unfreezeUser(7);
    expect(lastCall()).toMatchObject({ url: '/api/admin/users/7/unfreeze', method: 'put' });
    api.deleteUser(7);
    expect(lastCall()).toMatchObject({ url: '/api/admin/users/7', method: 'delete' });
  });
});
