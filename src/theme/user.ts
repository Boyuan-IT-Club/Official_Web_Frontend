import type { ThemeConfig } from 'antd';

/**
 * 用户端主题：目前刻意为空。
 *
 * 曾经在这里做过一版全站改造（品牌深蓝 + 圆角 + Bento 首页），观感反而变差已整体回滚，
 * 因此用户端回到 antd 默认外观 —— 各页面自带的 SCSS 说了算。
 * 视觉一致性由 src/styles/_tokens.scss 的阴影/圆角/字号刻度保证，不靠颜色 token。
 *
 * 保留文件而非删除：craco 的 @theme 别名按 REACT_APP_MODE 二选一，删掉用户端构建会找不到模块。
 */
const userTheme: ThemeConfig = {};

/**
 * 皮肤列表：用户端目前只有一套，SkinProvider 见到只有一项时不渲染切换入口。
 * 将来要给学生端也做皮肤，在这里加项即可，不必改 Provider。
 */
export interface Skin {
  key: string;
  name: string;
  palette?: unknown;
  theme: ThemeConfig;
}

export const SKINS: Skin[] = [{ key: 'default', name: '默认', theme: userTheme }];
export const DEFAULT_SKIN_KEY = 'default';

export default userTheme;
