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

/*
 * 只留两款。
 *
 * 一度做到六款（靛青纸感 / 松石青 / 曜石深空 / 落日暖橙），但皮肤越多越没人挑，
 * 每加一款还得在门面页、投递页、进度页各验一遍版式，改动成本摊到每一款上都不划算。
 * 留「默认」和「粉蓝流光」两款：一个是现状，一个是真正被用的那款。
 *
 * 删掉的四款走 git 历史，要回来照着 dawn 的结构加回即可。
 */
export const SKINS: Skin[] = [classic, dawn];
export const DEFAULT_SKIN_KEY = 'default';

export default classic.theme;
