import { isRevealed, resetScoreRevealForTest, setRevealAll, toggleRevealOne, useScoreReveal } from './scoreReveal';
import { renderHook, act } from '@testing-library/react';

describe('盲评小眼睛的状态', () => {
  beforeEach(() => { window.localStorage.clear(); resetScoreRevealForTest(); });

  it('单份揭开只影响那一份，再点收起', () => {
    const { result } = renderHook(() => useScoreReveal());
    act(() => toggleRevealOne(5));
    expect(isRevealed(result.current, 5)).toBe(true);
    expect(isRevealed(result.current, 6)).toBe(false);
    act(() => toggleRevealOne('5'));
    expect(isRevealed(result.current, 5)).toBe(false);
  });

  it('全部揭开写进 localStorage，刷新后保持', () => {
    act(() => setRevealAll(true));
    expect(window.localStorage.getItem('resume.revealAllScores')).toBe('1');
    resetScoreRevealForTest(); // 模拟刷新：从 localStorage 读回
    const { result } = renderHook(() => useScoreReveal());
    expect(result.current.revealAll).toBe(true);
    expect(isRevealed(result.current, 123)).toBe(true);
    act(() => setRevealAll(false));
    expect(window.localStorage.getItem('resume.revealAllScores')).toBeNull();
  });

  it('单份揭开不持久：刷新即恢复盲评', () => {
    act(() => toggleRevealOne(1));
    resetScoreRevealForTest();
    const { result } = renderHook(() => useScoreReveal());
    expect(isRevealed(result.current, 1)).toBe(false);
  });
});
