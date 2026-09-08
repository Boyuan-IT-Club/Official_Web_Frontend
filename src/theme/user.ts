import { theme as antdTheme, type ThemeConfig } from 'antd';

/**
 * 用户端皮肤。
 *
 * 历史教训（别绕回老路）：曾做过一版全站强制改版（品牌深蓝 + Bento 首页），
 * 观感变差被整体回滚。这次的原则是——默认皮肤就是现状、一像素不动，
 * 新皮肤全部是可选项，谁选谁看，选择存浏览器本地。
 *
 * 一款皮肤 = 三样东西：
 *   theme    antd 的 ConfigProvider token（按钮/链接/输入框等组件配色）
 *   cssVars  下发到 :root 的 CSS 变量，页面 SCSS 用 var(--skin-x, 现状值) 消费，
 *            变量不存在时回落现状 —— 这就是「默认零变化」的机制保证
 *   layout   版式键，门面页据此选区块变体（PR2 接入；default/classic 走现有 JSX）
 */
export interface Skin {
  key: string;
  name: string;
  theme: ThemeConfig;
  /** 版式：classic 现状 / split 分栏工作台 / bento 格栅 / editorial 杂志 */
  layout?: 'classic' | 'split' | 'bento' | 'editorial';
  /** 下发到 :root 的变量表；default 皮肤不下发任何变量 */
  cssVars?: Record<string, string>;
}

/** 经典·晴空：现状。theme 与 cssVars 都为空，切回它 = 完全回到今天的样子 */
const classic: Skin = { key: 'default', name: '经典 · 晴空（默认）', theme: {}, layout: 'classic' };

const workbenchIndigo: Skin = {
  key: 'workbench-indigo',
  name: '工作台 · 靛青纸感',
  layout: 'split',
  theme: {
    token: {
      colorPrimary: '#5b5bd6', colorLink: '#5b5bd6', colorLinkHover: '#6d6de0',
      colorBgLayout: '#fbfaf8', borderRadius: 9,
    },
  },
  cssVars: {
    '--skin-accent': '#5b5bd6', '--skin-accent-2': '#8b5cf6',
    '--skin-accent-bg': '#eeeefc', '--skin-accent-text': '#3c3489',
    '--skin-page-bg': '#fbfaf8', '--skin-subtle-bg': '#f4f3ef',
    '--skin-card-bg': '#ffffff', '--skin-line': '#e9e7e2',
    '--skin-title': '#232336', '--skin-text': '#33333f', '--skin-muted': '#77778a',
    '--skin-nav-bg': '#ffffff', '--skin-nav-text': '#26262e',
    '--skin-hero-bg': 'linear-gradient(150deg, #efeefb 0%, #fbfaf8 65%)',
    '--skin-page-max': '1080px', '--skin-page-max-narrow': '920px',
    '--skin-radius-card': '12px', '--skin-section-gap': '20px',
  },
};

const workbenchPine: Skin = {
  key: 'workbench-pine',
  name: '工作台 · 松石青',
  layout: 'split',
  theme: {
    token: {
      colorPrimary: '#0f766e', colorLink: '#0f766e', colorLinkHover: '#12897f',
      colorBgLayout: '#fafcfb', borderRadius: 9,
    },
  },
  cssVars: {
    '--skin-accent': '#0f766e', '--skin-accent-2': '#34d399',
    '--skin-accent-bg': '#dcf1ea', '--skin-accent-text': '#085041',
    '--skin-page-bg': '#fafcfb', '--skin-subtle-bg': '#eef4f2',
    '--skin-card-bg': '#ffffff', '--skin-line': '#e2e8e6',
    '--skin-title': '#122421', '--skin-text': '#243733', '--skin-muted': '#6d7f7b',
    '--skin-nav-bg': '#ffffff', '--skin-nav-text': '#15211f',
    '--skin-hero-bg': 'linear-gradient(140deg, #e4f4ef 0%, #fafcfb 60%)',
    '--skin-page-max': '1080px', '--skin-page-max-narrow': '920px',
    '--skin-radius-card': '12px', '--skin-section-gap': '20px',
  },
};

const bentoObsidian: Skin = {
  key: 'bento-obsidian',
  name: '格栅 · 曜石深空',
  layout: 'bento',
  theme: {
    algorithm: antdTheme.darkAlgorithm,
    token: {
      colorPrimary: '#60a5fa', colorLink: '#60a5fa', colorLinkHover: '#7fb7ff',
      colorBgBase: '#0b1220', colorBgContainer: '#141d30', colorBgLayout: '#0b1220',
      colorBorder: '#31436b', colorBorderSecondary: '#233150', borderRadius: 12,
    },
  },
  cssVars: {
    '--skin-accent': '#60a5fa', '--skin-accent-2': '#22d3ee',
    '--skin-accent-bg': 'rgba(96,165,250,.16)', '--skin-accent-text': '#93c5fd',
    '--skin-page-bg': '#0b1220', '--skin-subtle-bg': '#1a2540',
    '--skin-card-bg': '#141d30', '--skin-line': '#233150',
    '--skin-title': '#eef2fb', '--skin-text': '#d5dcea', '--skin-muted': '#8b98b3',
    '--skin-nav-bg': '#0e1628', '--skin-nav-text': '#e2e8f4',
    '--skin-hero-bg':
      'radial-gradient(130% 170% at 80% -20%, rgba(34,211,238,.16), transparent 55%), #141d30',
    '--skin-page-max': '1240px', '--skin-page-max-narrow': '1080px',
    '--skin-radius-card': '14px', '--skin-section-gap': '14px',
  },
};

const festivalEmber: Skin = {
  key: 'festival-ember',
  name: '招新季 · 落日暖橙',
  layout: 'editorial',
  theme: {
    token: {
      colorPrimary: '#ea580c', colorLink: '#ea580c', colorLinkHover: '#f26f2b',
      colorBgLayout: '#fdfbf7', borderRadius: 8,
    },
  },
  cssVars: {
    '--skin-accent': '#ea580c', '--skin-accent-2': '#f59e0b',
    '--skin-accent-bg': '#fdeada', '--skin-accent-text': '#9a3d07',
    '--skin-page-bg': '#fdfbf7', '--skin-subtle-bg': '#f7f2ea',
    '--skin-card-bg': '#ffffff', '--skin-line': '#eee7dc',
    '--skin-title': '#2b241d', '--skin-text': '#3b332b', '--skin-muted': '#8a7f74',
    '--skin-nav-bg': '#fffdf9', '--skin-nav-text': '#292420',
    '--skin-hero-bg': '#fdfbf7',
    '--skin-page-max': '980px', '--skin-page-max-narrow': '820px',
    '--skin-radius-card': '8px', '--skin-section-gap': '28px',
  },
};

export const SKINS: Skin[] = [classic, workbenchIndigo, workbenchPine, bentoObsidian, festivalEmber];
export const DEFAULT_SKIN_KEY = 'default';

export default classic.theme;
