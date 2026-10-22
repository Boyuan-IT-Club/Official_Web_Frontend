import { act, renderHook } from '@testing-library/react';
import { useAgentChat } from '../useAgentChat';
import { sseFetch } from '../sse';

jest.mock('@/utils/token', () => ({ getToken: () => 'tok', removeToken: jest.fn() }));
jest.mock('../sse', () => ({ sseFetch: jest.fn() }));

const mockedFetch = sseFetch as jest.MockedFunction<typeof sseFetch>;
const URL = 'http://agent/api/agent/chat';

/** 首轮:建会话后停在确认处 */
function stopAtConfirm() {
  mockedFetch.mockImplementationOnce(async (_opts, onEvent) => {
    onEvent({ type: 'session', session_id: 'web:u8:abc', created: true });
    onEvent({ type: 'tool', role: 'tool', name: 'assign_interview' });
    onEvent({
      type: 'confirm',
      summary: '把简历 #9 分配到面试场次 #3',
      tool: 'assign_interview',
      fingerprint: 'fp-1',
    });
    onEvent({ type: 'done', session_id: 'web:u8:abc' });
  });
}

describe('写操作确认卡片', () => {
  beforeEach(() => mockedFetch.mockReset());

  it('confirm 事件挂到当前回复上,确认时带指纹调 /confirm', async () => {
    stopAtConfirm();
    const { result } = renderHook(() => useAgentChat(URL));
    await act(async () => {
      await result.current.send('排一下');
    });
    const card = result.current.messages[1].confirm;
    expect(card?.state).toBe('pending');
    expect(card?.summary).toContain('简历 #9');

    mockedFetch.mockImplementationOnce(async (_opts, onEvent) => {
      onEvent({ type: 'delta', role: 'assistant', content: '已完成分配' });
      onEvent({ type: 'done', session_id: 'web:u8:abc' });
    });
    await act(async () => {
      await result.current.respond('approve');
    });
    const [opts] = mockedFetch.mock.calls[1];
    expect(opts.url).toBe(`${URL}/confirm`);
    expect(opts.body).toEqual({ session_id: 'web:u8:abc', decision: 'approve', fingerprint: 'fp-1' });
    expect(result.current.messages[1].confirm?.state).toBe('approved');
    expect(result.current.messages[2].content).toBe('已完成分配');
  });

  it('卡片没处理就发新消息:卡片标成未确认已取消', async () => {
    stopAtConfirm();
    const { result } = renderHook(() => useAgentChat(URL));
    await act(async () => {
      await result.current.send('排一下');
    });
    mockedFetch.mockImplementationOnce(async (_opts, onEvent) => {
      onEvent({ type: 'done', session_id: 'web:u8:abc' });
    });
    await act(async () => {
      await result.current.send('先问个别的');
    });
    expect(result.current.messages[1].confirm?.state).toBe('cancelled');
  });

  it('确认卡片过期(409)给出明确提示', async () => {
    stopAtConfirm();
    const { result } = renderHook(() => useAgentChat(URL));
    await act(async () => {
      await result.current.send('排一下');
    });
    mockedFetch.mockRejectedValueOnce(
      Object.assign(new Error('确认卡片已过期,请以最新的确认卡片为准'), { code: 'http_409' }),
    );
    await act(async () => {
      await result.current.respond('approve');
    });
    const last = result.current.messages[result.current.messages.length - 1];
    expect(last.errorCode).toBe('confirm_expired');
    expect(last.errorText).toContain('过期');
  });
});
