/**
 * 限流（HTTP 429 / 业务码 4291）的识别与文案。
 *
 * 背景：2026-09-11 线上注册接口被同一个页面在 11 分 33 秒里请求了 211 次
 * （峰值 6 次/秒）。原因是 antd 的 Button loading 只拦鼠标点击，拦不住表单的
 * 回车提交，用户按住回车就是一串请求；而 429 又和普通错误一样只弹「操作失败」，
 * 用户不知道要停手。这里把「多久之后能再试」算出来并说人话。
 */

/** 后端限流的业务码，见 BusinessExceptionEnum.TOO_MANY_REQUESTS */
export const RATE_LIMITED_CODE = 4291;

/** request.ts 拒绝时抛出的对象形状（只取这里关心的字段） */
export interface RateLimitedErrorLike {
  status?: number;
  code?: number | string;
  retryAfter?: number;
}

/** HTTP 429 或业务码 4291 都算限流——两者任一成立即可，别依赖后端两个都给对 */
export const isRateLimited = (err: unknown): boolean => {
  const e = err as RateLimitedErrorLike | undefined;
  if (!e) return false;
  return e.status === 429 || Number(e.code) === RATE_LIMITED_CODE;
};

/**
 * 拿到建议的等待秒数。后端没给 Retry-After 时退回到 fallback，
 * 宁可让用户多等一会儿，也好过继续放行重试。
 */
export const retryAfterSeconds = (err: unknown, fallback = 60): number => {
  const e = err as RateLimitedErrorLike | undefined;
  const seconds = e?.retryAfter;
  if (typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0) {
    return Math.ceil(seconds);
  }
  return fallback;
};

/** 把秒数说成人话：90 → 「2 分钟」，45 → 「45 秒」，3600 → 「60 分钟」 */
export const formatWait = (seconds: number): string => {
  const s = Math.max(1, Math.ceil(seconds));
  if (s < 60) return `${s} 秒`;
  return `${Math.ceil(s / 60)} 分钟`;
};

/** 限流时给用户看的完整提示 */
export const rateLimitHint = (err: unknown, fallback = 60): string =>
  `操作过于频繁，请 ${formatWait(retryAfterSeconds(err, fallback))}后再试`;
