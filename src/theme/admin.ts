import type { ThemeConfig } from 'antd';
import { BRAND, NEUTRAL } from './tokens';

/**
 * 管理端主题（方向 A：浅色壳 + 品牌深蓝点缀）。
 *
 * 原先没有任何主题定制，用的是 antd 默认深色壳（#001529），观感停留在 2019 年。
 * 这里只调 token 就能让六个管理页同时改观，不必逐页改样式。
 */
const adminTheme: ThemeConfig = {
  token: {
    colorPrimary: BRAND.primary,
    colorLink: BRAND.primary,
    colorBgLayout: NEUTRAL.pageBg,
    colorBorderSecondary: NEUTRAL.border,
    colorText: NEUTRAL.textPrimary,
    colorTextSecondary: NEUTRAL.textSecondary,
    colorTextDescription: NEUTRAL.textMuted,
    // 默认 6px 偏方，8px 更接近当下主流后台；卡片单独给 12px
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,
    fontSize: 14,
    controlHeight: 34,
    wireframe: false,
  },
  components: {
    Layout: {
      bodyBg: NEUTRAL.pageBg,
      headerBg: '#ffffff',
      headerHeight: 56,
      // theme="light" 的 Sider 读的是 lightSiderBg（siderBg 只作用于 theme="dark"），
      // 折叠按钮同理走 lightTrigger*，否则浅色侧栏底部会挂一块深色按钮
      siderBg: NEUTRAL.shellBg,
      lightSiderBg: NEUTRAL.shellBg,
      lightTriggerBg: NEUTRAL.shellBg,
      lightTriggerColor: NEUTRAL.textSecondary,
    },
    Menu: {
      itemBg: 'transparent',
      itemSelectedBg: BRAND.primaryBg,
      itemSelectedColor: BRAND.primary,
      itemHoverBg: '#eef0f3',
      itemColor: NEUTRAL.textSecondary,
      itemBorderRadius: 7,
      itemMarginInline: 8,
      itemHeight: 38,
      // 去掉选中项右侧那条竖线，浅色壳里它显得脏
      activeBarWidth: 0,
      activeBarBorderWidth: 0,
    },
    Card: {
      // 细线边框取代默认阴影，层次靠底色差而不是投影
      borderRadiusLG: 12,
      paddingLG: 20,
    },
    Table: {
      headerBg: '#f7f8fa',
      headerColor: NEUTRAL.textSecondary,
      headerSplitColor: 'transparent',
      rowHoverBg: '#f7f9fc',
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
    Alert: {
      borderRadiusLG: 10,
    },
    Modal: {
      borderRadiusLG: 14,
      titleFontSize: 16,
    },
    Statistic: {
      contentFontSize: 22,
    },
  },
};

export default adminTheme;
