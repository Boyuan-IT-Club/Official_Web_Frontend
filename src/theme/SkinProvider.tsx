import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
// @theme 由 craco 按 REACT_APP_MODE 解析到 theme/admin.ts 或 theme/user.ts
import { DEFAULT_SKIN_KEY, SKINS, type Skin } from '@theme';

const STORAGE_KEY = 'boyuan.skin';

interface SkinContextValue {
  skin: Skin;
  skins: Skin[];
  setSkinKey: (key: string) => void;
}

const SkinContext = createContext<SkinContextValue | null>(null);

/**
 * 皮肤切换。
 *
 * 选择记在 localStorage 而不是服务端：这是纯个人显示偏好，存后端要加表、加接口、
 * 还要处理未登录态，收益却只是换设备时不用重选一次。
 *
 * 用 ConfigProvider 换 token 而不是切换 CSS 文件，是因为管理端的观感几乎全由
 * antd token 决定——切 token 是一次 re-render，不涉及样式表加载顺序问题。
 */
export const SkinProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [skinKey, setKey] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      // 校验存的值仍然存在：皮肤被移除后要退回默认，否则整站拿不到主题
      if (saved && SKINS.some((s) => s.key === saved)) return saved;
    } catch {
      /* 隐私模式下 localStorage 可能抛异常，退回默认即可 */
    }
    return DEFAULT_SKIN_KEY;
  });

  const setSkinKey = useCallback((key: string) => {
    setKey(key);
    try {
      localStorage.setItem(STORAGE_KEY, key);
    } catch {
      /* 存不了就只在本次会话生效 */
    }
  }, []);

  const skin = useMemo(
    () => SKINS.find((s) => s.key === skinKey) ?? SKINS[0],
    [skinKey],
  );

  /**
   * 把皮肤写到文档根上：data-skin 供 SCSS 按皮肤/版式写差异，
   * cssVars 供页面样式用 var(--skin-x, 现状值) 消费——默认皮肤不带变量，
   * 所有 var() 落到回退值，这就是「默认零变化」的机制保证。
   * 切换时先清掉上一款的变量再写新的，避免残留串色。
   */
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.skin = skin.key;
    root.dataset.skinLayout = skin.layout ?? 'classic';
    const applied: string[] = [];
    Object.entries(skin.cssVars ?? {}).forEach(([k, v]) => {
      root.style.setProperty(k, v);
      applied.push(k);
    });
    return () => {
      applied.forEach((k) => root.style.removeProperty(k));
      delete root.dataset.skin;
      delete root.dataset.skinLayout;
    };
  }, [skin]);

  const value = useMemo(() => ({ skin, skins: SKINS, setSkinKey }), [skin, setSkinKey]);

  return (
    <SkinContext.Provider value={value}>
      <ConfigProvider theme={skin.theme} locale={zhCN}>
        {children}
      </ConfigProvider>
    </SkinContext.Provider>
  );
};

export function useSkin(): SkinContextValue {
  const ctx = useContext(SkinContext);
  if (!ctx) {
    throw new Error('useSkin 必须在 SkinProvider 内使用');
  }
  return ctx;
}
