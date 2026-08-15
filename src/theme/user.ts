import type { ThemeConfig } from 'antd';
import { BRAND, NEUTRAL } from './tokens';

/**
 * 用户端主题（方向 1 的品牌配色 + 方向 4/7 的布局在页面层实现）。
 *
 * 改造前用户端散着四套蓝：#1890ff（antd v4 默认）、#1a73e8、#2980b9、
 * 霓虹青 #00c6ff，而真正的品牌色是 #1f3a60。这里统一到品牌色，
 * 并把圆角、边框、按钮观感与管理端对齐——两个站看起来才像同一个产品。
 */
const userTheme: ThemeConfig = {
  token: {
    colorPrimary: BRAND.primary,
    colorLink: BRAND.primary,
    colorBgLayout: NEUTRAL.pageBg,
    colorBorder: NEUTRAL.borderStrong,
    colorBorderSecondary: NEUTRAL.border,
    colorText: NEUTRAL.textPrimary,
    colorTextSecondary: NEUTRAL.textSecondary,
    colorTextDescription: NEUTRAL.textMuted,
    borderRadius: 10,
    borderRadiusLG: 14,
    borderRadiusSM: 8,
    fontSize: 14,
    controlHeight: 36,
    wireframe: false,
  },
  components: {
    Layout: {
      bodyBg: NEUTRAL.pageBg,
      headerBg: '#ffffff',
      headerHeight: 56,
      // 用户端侧栏走浅色：这里是给学生用的，不需要后台那种深色锚点
      lightSiderBg: '#ffffff',
      lightTriggerBg: '#ffffff',
      lightTriggerColor: NEUTRAL.textSecondary,
    },
    Menu: {
      itemBg: 'transparent',
      itemSelectedBg: BRAND.primaryBg,
      itemSelectedColor: BRAND.primary,
      itemHoverBg: '#f1f3f4',
      itemColor: NEUTRAL.textSecondary,
      itemBorderRadius: 9,
      itemMarginInline: 10,
      itemHeight: 40,
      activeBarWidth: 0,
      activeBarBorderWidth: 0,
    },
    Card: { borderRadiusLG: 14, paddingLG: 20 },
    Button: { primaryShadow: 'none', defaultShadow: 'none', fontWeight: 500 },
    Tag: { defaultBg: '#f1f3f4', defaultColor: NEUTRAL.textSecondary },
    Steps: { colorPrimary: BRAND.primary },
    Alert: { borderRadiusLG: 12 },
    Modal: { borderRadiusLG: 14, titleFontSize: 16 },
  },
};

export default userTheme;
