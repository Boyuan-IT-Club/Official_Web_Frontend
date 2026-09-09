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
    '--skin-sider-bg': 'linear-gradient(165deg, #1e1e38, #32326b)',
    '--skin-sider-active': 'rgba(139, 92, 246, 0.24)',
    '--skin-hero-strong': 'linear-gradient(120deg, #26265a 0%, #5b5bd6 60%, #8b5cf6 100%)',
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
    '--skin-sider-bg': 'linear-gradient(165deg, #0b2723, #155448)',
    '--skin-sider-active': 'rgba(52, 211, 153, 0.22)',
    '--skin-hero-strong': 'linear-gradient(120deg, #0a3f38 0%, #0f766e 60%, #34d399 100%)',
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
    '--skin-sider-bg': '#0e1628',
    '--skin-sider-active': 'rgba(96, 165, 250, 0.18)',
    '--skin-hero-strong': 'linear-gradient(120deg, #0e1628 0%, #1d3a6b 60%, #2563eb 100%)',
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
    '--skin-sider-bg': 'linear-gradient(165deg, #2b1a0d, #5a3413)',
    '--skin-sider-active': 'rgba(245, 158, 11, 0.24)',
    '--skin-hero-strong': 'linear-gradient(120deg, #7c2d12 0%, #ea580c 60%, #f59e0b 100%)',
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


/**
 * 晨霞：2026-09 打磨季的成果，独立成皮肤上线（不覆盖默认）。
 * 浅蓝画布上三团晨霞光斑（紫/粉/蓝，克制浓度），淡染 L 形壳，
 * 实底白卡 + 蓝调细线，首页横幅是全站唯一的玻璃卡，
 * 社名是流动的蓝紫粉渐变字。
 * 变量覆盖不到的规则（玻璃/动画/侧栏文字组/结构覆盖）
 * 见 styles/skin-dawn.scss（html[data-skin='dawn'] 作用域）。
 */
const dawn: Skin = {
  key: 'dawn',
  name: '晨霞 · 粉蓝流光',
  layout: 'classic',
  theme: {
    token: {
      colorPrimary: '#2b7fe0',
      colorLink: '#2b7fe0',
      colorLinkHover: '#4da6ff',
      colorBgLayout: '#f8fbff',
      borderRadius: 10,
      borderRadiusLG: 14,
      colorBorderSecondary: '#dfeafa',
    },
  },
  cssVars: {
    '--skin-accent': '#2b7fe0',
    '--skin-accent-2': '#8f6ce8',
    '--skin-accent-bg': '#e4f0ff',
    '--skin-accent-text': '#1d5fb8',
    // 整屋画布：晨霞光斑 + 淡蓝渐层（background 简写可携带多层）
    '--skin-page-bg':
      'radial-gradient(620px 390px at 14% -60px, rgba(143, 108, 232, 0.06), transparent 65%), '
      + 'radial-gradient(580px 370px at 86% -10px, rgba(240, 135, 200, 0.06), transparent 65%), '
      + 'radial-gradient(700px 430px at 50% 320px, rgba(77, 166, 255, 0.09), transparent 60%), '
      + 'linear-gradient(180deg, #eff5ff 0%, #f8fbff 560px) #f8fbff',
    // 横幅自身透明：画布连续，不再有矩形交界的缝
    '--skin-hero-bg': 'transparent',
    // 顶栏与侧栏的淡染，连成 L 形画框
    '--skin-nav-bg': 'linear-gradient(95deg, #f7f5ff 0%, #f2f7ff 55%, #f6fbff 100%)',
    '--skin-nav-text': '#22344c',
    '--skin-sider-bg': 'linear-gradient(185deg, #f7f5ff 0%, #f2f7ff 45%, #fbfdff 100%)',
    '--skin-sider-active': '#e4f0ff',
    // 申请进度头图：深蓝渐变翻浅洗色（文字色由 skin-dawn.scss 覆盖为墨字）
    '--skin-hero-strong': 'linear-gradient(120deg, #eaf3fe 0%, #f7faff 100%)',
    '--skin-title': '#22344c',
    '--skin-text': '#33415a',
    '--skin-muted': '#6b7f9e',
    '--skin-line': '#dfeafa',
    '--skin-card-bg': '#ffffff',
    '--skin-subtle-bg': '#f4f9ff',
  },
};

export const SKINS: Skin[] = [classic, dawn, workbenchIndigo, workbenchPine, bentoObsidian, festivalEmber];
export const DEFAULT_SKIN_KEY = 'default';

export default classic.theme;
