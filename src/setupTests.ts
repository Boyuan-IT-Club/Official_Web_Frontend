// jsdom 没有暴露 Web Crypto，而 yjs 生成客户端 ID 时要用 crypto.getRandomValues。
// 浏览器里本来就有，这里只是把 Node 的实现补给测试环境。
import { webcrypto } from 'crypto';

if (typeof globalThis.crypto === 'undefined') {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto });
}

export {};
