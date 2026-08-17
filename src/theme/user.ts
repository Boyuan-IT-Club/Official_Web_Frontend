import type { ThemeConfig } from 'antd';

/**
 * 用户端主题。
 *
 * ⚠️ 刻意不设任何颜色 token —— 配色完全沿用各页面原有的 SCSS 变量，一个字不改。
 * （曾经在这里统一过品牌深蓝，整站观感反而变差，已回滚。）
 *
 * 这里只统一「怎么画」，与 src/styles/_tokens.scss 的 SCSS 刻度保持一致：
 * antd 组件的圆角与阴影此前和自定义 SCSS 各说各话，同一个页面里
 * antd 的 Card（6px 圆角 + 默认投影）和手写卡片（12px + 自定义阴影）并排出现，
 * 这是"整体不对但说不清哪里"的来源之一。
 */
const userTheme: ThemeConfig = {
  token: {
    // 与 _tokens.scss 的 $radius-control / $radius-sm / $radius-card 对齐
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,
    fontSize: 14,
    controlHeight: 36,
    wireframe: false,
  },
  components: {
    // 按钮的默认投影去掉：站内卡片已统一用细边框表达层次，按钮再带投影就显脏
    Button: { primaryShadow: 'none', defaultShadow: 'none', dangerShadow: 'none', fontWeight: 500 },
    Card: { borderRadiusLG: 12 },
    Modal: { borderRadiusLG: 12, titleFontSize: 16 },
    Alert: { borderRadiusLG: 12 },
    Drawer: { borderRadiusLG: 12 },
  },
};

export default userTheme;
