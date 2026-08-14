import type { ThemeConfig } from 'antd';
import { BRAND, NEUTRAL } from './tokens';

/**
 * 用户端主题。
 *
 * 目前只统一品牌色与圆角，把散落的 #1890ff / #1a73e8 / #2980b9 收敛掉；
 * 着陆页与登录后两套设计语言的整体改造待定稿后再做（见方案讨论）。
 */
const userTheme: ThemeConfig = {
  token: {
    colorPrimary: BRAND.primary,
    colorLink: BRAND.primary,
    borderRadius: 8,
    borderRadiusLG: 12,
    fontSize: 14,
    wireframe: false,
  },
  components: {
    Button: { primaryShadow: 'none', defaultShadow: 'none', fontWeight: 500 },
    Card: { borderRadiusLG: 12 },
    Tag: { defaultBg: '#f1f3f4', defaultColor: NEUTRAL.textSecondary },
  },
};

export default userTheme;
