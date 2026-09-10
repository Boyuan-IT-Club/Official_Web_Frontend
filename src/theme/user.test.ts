// 皮肤表的结构约束：这些坏法（键重复、默认皮肤带变量、变量名拼错）
// 不会在编译期报错，只会在线上表现成「切了没反应」或「切回默认还残留颜色」。
import { DEFAULT_SKIN_KEY, SKINS } from './user';

describe('用户端皮肤表', () => {
  it('key 全局唯一，默认皮肤存在', () => {
    const keys = SKINS.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain(DEFAULT_SKIN_KEY);
  });

  it('默认皮肤零下发：无 cssVars、无 antd token——这就是「不选不换」的保证', () => {
    const def = SKINS.find((s) => s.key === DEFAULT_SKIN_KEY)!;
    expect(def.cssVars ?? {}).toEqual({});
    expect(def.theme).toEqual({});
  });

  it('非默认皮肤的变量名全部以 --skin- 开头（Provider 清理逻辑依赖这一点）', () => {
    SKINS.filter((s) => s.key !== DEFAULT_SKIN_KEY).forEach((s) => {
      Object.keys(s.cssVars ?? {}).forEach((k) => expect(k).toMatch(/^--skin-/));
    });
  });

  it('每款非默认皮肤都成套下发核心变量，避免「换了主色没换底色」的半吊子皮肤', () => {
    const required = ['--skin-accent', '--skin-page-bg', '--skin-title', '--skin-muted', '--skin-hero-bg', '--skin-nav-bg', '--skin-sider-bg', '--skin-sider-active', '--skin-hero-strong', '--skin-card-bg', '--skin-subtle-bg', '--skin-line'];
    SKINS.filter((s) => s.key !== DEFAULT_SKIN_KEY).forEach((s) => {
      required.forEach((k) => expect(Object.keys(s.cssVars ?? {})).toContain(k));
    });
  });

  // 深色皮肤（曜石深空）随四款一并撤下，这条断言跟着删。
  // 若以后再加深色皮肤，记得连同「声明 antd 暗色算法」这条一起加回来——
  // 不声明的话组件仍是白底黑字，只有背景变黑。

  it('只保留默认与晨霞两款：皮肤越多越没人挑，每款还要在三个页面各验一遍版式', () => {
    expect(SKINS.map((s) => s.key)).toEqual([DEFAULT_SKIN_KEY, 'dawn']);
  });
});

describe('晨霞皮肤', () => {
  const dawn = SKINS.find((s) => s.key === 'dawn')!;

  it('存在且不是默认——打磨成果独立上线，默认皮肤保持线上现状', () => {
    expect(dawn).toBeDefined();
    expect(DEFAULT_SKIN_KEY).not.toBe('dawn');
    // 默认皮肤仍是零下发（不选不换的机制保证）
    const def = SKINS.find((s) => s.key === DEFAULT_SKIN_KEY)!;
    expect(def.cssVars ?? {}).toEqual({});
    expect(def.theme).toEqual({});
  });

  it('横幅底透明（画布连续无缝的前提）且带整屋画布', () => {
    expect(dawn.cssVars?.['--skin-hero-bg']).toBe('transparent');
    expect(dawn.cssVars?.['--skin-page-bg']).toContain('radial-gradient');
  });

  it('走 classic 版式（复用默认横幅结构，玻璃与流动字由 data-skin 样式叠加）', () => {
    expect(dawn.layout).toBe('classic');
  });
});
