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
  /** 页面底色：比纯白略灰，卡片浮在上面才有层次 */
  pageBg: '#fbfbfc',
  /** 侧栏底色 */
  shellBg: '#f7f8fa',
  /** 细线边框，取代 antd 默认那圈偏重的边 */
  border: '#e8eaed',
  textPrimary: '#1a1a1a',
  textSecondary: '#5f6368',
  textMuted: '#80868b',
} as const;
