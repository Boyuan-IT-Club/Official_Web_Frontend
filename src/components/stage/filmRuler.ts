// 胶片条下方的游动标尺：纯计算部分（刻度怎么切、颜色怎么定、指针落在谁身上）。
//
// 为什么要有标尺：打分舞台改成列出全部筛选结果之后，一批动辄五六十人，
// 胶片条五六千像素长，一屏只看得到十几个——看不出自己在哪、看不出整体
// 还剩多少没做、想跳到第 45 位只能一路滚过去。标尺把整批人压成一条，
// 每人一根刻度，拖动或点击直接跳。

export type ChipTone = 'good' | 'now' | 'warn' | 'muted';

/** 超过这个人数就把相邻的人合并成一格，否则刻度挤成一片色带、谁也点不准 */
export const MAX_TICKS = 150;

/**
 * 合并成一格时取哪种颜色：按「最需要关注的」来。
 *
 * 三个舞台的语义是一致的：good=已完成、now=进行中、warn=需要注意
 * （面完未评、无面试）、muted=还没做。
 * - 打分舞台里就是「这一格只要有人没评，就是灰的」—— 已评的绿色不会盖住没评的
 * - warn 排最前：评价工作台的「面完未评」不能因为合并就被吞掉
 */
const TONE_PRIORITY: ChipTone[] = ['warn', 'muted', 'now', 'good'];

export interface RulerTick {
  /** 这一格覆盖的第一个人的下标（含） */
  start: number;
  /** 这一格覆盖的最后一个人的下标（含） */
  end: number;
  tone: ChipTone;
  /** 当前选中的人在这一格里 */
  selected: boolean;
}

export function buildTicks(
  items: ReadonlyArray<{ tagTone?: ChipTone; selected?: boolean }>,
  maxTicks: number = MAX_TICKS,
): RulerTick[] {
  const n = items.length;
  if (n === 0) return [];
  const size = Math.max(1, Math.ceil(n / Math.max(1, maxTicks)));

  const ticks: RulerTick[] = [];
  for (let start = 0; start < n; start += size) {
    const slice = items.slice(start, start + size);
    const tones = new Set(slice.map((it) => it.tagTone ?? 'muted'));
    ticks.push({
      start,
      end: Math.min(n, start + size) - 1,
      tone: TONE_PRIORITY.find((t) => tones.has(t)) ?? 'muted',
      selected: slice.some((it) => it.selected),
    });
  }
  return ticks;
}

/**
 * 指针在标尺上的相对位置（0~1）对应第几个人。
 * 始终精确到人，而不是到格：合并显示只是画法，拖到哪就是哪一位。
 */
export function indexAtRatio(ratio: number, count: number): number {
  if (count <= 0 || !Number.isFinite(ratio)) return -1;
  return Math.min(count - 1, Math.max(0, Math.floor(ratio * count)));
}

/** 胶片条当前可视的那一段，折算成标尺上的左边界与宽度（均为百分比） */
export function visibleWindow(
  scrollLeft: number,
  clientWidth: number,
  scrollWidth: number,
): { left: number; width: number } {
  if (scrollWidth <= 0 || clientWidth >= scrollWidth) return { left: 0, width: 100 };
  const width = (clientWidth / scrollWidth) * 100;
  const left = Math.min(100 - width, Math.max(0, (scrollLeft / scrollWidth) * 100));
  return { left, width };
}
