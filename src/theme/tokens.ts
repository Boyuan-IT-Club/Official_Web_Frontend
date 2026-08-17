/**
 * 配色的单一来源。
 *
 * 用户端曾散着四套蓝（#1890ff / #1a73e8 / #2980b9 / #00c6ff），
 * 而品牌色是 #1f3a60（简历 PDF 导出用的也是它）。BRAND 保留品牌色定义，
 * 但用户端目前不套用（那版改造观感变差已回滚），只由管理端与导出物使用。
 */
export const BRAND = {
  /** 品牌深蓝 */
  primary: '#1f3a60',
  primaryHover: '#2c4f7c',
  primaryBg: '#eaeff7',
  primaryBorder: '#c9d4e5',
} as const;

/**
 * 管理端主题 T1「靛蓝开发者风」。
 *
 * 演进：antd 默认深蓝壳(#001529) → 全浅色壳(层次分不开) → 石墨深侧栏
 *      → 当前 T1 浅色 + 靛蓝强调。
 * 最后这一步是业务侧的明确要求：管理端不要暗色调，要偏"开发工具"的现代观感。
 *
 * 靛蓝而非品牌深蓝：#1f3a60 明度太低，在浅色底上做强调色会显沉；
 * #5b5bd6 在白底上对比足够又不刺眼，长时间看表格不累。
 * 与用户端的蓝同属冷色系，两个站看着仍是一家。
 */
export const T1 = {
  /** 强调色：主按钮、选中态、关键数字、链接 */
  accent: '#5b5bd6',
  accentHover: '#6d6de0',
  accentActive: '#4a4ac0',
  /** 极浅底：菜单选中、标签、徽章 */
  accentBg: '#eeeefc',
  /** 浅底上的深色文字（对比度达标） */
  accentText: '#3c3489',
  accentBorder: '#d8d8e0',
} as const;

export const NEUTRAL = {
  /** 页面底色：略带冷调的近白，白卡浮在上面才有层次 */
  pageBg: '#fcfcfd',
  /** 内容区更实一档的分区底（表头、只读区） */
  subtleBg: '#f2f2f5',
  cardBg: '#ffffff',
  /** 分隔线 */
  border: '#e8e8ed',
  borderStrong: '#d8d8e0',
  textPrimary: '#1c1c1f',
  textSecondary: '#5c5c66',
  textMuted: '#8a8a94',
  textFaint: '#a8a8b3',
} as const;

/**
 * 等宽字栈。
 *
 * "开发感"里最有效的一笔其实不是配色，而是把学号、时间、分数这类
 * 定长/数值信息改用等宽字——数字纵向对齐后，表格一眼就能扫。
 */
export const MONO_FONT =
  "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";
