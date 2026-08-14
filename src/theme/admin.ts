import type { ThemeConfig } from 'antd';
import { BRAND, GRAPHITE, NEUTRAL } from './tokens';

/**
 * 管理端主题（B1：石墨深侧栏 + 灰底浅内容）。
 *
 * 演进过程值得留一笔，避免后来者绕回老路：
 *   v0  antd 默认深色壳（#001529 头部 + 深色侧栏）—— 高饱和的"发蓝深色"，观感停在 2019 年
 *   v1  全浅色壳（#f7f8fa 侧栏 / 白顶栏 / #fbfbfc 内容）—— 三个面都接近白，
 *       层次分不开、整体发飘，没有视觉锚点
 *   v2  当前：侧栏用中性石墨灰锚住左侧，内容区压到 #f1f3f6，白卡浮在上面对比明确。
 *       深侧栏 + 浅内容是管理后台最成熟的范式，表格与表单放进去都不会出问题。
 *
 * 品牌深蓝 #1f3a60 仍是强调色（主按钮、选中文字、关键数字），
 * 但在深色侧栏里改用其浅化版 #8ab4f8——深底上深蓝辨识度不足。
 */
const adminTheme: ThemeConfig = {
  token: {
    colorPrimary: BRAND.primary,
    colorLink: BRAND.primary,
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
      // Sider 恢复 theme="dark"，读的是 siderBg / trigger* 这一组
      siderBg: GRAPHITE.bg,
      triggerBg: GRAPHITE.bgElevated,
      triggerColor: GRAPHITE.textMuted,
    },
    Menu: {
      // 深色菜单的选中态用"抬高一档的石墨色"而不是蓝色块——
      // 深侧栏里再放一块高饱和的蓝，正是旧版显旧的原因
      darkItemBg: 'transparent',
      darkSubMenuItemBg: 'transparent',
      darkItemSelectedBg: GRAPHITE.bgElevated,
      darkItemSelectedColor: '#ffffff',
      darkItemHoverBg: '#252932',
      darkItemColor: GRAPHITE.textMuted,
      itemBorderRadius: 7,
      itemMarginInline: 8,
      itemHeight: 38,
      activeBarWidth: 0,
      activeBarBorderWidth: 0,
    },
    Card: {
      borderRadiusLG: 10,
      paddingLG: 20,
    },
    Table: {
      headerBg: '#f6f8fa',
      headerColor: NEUTRAL.textSecondary,
      headerSplitColor: 'transparent',
      rowHoverBg: '#f6f8fa',
      borderColor: NEUTRAL.border,
      cellPaddingBlock: 12,
    },
    Tabs: {
      itemSelectedColor: BRAND.primary,
      itemHoverColor: BRAND.primaryHover,
      inkBarColor: BRAND.primary,
      titleFontSize: 14,
    },
    Button: {
      primaryShadow: 'none',
      defaultShadow: 'none',
      dangerShadow: 'none',
      fontWeight: 500,
    },
    Tag: {
      defaultBg: '#f1f3f4',
      defaultColor: NEUTRAL.textSecondary,
    },
    Alert: { borderRadiusLG: 10 },
    Modal: { borderRadiusLG: 12, titleFontSize: 16 },
    Statistic: { contentFontSize: 22 },
  },
};

export default adminTheme;
