// 新手指引：首次登录弹一份「这个站怎么用」的欢迎说明，可一键进入分步导览，
// 之后随时能从顶栏的「使用指引」重看。用户端与管理端共用这套壳，只是文案与锚点不同。
//
// 「看过没有」记在 localStorage 里，键按「端 + 账号」区分：
//   - 按账号：同一台电脑登录不同账号（比如管理员帮人调试）互不影响
//   - 不落后端：换设备多看一次说明无伤大雅，不值得为此加接口和表字段
//   - 键里带版本号 v1：以后指引内容大改，把版本号 +1 就能让老用户再看一次
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Modal, Tour } from 'antd';
import type { TourProps } from 'antd';

export interface OnboardingStep {
  /** 高亮元素的 CSS 选择器；打开导览那一刻找不到的步骤会被跳过 */
  selector: string;
  title: string;
  description: React.ReactNode;
}

export interface UseOnboardingTourOptions {
  mode: 'user' | 'admin';
  /** 未加载出 userId 前不自动弹——键按账号区分，拿不到账号就无从判断看没看过 */
  userId?: string | number | null;
  title?: string;
  /** 欢迎弹窗正文，即「网站使用说明」本体 */
  intro: React.ReactNode;
  steps: OnboardingStep[];
}

const storageKey = (mode: string, userId: string | number) =>
  `boyuan.tour.${mode}.v1:${userId}`;

function hasSeen(mode: string, userId: string | number): boolean {
  try {
    return localStorage.getItem(storageKey(mode, userId)) === '1';
  } catch {
    // 隐私模式读不到存储：当成看过，别让人每次进来都被弹窗打断
    return true;
  }
}

function markSeen(mode: string, userId: string | number): void {
  try {
    localStorage.setItem(storageKey(mode, userId), '1');
  } catch {
    /* 存不上就下次再弹一回，可以接受 */
  }
}

export function useOnboardingTour({
  mode, userId, title = '欢迎使用', intro, steps,
}: UseOnboardingTourOptions): { node: React.ReactNode; open: () => void } {
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  // 一次会话只自动弹一次：关掉后 userId 引用变化不该再触发
  const autoTriggered = useRef(false);

  useEffect(() => {
    if (autoTriggered.current) return undefined;
    if (userId === null || userId === undefined || userId === '') return undefined;
    if (hasSeen(mode, userId)) return undefined;
    autoTriggered.current = true;
    // 等布局与菜单渲染稳定再弹，导览锚点才都在
    const timer = window.setTimeout(() => setWelcomeOpen(true), 600);
    return () => window.clearTimeout(timer);
  }, [mode, userId]);

  const close = useCallback(() => {
    setWelcomeOpen(false);
    if (userId !== null && userId !== undefined && userId !== '') markSeen(mode, userId);
  }, [mode, userId]);

  const startTour = useCallback(() => {
    close();
    setTourOpen(true);
  }, [close]);

  // 打开那一刻按当下的 DOM 解析锚点：折叠侧栏、无权限等场景下缺的步骤直接跳过
  const resolvedSteps = useMemo<TourProps['steps']>(() => {
    if (!tourOpen) return [];
    return steps
      .filter((step) => document.querySelector(step.selector) !== null)
      .map((step) => ({
        title: step.title,
        description: step.description,
        target: () => document.querySelector(step.selector) as HTMLElement,
      }));
  }, [tourOpen, steps]);

  const open = useCallback(() => setWelcomeOpen(true), []);

  const node = (
    <>
      <Modal
        open={welcomeOpen}
        title={title}
        onCancel={close}
        width={520}
        footer={[
          <Button key="skip" onClick={close}>先自己看看</Button>,
          <Button key="start" type="primary" onClick={startTour}>开始导览</Button>,
        ]}
      >
        {intro}
      </Modal>
      <Tour
        open={tourOpen}
        onClose={() => setTourOpen(false)}
        steps={resolvedSteps}
      />
    </>
  );

  return { node, open };
}

/** 欢迎弹窗里的流程清单：粗体小标题 + 一句话说明，双端共用同一版式 */
export const IntroList: React.FC<{
  items: Array<{ label: string; text: string }>;
  footnote?: string;
}> = ({ items, footnote }) => (
  <div className="onboarding-intro">
    <ol style={{ paddingLeft: 20, margin: '8px 0', lineHeight: 1.9 }}>
      {items.map((item) => (
        <li key={item.label}>
          <b>{item.label}</b>
          <span style={{ color: 'rgba(0,0,0,0.65)' }}>：{item.text}</span>
        </li>
      ))}
    </ol>
    {footnote && (
      <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginTop: 4 }}>{footnote}</div>
    )}
  </div>
);
