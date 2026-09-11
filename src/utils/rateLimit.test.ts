import {
  RATE_LIMITED_CODE,
  formatWait,
  isRateLimited,
  rateLimitHint,
  retryAfterSeconds,
} from './rateLimit';

/**
 * 这组断言锁的是 2026-09-11 线上那次重试风暴的修复：
 * 注册接口被同一个页面在 11 分 33 秒里请求 211 次，用户侧只看到「操作失败」，
 * 既不知道被限流了，也不知道要等多久，于是一直按着回车。
 */
describe('限流识别与文案', () => {
  it('HTTP 429 认作限流', () => {
    expect(isRateLimited({ status: 429 })).toBe(true);
  });

  it('业务码 4291 也认作限流——不能只依赖 HTTP 状态码', () => {
    expect(isRateLimited({ status: 400, code: RATE_LIMITED_CODE })).toBe(true);
    expect(isRateLimited({ code: '4291' })).toBe(true);
  });

  it('普通错误不误判成限流', () => {
    expect(isRateLimited({ status: 400, code: 2202 })).toBe(false);
    expect(isRateLimited(undefined)).toBe(false);
    expect(isRateLimited(null)).toBe(false);
  });

  it('优先用后端给的 Retry-After', () => {
    expect(retryAfterSeconds({ status: 429, retryAfter: 3600 })).toBe(3600);
  });

  it('后端没给 Retry-After 时退回 fallback，宁可多等也不要继续重试', () => {
    expect(retryAfterSeconds({ status: 429 }, 300)).toBe(300);
    expect(retryAfterSeconds({ status: 429, retryAfter: 0 }, 300)).toBe(300);
  });

  it('秒数说人话', () => {
    expect(formatWait(45)).toBe('45 秒');
    expect(formatWait(90)).toBe('2 分钟');
    expect(formatWait(3600)).toBe('60 分钟');
    expect(formatWait(0)).toBe('1 秒');
  });

  it('完整提示里必须带上等待时长', () => {
    expect(rateLimitHint({ status: 429, retryAfter: 3600 })).toBe(
      '操作过于频繁，请 60 分钟后再试',
    );
  });
});
