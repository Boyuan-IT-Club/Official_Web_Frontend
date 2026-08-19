/**
 * 分包加载失败的识别必须覆盖所有浏览器的措辞。
 *
 * 线上事故：正则只写了 webpack/Chrome 那三种，Safari 报的
 * "Importing a module script failed." 匹配不到，于是自动强刷不触发 ——
 * 发布后 Safari 用户点任何懒加载路由都会看到「页面出了点问题」。
 *
 * 这些字符串是各浏览器的真实文案，改动识别逻辑时别让本测试变红。
 */
import { isChunkLoadError as isChunkError } from '../../utils/chunkError';

describe('分包加载失败的识别', () => {
  it.each([
    ['webpack',  'Loading chunk 165 failed.'],
    ['webpack',  'ChunkLoadError: Loading chunk 165 failed.'],
    ['Chromium', 'Failed to fetch dynamically imported module: https://x/static/js/165.abc.chunk.js'],
    ['Safari',   'Importing a module script failed.'],
    ['Firefox',  'error loading dynamically imported module'],
    ['Safari',   'Load failed'],
  ])('认得出 %s 的措辞: %s', (_browser, message) => {
    expect(isChunkError(new Error(message))).toBe(true);
  });

  it('认得出 name 为 ChunkLoadError 的错误对象（message 为空也算）', () => {
    const e = new Error('');
    e.name = 'ChunkLoadError';
    expect(isChunkError(e)).toBe(true);
  });

  it('不把普通运行时错误误判成分包失败 —— 否则会掩盖真实 bug 并陷入刷新', () => {
    expect(isChunkError(new Error("Can't find variable: setResumeFields"))).toBe(false);
    expect(isChunkError(new Error('Cannot read properties of undefined'))).toBe(false);
    expect(isChunkError(new TypeError('x is not a function'))).toBe(false);
    expect(isChunkError(undefined)).toBe(false);
  });
});
