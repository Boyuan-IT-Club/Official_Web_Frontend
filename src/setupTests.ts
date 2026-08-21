// jsdom 没有暴露 Web Crypto，而 yjs 生成客户端 ID 时要用 crypto.getRandomValues。
// 浏览器里本来就有，这里只是把 Node 的实现补给测试环境。
import { webcrypto } from 'crypto';

if (typeof globalThis.crypto === 'undefined') {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto });
}

export {};

// jest-dom 的自定义匹配器（toBeInTheDocument 等）。渲染型测试需要它。
import '@testing-library/jest-dom';

// jsdom 没有 matchMedia，而 antd 的响应式组件（Drawer/Grid 等）会调用它。
// 渲染任何 antd 组件的测试都需要这个垫片。
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},      // 已废弃但 antd 仍可能用到
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}
