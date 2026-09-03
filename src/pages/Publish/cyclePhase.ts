// 招募周期在用户眼里的三种状态。
//
// 原先只有 cycleClosed 一个布尔：不在「开放投递」列表里就算「已结束」。
// 于是管理员把一个已经开投的周期的开始时间往后推时，页面照样说
// 「招募周期已结束」，而旁边的简历状态还写着「已提交（可修改）」——
// 两句话自相矛盾，用户报的就是这个。
//
// 未开始与已结束是两回事：前者要做预告（可见、可期待、不可投），
// 后者是盖棺定论。

export type CyclePhase =
  /** 正在开放投递 */
  | 'open'
  /** 还没开始：可见，做预告，但不可投 */
  | 'upcoming'
  /** 已经截止 */
  | 'ended';

export function resolveCyclePhase(
  cycleId: number | null | undefined,
  openIds: number[],
  upcomingIds: number[],
): CyclePhase {
  const id = Number(cycleId);
  if (openIds.includes(id)) return 'open';
  if (upcomingIds.includes(id)) return 'upcoming';
  // 既不在开放也不在预告 = 窗口已经过去。
  // 拿不到周期列表时（接口挂了）也落这里：宁可只读，也不让人往一个
  // 状态未知的周期里提交简历。
  return 'ended';
}

/** 只有开放中的周期能投递或修改。 */
export const isCycleWritable = (phase: CyclePhase): boolean => phase === 'open';

/** 距开始还有几天；已开始或没有日期时返回 null。 */
export function daysUntil(startDate: string | null | undefined, today: Date): number | null {
  if (!startDate) return null;
  const start = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return null;
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.round((start.getTime() - midnight.getTime()) / 86400000);
  return diff > 0 ? diff : null;
}
