import { clampToViewport, defaultPosition } from './dockPosition';

const size = { w: 380, h: 60 };
const vp = { w: 1280, h: 800 };

describe('悬浮打分岛的位置', () => {
  it('拖出右下角会被夹回视口内，且保留边距', () => {
    const p = clampToViewport({ x: 5000, y: 5000 }, size, vp);
    expect(p.x).toBe(1280 - 380 - 12);
    expect(p.y).toBe(800 - 60 - 12);
  });

  it('拖出左上角同样夹回', () => {
    expect(clampToViewport({ x: -300, y: -80 }, size, vp)).toEqual({ x: 12, y: 12 });
  });

  it('视口内的位置原样保留', () => {
    expect(clampToViewport({ x: 400, y: 300 }, size, vp)).toEqual({ x: 400, y: 300 });
  });

  it('窗口缩到比岛还小：贴左上而不是给出负坐标', () => {
    const p = clampToViewport({ x: 900, y: 700 }, size, { w: 320, h: 40 });
    expect(p.x).toBe(12);
    expect(p.y).toBe(12);
  });

  it('默认位置在右下角且在视口内', () => {
    const p = defaultPosition(size, vp);
    expect(p.x).toBeGreaterThan(800);
    expect(p.y).toBeGreaterThan(600);
    expect(p.x + size.w).toBeLessThanOrEqual(1280);
  });
});
