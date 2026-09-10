// 悬浮打分岛的位置计算。抽成纯函数是为了能直接测边界：
// 拖出屏幕、换了分辨率、存档位置失效——这些靠点界面验不完整。

export interface Point { x: number; y: number }
export interface Size { w: number; h: number }

const MARGIN = 12;

/** 把位置夹回视口内，留出边距；岛比视口还大时贴左上 */
export function clampToViewport(p: Point, size: Size, vp: Size): Point {
  const maxX = Math.max(MARGIN, vp.w - size.w - MARGIN);
  const maxY = Math.max(MARGIN, vp.h - size.h - MARGIN);
  return {
    x: Math.min(Math.max(p.x, MARGIN), maxX),
    y: Math.min(Math.max(p.y, MARGIN), maxY),
  };
}

/** 默认位置：右下角。首次进入、以及存档位置在当前视口里放不下时用 */
export function defaultPosition(size: Size, vp: Size): Point {
  return clampToViewport({ x: vp.w - size.w - 22, y: vp.h - size.h - 74 }, size, vp);
}

const KEY = 'boyuan.stage.dockPos';

export function loadPosition(): Point | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    return typeof p?.x === 'number' && typeof p?.y === 'number' ? p : null;
  } catch {
    return null;   // 隐私模式或脏数据：当作没存过
  }
}

export function savePosition(p: Point): void {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* 存不了就只在本次会话生效 */ }
}
