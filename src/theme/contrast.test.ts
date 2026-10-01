// 主按钮是「强调色底 + 白字」。对比不够时按钮发虚，用户会以为它不可用
// （线上反馈：石墨皮肤主色 #8ab4f8，白字对比 2.1:1，打分舞台、新手指引的按钮都像禁用）。
// 这里把所有皮肤的主色钉在 WCAG AA（≥ 4.5:1）以上。
import { SKINS as ADMIN_SKINS } from './admin';
import { SKINS as USER_SKINS } from './user';

const luminance = (hex: string): number => {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrastWithWhite = (hex: string): number => 1.05 / (luminance(hex) + 0.05);

describe('主按钮颜色对比度', () => {
  it.each(ADMIN_SKINS.map((s) => [s.name, s.palette.accent]))('管理端「%s」主色 %s 白字对比 ≥ 4.5', (_name, accent) => {
    expect(contrastWithWhite(accent as string)).toBeGreaterThanOrEqual(4.5);
  });

  it('用户端非默认皮肤的主色白字对比 ≥ 4.5', () => {
    USER_SKINS.forEach((s) => {
      const primary = (s.theme as any)?.token?.colorPrimary;
      if (primary) expect(contrastWithWhite(primary)).toBeGreaterThanOrEqual(4.5);
    });
  });
});
