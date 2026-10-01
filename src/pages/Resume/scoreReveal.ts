// 盲评的「小眼睛」：主动查看他人打分。
//
// 两档：
// - 单份：只揭开这一份，会话内有效（换页、进详情、进舞台都认），刷新即恢复盲评；
// - 全部：列表上一键全开，记在 localStorage——这是查看者自己的习惯设置，
//   刷新后保持；按钮上常驻睁眼/闭眼图标，开着不会忘。
//
// 不放 redux：列表、详情、打分舞台三处要同时读写，又不想让它跟着 resume
// slice 的重置/重拉一起被清掉。一个模块级小 store + useSyncExternalStore 足够。
import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'resume.revealAllScores';

export interface ScoreRevealState {
  revealAll: boolean;
  revealed: ReadonlySet<string>;
}

const readRevealAll = (): boolean => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

let state: ScoreRevealState = { revealAll: readRevealAll(), revealed: new Set() };
const listeners = new Set<() => void>();

const emit = (next: ScoreRevealState): void => {
  state = next;
  listeners.forEach((l) => l());
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

const getSnapshot = (): ScoreRevealState => state;

export function useScoreReveal(): ScoreRevealState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function setRevealAll(on: boolean): void {
  try {
    if (on) window.localStorage.setItem(STORAGE_KEY, '1');
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* 隐私模式等存不了就只在本次会话生效 */
  }
  emit({ ...state, revealAll: on });
}

/** 切换单份的揭开状态 */
export function toggleRevealOne(resumeId: number | string): void {
  const id = String(resumeId);
  const next = new Set(state.revealed);
  if (next.has(id)) next.delete(id); else next.add(id);
  emit({ ...state, revealed: next });
}

/** 这一份是否被主动揭开（全部模式或单份揭开） */
export function isRevealed(s: ScoreRevealState, resumeId: number | string | undefined | null): boolean {
  if (s.revealAll) return true;
  return resumeId != null && s.revealed.has(String(resumeId));
}

/** 仅测试用：回到初始状态 */
export function resetScoreRevealForTest(): void {
  emit({ revealAll: readRevealAll(), revealed: new Set() });
}
