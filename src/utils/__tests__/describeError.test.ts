// 请求出错时给用户看的文案。线上截图里「获取简历列表失败 undefined」就是它：
// 超时 / 断网没有响应体，String(undefined) 得到字符串 "undefined"，
// 它是真值，后面兜底的 error.message 永远走不到。
import type { AxiosError } from 'axios';
import { describeError } from '../request';

const err = (over: Partial<AxiosError>): AxiosError => ({ message: '', ...over } as AxiosError);

describe('请求错误文案', () => {
  it('超时：说「网络较慢」，而不是 undefined', () => {
    const msg = describeError(err({ code: 'ECONNABORTED', message: 'timeout of 10000ms exceeded' }));
    expect(msg).toBe('网络较慢，请求超时了，请稍后重试');
    expect(msg).not.toContain('undefined');
  });

  it('只有 message 里带 timeout 也认得出', () => {
    expect(describeError(err({ message: 'timeout exceeded' }))).toBe('网络较慢，请求超时了，请稍后重试');
  });

  it('断网（没有响应）：说网络连接失败', () => {
    expect(describeError(err({ message: 'Network Error' }))).toBe('网络连接失败，请检查网络后重试');
  });

  it('后端带了业务文案：原样透出', () => {
    const e = err({ response: { status: 403 } as any });
    expect(describeError(e, { message: '没有权限' })).toBe('没有权限');
  });

  it('业务文案包在 data 里也认', () => {
    const e = err({ response: { status: 400 } as any });
    expect(describeError(e, { data: { message: '参数错误' } })).toBe('参数错误');
  });

  it('有响应但没文案：退回状态码，也绝不是 undefined', () => {
    const e = err({ response: { status: 502 } as any });
    const msg = describeError(e, {});
    expect(msg).toContain('502');
    expect(msg).not.toContain('undefined');
  });

  it('后端文案是空白串时不当真', () => {
    const e = err({ response: { status: 500 } as any, message: 'Request failed with status code 500' });
    expect(describeError(e, { message: '   ' })).toBe('Request failed with status code 500');
  });
});
