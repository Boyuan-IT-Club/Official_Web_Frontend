/**
 * 判断一个错误是不是「动态 import 的分包取不到」。
 *
 * 发布后 chunk 文件名带的 hash 会变，旧的直接 404；此时正开着页面的用户
 * 点任何懒加载路由都会撞上，需要靠自动强刷一次恢复。
 *
 * 各浏览器的措辞完全不同，必须全部覆盖 —— 漏掉哪个，那个浏览器的用户就等不到
 * 自动强刷，直接看到「页面出了点问题」。线上就因为只写了 webpack/Chrome 那三种，
 * Safari 用户每次发布后必现错误页。
 */
const CHUNK_ERROR_PATTERNS = [
  /Loading chunk .* failed/i,                       // webpack
  /ChunkLoadError/i,                                // webpack
  /Failed to fetch dynamically imported module/i,   // Chromium
  /Importing a module script failed/i,              // Safari
  /error loading dynamically imported module/i,     // Firefox
  /Load failed/i,                                   // Safari 的网络层兜底文案
];

export const isChunkLoadError = (err: unknown): boolean => {
  if ((err as any)?.name === 'ChunkLoadError') return true;
  const message = String((err as any)?.message ?? err ?? '');
  if (!message) return false;
  return CHUNK_ERROR_PATTERNS.some((re) => re.test(message));
};
