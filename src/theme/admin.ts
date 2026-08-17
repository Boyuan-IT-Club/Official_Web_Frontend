import type { ThemeConfig } from 'antd';
import { NEUTRAL, T1 } from './tokens';

/**
 * 管理端主题 T1「靛蓝开发者风」。
 *
 * 演进过程留一笔，避免后来者绕回老路：
 *   v0  antd 默认深色壳（#001529 头部 + 深色侧栏）—— 高饱和"发蓝深色"，观感停在 2019 年
 *   v1  全浅色壳（三个面都接近白）—— 层次分不开、整体发飘，没有视觉锚点
 *   v2  石墨深侧栏 —— 层次解决了，但业务侧明确要求管理端不要暗色调
 *   v3  当前：整体浅色 + 靛蓝强调 + 等宽字点缀，偏"开发工具"的现代观感
 *
 * 层次不再靠深色块，而是靠三层递进：页面 #fcfcfd → 分区 #f2f2f5 → 卡片 #fff + 1px 边框。
 * 这是浅色后台唯一可靠的做法——v1 失败就是因为三个面明度太接近。
 */
const adminTheme: ThemeConfig = {
  token: {
    colorPrimary: T1.accent,
    colorLink: T1.accent,
    colorLinkHover: T1.accentHover,
    colorBgLayout: NEUTRAL.pageBg,
    colorBorder: NEUTRAL.borderStrong,
    colorBorderSecondary: NEUTRAL.border,
    colorText: NEUTRAL.textPrimary,
    colorTextSecondary: NEUTRAL.textSecondary,
    colorTextDescription: NEUTRAL.textMuted,
    borderRadius: 8,
    borderRadiusLG: 10,
    borderRadiusSM: 6,
    fontSize: 14,
    controlHeight: 34,
    wireframe: false,
  },
  components: {
    Layout: {
      bodyBg: NEUTRAL.pageBg,
      headerBg: '#ffffff',
      headerHeight: 48,
      // 侧栏改浅色：theme="light" 读 lightSiderBg（siderBg 只作用于 theme="dark"），
      // 折叠按钮同理走 lightTrigger*，否则浅色侧栏底部会挂一块深色按钮
      lightSiderBg: '#ffffff',
      lightTriggerBg: '#ffffff',
      lightTriggerColor: NEUTRAL.textSecondary,
    },
    Menu: {
      itemBg: 'transparent',
      itemSelectedBg: T1.accentBg,
      itemSelectedColor: T1.accentText,
      itemHoverBg: NEUTRAL.subtleBg,
      itemColor: NEUTRAL.textSecondary,
      itemBorderRadius: 7,
      itemMarginInline: 8,
      itemHeight: 38,
      // 去掉选中项右侧竖线：它在圆角块上会切出直角，两种形状打架
      activeBarWidth: 0,
      activeBarBorderWidth: 0,
    },
    Card: { borderRadiusLG: 10, paddingLG: 20 },
    Table: {
      headerBg: NEUTRAL.subtleBg,
      headerColor: NEUTRAL.textSecondary,
      headerSplitColor: 'transparent',
      rowHoverBg: '#fafafc',
      borderColor: NEUTRAL.border,
      cellPaddingBlock: 12,
    },
    Tabs: {
      itemSelectedColor: T1.accent,
      itemHoverColor: T1.accentHover,
      inkBarColor: T1.accent,
      titleFontSize: 14,
    },
    Button: {
      primaryShadow: 'none',
      defaultShadow: 'none',
      dangerShadow: 'none',
      fontWeight: 500,
    },
    Tag: { defaultBg: NEUTRAL.subtleBg, defaultColor: NEUTRAL.textSecondary },
    Alert: { borderRadiusLG: 10 },
    Modal: { borderRadiusLG: 12, titleFontSize: 16 },
    Statistic: { contentFontSize: 22 },
    Segmented: { itemSelectedBg: T1.accentBg, itemSelectedColor: T1.accentText },
  },
};

export default adminTheme;
