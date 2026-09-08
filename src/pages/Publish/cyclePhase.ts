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
  /**
   * 管理员已「停止投递」但周期时间还没过：可见、可看自己的简历与进度，
   * 但不能提交、修改或新建。周期时间过了才变成 ended，没投过的同学才看不到它。
   */
  | 'paused'
  /** 还没开始：可见，做预告，但不可投 */
  | 'upcoming'
  /** 已经截止 */
  | 'ended';

/** 把 /api/cycles/open 的列表按 intakeOpen 拆成「可投」与「已停止投递」两组 id。 */
export function splitVisibleCycles(
  list: Array<{ cycleId: number; intakeOpen?: boolean }> | null | undefined,
): { openIds: number[]; pausedIds: number[] } {
  const openIds: number[] = [];
  const pausedIds: number[] = [];
  (list ?? []).forEach((c) => {
    // 旧后端没有 intakeOpen 字段：按可投处理，行为与加字段之前一致
    (c.intakeOpen === false ? pausedIds : openIds).push(Number(c.cycleId));
  });
  return { openIds, pausedIds };
}

export function resolveCyclePhase(
  cycleId: number | null | undefined,
  openIds: number[],
  upcomingIds: number[],
  pausedIds: number[] = [],
): CyclePhase {
  const id = Number(cycleId);
  if (openIds.includes(id)) return 'open';
  if (pausedIds.includes(id)) return 'paused';
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
  pausedIds: number[] = [],
): number | null | undefined {
  const id = Number(storeCycleId);
  if (userPicked) return storeCycleId;
  if (openIds.includes(id) || pausedIds.includes(id)) return storeCycleId;
  if (openIds.length > 0) return openIds[0];
  // 已停止投递但还在时间内的周期排在预告前面：它是「当前这届」，
  // 投过的同学要在这里看自己的简历和进度
  if (pausedIds.length > 0) return pausedIds[0];
  if (upcomingIds.length > 0) return upcomingIds[0];
  return storeCycleId;
}

/**
 * 投递页在「落点周期已结束且本人没有这一届的简历」时该显示哪种空状态。
 *
 * 线上实况：招新间歇期，既没有开放周期也没有预告周期，落点回退到 store
 * 里写死的旧周期，页面照常渲染一份全是「未填写」的空简历，顶上还挂着
 * 「草稿（不可修改）」——那是 status 为空时的兜底标签，不是真有草稿。
 * 用户看到的是一份从未存在过的简历，而不是「现在没有招新」这句话。
 *
 * 返回 null 表示按正常路径渲染（有简历，或周期不是 ended）。
 */
export type PublishEmptyState =
  /** 没有任何开放或预告周期：整站现在没有招新 */
  | 'no-recruitment'
  /** 落点周期已停止投递（时间未过），本人没投过：不能再新建，但周期本身还在 */
  | 'paused-no-resume'
  /** 有别的周期在开放/预告，只是当前落点这一届已结束且本人没投过 */
  | 'ended-no-resume'
  /** 周期列表没拿到（接口失败）：说不清现在有没有招新，不能冒充「已结束」 */
  | 'cycles-unavailable';

export function resolvePublishEmptyState(args: {
  phase: CyclePhase;
  hasResume: boolean;
  openCount: number;
  upcomingCount: number;
  cycleListsFailed: boolean;
}): PublishEmptyState | null {
  const { phase, hasResume, openCount, upcomingCount, cycleListsFailed } = args;
  if (hasResume) return null;
  if (phase === 'paused') return 'paused-no-resume';
  if (phase !== 'ended') return null;
  if (cycleListsFailed) return 'cycles-unavailable';
  if (openCount === 0 && upcomingCount === 0) return 'no-recruitment';
  return 'ended-no-resume';
}
