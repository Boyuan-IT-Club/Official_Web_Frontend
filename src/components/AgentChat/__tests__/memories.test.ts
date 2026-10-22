import { clearMemories, deleteMemory, fetchMemories } from '../memories';

jest.mock('@/utils/token', () => ({ getToken: () => 'tok' }));

describe('长期记忆接口', () => {
  const fetchMock = jest.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    (global as any).fetch = fetchMock;
  });

  it('列表带本人令牌,返回开启状态与条目', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        enabled: true,
        items: [{ memory_id: 'mem_a', content: '回答先给结论', kind: 'preference', updated_at: null }],
      }),
    });
    const data = await fetchMemories('http://agent/api/agent');
    expect(fetchMock).toHaveBeenCalledWith('http://agent/api/agent/memories', {
      method: 'GET',
      headers: { Authorization: 'Bearer tok' },
    });
    expect(data.enabled).toBe(true);
    expect(data.items[0].content).toBe('回答先给结论');
  });

  it('删除单条与清空走 DELETE', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ deleted: 2 }) });
    await deleteMemory('http://agent/api/agent', 'mem_a');
    expect(fetchMock.mock.calls[0][0]).toBe('http://agent/api/agent/memories/mem_a');
    expect(await clearMemories('http://agent/api/agent')).toBe(2);
    expect(fetchMock.mock.calls[1][1].method).toBe('DELETE');
  });

  it('401 抛登录过期码,其余错误带服务端 detail', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) });
    await expect(fetchMemories('http://a')).rejects.toMatchObject({ code: 'http_401' });
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({ detail: '记忆存储暂不可用,请稍后重试' }),
    });
    await expect(fetchMemories('http://a')).rejects.toThrow('记忆存储暂不可用');
  });
});
