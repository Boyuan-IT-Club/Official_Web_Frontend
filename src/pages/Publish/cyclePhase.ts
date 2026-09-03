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

/**
 * 决定投递页要展示哪个周期。
 *
 * 顺序有讲究：用户点过切换器就一律听他的（切换器里也列已结束的周期供查看历史）；
 * 否则优先开放中的；**没有任何开放周期时落到「最快要开始的那个」**，
 * 而不是 store 里那个写死的默认周期。
 *
 * 最后一步是线上事故的修复：招新间歇期没有开放周期，页面拿着默认周期
 * （既不开放也早已截止）去请求简历，后端一律回 3010，前端弹两个红色报错框。
 * 而此时明明有已排期的下一届 —— 该给的是预告，不是报错。
 */
export function resolveActiveCycleId(
  storeCycleId: number | null | undefined,
  openIds: number[],
  upcomingIds: number[],
  userPicked: boolean,
): number | null | undefined {
  const id = Number(storeCycleId);
  if (userPicked) return storeCycleId;
  if (openIds.includes(id)) return storeCycleId;
  if (openIds.length > 0) return openIds[0];
  if (upcomingIds.length > 0) return upcomingIds[0];
  return storeCycleId;
}
