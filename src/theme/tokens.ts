/**
 * 品牌配色的单一来源。
 *
 * 此前全站散着四套蓝：#1890ff（antd v4 默认）、#1a73e8、#2980b9、#00c6ff（霓虹青），
 * 而真正的品牌色是 #1f3a60（简历 PDF 导出用的也是它）。统一到这里，避免继续分裂。
 */
export const BRAND = {
  /** 品牌深蓝：只做点缀——logo、选中态、关键数字、主按钮 */
  primary: '#1f3a60',
  primaryHover: '#2c4f7c',
  primaryActive: '#16294480',
  /** 选中态底色：品牌蓝的极浅色，用于菜单高亮与标签 */
  primaryBg: '#eaeff7',
  primaryBorder: '#c9d4e5',
} as const;

export const NEUTRAL = {
  /**
   * 页面底色。第一版用过 #fbfbfc，结果侧栏/顶栏/内容区三个面都接近白，
   * 层次分不开、整体发飘，所以这里明确压灰，让白卡真正"浮"起来。
   */
  pageBg: '#f1f3f6',
  /** 内容区里卡片的底色 */
  cardBg: '#ffffff',
  /** 分隔线：比 #e8eaed 实一档，否则在灰底上几乎看不见 */
  border: '#e1e5ea',
  borderStrong: '#dfe3e8',
  textPrimary: '#1a1a1a',
  textSecondary: '#5f6368',
  textMuted: '#80868b',
} as const;

/**
 * 管理端侧栏用的石墨深色。
 *
 * 刻意用中性石墨灰而不是深蓝：antd 默认的 #001529 之所以显旧，
 * 是因为它是高饱和的"发蓝深色"；石墨灰不抢色，任何强调色放上去都干净。
 */
export const GRAPHITE = {
  bg: '#1c1f26',
  bgElevated: '#2b303b',
  border: '#2a2e37',
  text: '#f1f3f4',
  textMuted: '#9aa0a6',
  /** 深底上的强调色：品牌深蓝在深色里辨识度不足，改用其浅化版本 */
  accent: '#8ab4f8',
} as const;
