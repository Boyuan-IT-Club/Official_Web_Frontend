import type { ThemeConfig } from 'antd';

/**
 * 主题工厂：把「一套配色」变成完整的 antd ThemeConfig。
 *
 * 抽出工厂是为了让皮肤只需描述配色差异（强调色、壳色、层次色），
 * 而圆角/字号/表格/按钮这些结构性设定只写一份——否则加一个皮肤就要
 * 复制上百行 component token，几个皮肤之间必然慢慢漂移。
 */
export interface Palette {
  key: string;
  name: string;
  /** 侧栏是深色还是浅色，决定 antd Sider/Menu 用哪一组 token */
  shell: 'light' | 'dark';

  accent: string;
  accentHover: string;
  /** 强调色的极浅底：菜单选中、标签 */
  accentBg: string;
  /** 浅底上的深色文字（对比度要够） */
  accentText: string;

  /** 页面底色 */
  pageBg: string;
  /** 分区底（表头、只读区） */
  subtleBg: string;
  border: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  /** shell === 'dark' 时侧栏用的色，浅色皮肤留空 */
  siderBg?: string;
  siderElevated?: string;
  siderBorder?: string;
  siderText?: string;
  siderTextMuted?: string;
}

export function buildTheme(p: Palette): ThemeConfig {
  const darkShell = p.shell === 'dark';

  return {
    token: {
      colorPrimary: p.accent,
      colorLink: p.accent,
      colorLinkHover: p.accentHover,
      colorBgLayout: p.pageBg,
      colorBorder: p.borderStrong,
      colorBorderSecondary: p.border,
      colorText: p.textPrimary,
      colorTextSecondary: p.textSecondary,
      colorTextDescription: p.textMuted,
      borderRadius: 8,
      borderRadiusLG: 10,
      borderRadiusSM: 6,
      fontSize: 14,
      controlHeight: 34,
      wireframe: false,
    },
    components: {
      Layout: {
        bodyBg: p.pageBg,
        headerBg: '#ffffff',
        headerHeight: 48,
        // 深色 Sider 读 siderBg / trigger*，浅色 Sider 读 lightSiderBg / lightTrigger*，
        // 两组互不相通——只设一组会导致另一种壳下侧栏或折叠按钮串色
        siderBg: p.siderBg ?? '#1c1f26',
        triggerBg: p.siderElevated ?? '#2b303b',
        triggerColor: p.siderTextMuted ?? '#9aa0a6',
        lightSiderBg: '#ffffff',
        lightTriggerBg: '#ffffff',
        lightTriggerColor: p.textSecondary,
      },
      Menu: {
        itemBorderRadius: 7,
        itemMarginInline: 8,
        itemHeight: 38,
        // 去掉选中项右侧竖线：它在圆角块上会切出直角，两种形状打架
        activeBarWidth: 0,
        activeBarBorderWidth: 0,
        ...(darkShell
          ? {
            darkItemBg: 'transparent',
            darkSubMenuItemBg: 'transparent',
            darkItemSelectedBg: p.siderElevated ?? '#2b303b',
            darkItemSelectedColor: '#ffffff',
            darkItemHoverBg: '#252932',
            darkItemColor: p.siderTextMuted ?? '#9aa0a6',
          }
          : {
            itemBg: 'transparent',
            itemSelectedBg: p.accentBg,
            itemSelectedColor: p.accentText,
            itemHoverBg: p.subtleBg,
            itemColor: p.textSecondary,
          }),
      },
      Card: { borderRadiusLG: 10, paddingLG: 20 },
      Table: {
        headerBg: p.subtleBg,
        headerColor: p.textSecondary,
        headerSplitColor: 'transparent',
        rowHoverBg: p.subtleBg,
        borderColor: p.border,
        cellPaddingBlock: 12,
      },
      Tabs: {
        itemSelectedColor: p.accent,
        itemHoverColor: p.accentHover,
        inkBarColor: p.accent,
        titleFontSize: 14,
      },
      Button: {
        primaryShadow: 'none',
        defaultShadow: 'none',
        dangerShadow: 'none',
        fontWeight: 500,
      },
      Tag: { defaultBg: p.subtleBg, defaultColor: p.textSecondary },
      Alert: { borderRadiusLG: 10 },
      Modal: { borderRadiusLG: 12, titleFontSize: 16 },
      Statistic: { contentFontSize: 22 },
      Segmented: { itemSelectedBg: p.accentBg, itemSelectedColor: p.accentText },
    },
  };
}
