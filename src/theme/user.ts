import type { ThemeConfig } from 'antd';

/**
 * 用户端主题：目前刻意为空。
 *
 * 曾经在这里做过一版全站改造（品牌深蓝 + 圆角 + Bento 首页），效果不理想已整体回滚，
 * 用户端因此回到 antd 默认外观 —— 也就是各页面自带的 SCSS 说了算，与改造前一致。
 *
 * 保留这个文件而不是删掉，是因为 craco 的 @theme 别名按 REACT_APP_MODE 二选一，
 * 删掉会让用户端构建找不到模块。空对象等价于「不覆盖任何 token」。
 *
 * 下次要做用户端视觉改造时，从这里加 token 是最省事的入口：
 * 一处改动即可影响全部用户端页面，不必逐页改 SCSS。
 */
const userTheme: ThemeConfig = {};

export default userTheme;
