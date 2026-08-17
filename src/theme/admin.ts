import { buildTheme, type Palette } from './buildTheme';

/**
 * 管理端可选皮肤。
 *
 * 演进过程留一笔，避免后来者绕回老路：
 *   v0  antd 默认深色壳（#001529）—— 高饱和"发蓝深色"，观感停在 2019 年
 *   v1  全浅色壳 —— 三个面明度太接近，层次分不开、整体发飘
 *   v2  石墨深侧栏 —— 层次解决了，但业务侧要求管理端不要暗色调
 *   v3  T1 靛蓝浅色（当前默认）
 *   v4  当前：做成可切换皮肤。默认仍是 T1，石墨深色降级为可选项——
 *       "不要暗色调"是对默认值的要求，作为选项保留是有价值的。
 *
 * 浅色皮肤的层次一律靠三层明度递进（页面 → 分区 → 白卡 + 1px 边框），
 * 而不是靠深色块；v1 失败就是因为这三层区分不足。
 */
const PALETTES: Palette[] = [
  {
    key: 'indigo',
    name: '靛蓝（默认）',
    shell: 'light',
    // 不用品牌深蓝 #1f3a60 做强调色：它明度太低，浅底上显沉
    accent: '#5b5bd6',
    accentHover: '#6d6de0',
    accentBg: '#eeeefc',
    accentText: '#3c3489',
    pageBg: '#fcfcfd',
    subtleBg: '#f2f2f5',
    border: '#e8e8ed',
    borderStrong: '#d8d8e0',
    textPrimary: '#1c1c1f',
    textSecondary: '#5c5c66',
    textMuted: '#8a8a94',
  },
  {
    key: 'teal',
    name: '青碧',
    shell: 'light',
    accent: '#0f766e',
    accentHover: '#12897f',
    accentBg: '#e1f5ee',
    accentText: '#085041',
    pageBg: '#fbfdfc',
    subtleBg: '#eef4f2',
    border: '#e2e8e6',
    borderStrong: '#cfe0dc',
    textPrimary: '#111827',
    textSecondary: '#4b5f5a',
    textMuted: '#84948f',
  },
  {
    key: 'sky',
    name: '电蓝',
    shell: 'light',
    accent: '#0284c7',
    accentHover: '#0b95dc',
    accentBg: '#e6f1fb',
    accentText: '#0c447c',
    pageBg: '#fbfcfd',
    subtleBg: '#f1f4f8',
    border: '#e6e8ec',
    borderStrong: '#d5dbe3',
    textPrimary: '#0f172a',
    textSecondary: '#54606f',
    textMuted: '#8b95a3',
  },
  {
    key: 'violet',
    name: '电光紫',
    shell: 'light',
    accent: '#7f77dd',
    accentHover: '#8f88e6',
    accentBg: '#eeedfe',
    accentText: '#3c3489',
    pageBg: '#fdfcff',
    subtleBg: '#f4f2fb',
    border: '#ebe6f2',
    borderStrong: '#ddd8ee',
    textPrimary: '#26215c',
    textSecondary: '#5b5573',
    textMuted: '#8f8aa3',
  },
  {
    key: 'graphite',
    name: '石墨深色',
    shell: 'dark',
    // 深底上强调色改用浅化版：深蓝/靛蓝在深色里辨识度不足
    accent: '#8ab4f8',
    accentHover: '#a3c5fa',
    accentBg: '#2b303b',
    accentText: '#e8f0fe',
    pageBg: '#f1f3f6',
    subtleBg: '#f6f8fa',
    border: '#e1e5ea',
    borderStrong: '#dfe3e8',
    textPrimary: '#1a1a1a',
    textSecondary: '#5f6368',
    textMuted: '#80868b',
    // 中性石墨灰而非深蓝：antd 默认 #001529 显旧的原因是高饱和的"发蓝深色"
    siderBg: '#1c1f26',
    siderElevated: '#2b303b',
    siderBorder: '#2a2e37',
    siderText: '#f1f3f4',
    siderTextMuted: '#9aa0a6',
  },
];

export interface Skin {
  key: string;
  name: string;
  palette: Palette;
  theme: ReturnType<typeof buildTheme>;
}

export const SKINS: Skin[] = PALETTES.map((p) => ({
  key: p.key,
  name: p.name,
  palette: p,
  theme: buildTheme(p),
}));

export const DEFAULT_SKIN_KEY = 'indigo';

/** 兼容不走皮肤上下文的调用方（如构建期静态引用） */
export default SKINS[0].theme;
