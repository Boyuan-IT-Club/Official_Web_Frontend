// 评价舞台 v2 的布局纯逻辑：分栏比例夹取、折叠状态机、偏好存取。
export type PaneFold = 'none' | 'left' | 'right';

export const RATIO_MIN = 0.25;
export const RATIO_MAX = 0.75;
export const RATIO_DEFAULT = 0.45;

export function clampRatio(r: number): number {
  if (!Number.isFinite(r)) return RATIO_DEFAULT;
  return Math.min(RATIO_MAX, Math.max(RATIO_MIN, r));
}

/**
 * 折叠状态机：« 收左 / » 收右 / 点细轨或快捷键恢复。
 * 已收起某侧时再收另一侧 = 直接切换（不存在两侧同时收起）。
 */
export function nextFold(current: PaneFold, action: 'left' | 'right' | 'restore'): PaneFold {
  if (action === 'restore') return 'none';
  if (action === 'left') return current === 'left' ? 'none' : 'left';
  return current === 'right' ? 'none' : 'right';
}

/** Grid 模板：折叠侧收成 28px 细轨，中缝恒 14px */
export function gridColumns(ratio: number, fold: PaneFold): string {
  if (fold === 'left') return '28px 14px 1fr';
  if (fold === 'right') return '1fr 14px 28px';
  const r = clampRatio(ratio);
  return `${r}fr 14px ${1 - r}fr`;
}

const KEY = 'boyuan.evalStage.layout';

export function loadLayoutPrefs(): { ratio: number; fold: PaneFold } {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      const fold: PaneFold = p.fold === 'left' || p.fold === 'right' ? p.fold : 'none';
      return { ratio: clampRatio(Number(p.ratio)), fold };
    }
  } catch { /* 隐私模式等取不到，用默认 */ }
  return { ratio: RATIO_DEFAULT, fold: 'none' };
}

export function saveLayoutPrefs(prefs: { ratio: number; fold: PaneFold }): void {
  try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* 存不了只影响本次 */ }
}
