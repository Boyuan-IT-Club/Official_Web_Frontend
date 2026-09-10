// 打分舞台的队列推进逻辑。抽成纯函数是为了能直接测：
// 「回车跳下一位未打分」「⌘→ 相邻」「部门切换后落到哪一位」
// 这三条动线的边界（末位、回绕、全打完、切走当前人）单靠点界面验不完。

export interface QueueItem {
  resumeId: number;
  name: string;
  /** 展示分：null = 没人打过分（后端已按署名判定，0 分不会误判成未打） */
  score: number | null;
  /** 志愿部门（第一/第二志愿的并集，用于部门快切） */
  depts: string[];
}

/** 按部门过滤；dept 为空表示不筛 */
export function filterByDept(items: QueueItem[], dept?: string): QueueItem[] {
  if (!dept) return items;
  return items.filter((it) => it.depts.includes(dept));
}

/** 相邻位：step=1 下一位，-1 上一位；走到头回绕 */
export function neighborOf(items: QueueItem[], currentId: number, step: 1 | -1): QueueItem | null {
  if (items.length === 0) return null;
  const at = items.findIndex((it) => it.resumeId === currentId);
  if (at < 0) return items[0];
  const next = (at + step + items.length) % items.length;
  return next === at ? null : items[next];
}

/**
 * 下一位未打分：从当前往后找，找不到再从头绕一圈。
 * 刻意排除当前这位——刚打完分时列表数据可能还没回填，
 * 不排除会原地打转。全部打完返回 null。
 */
export function nextUngradedOf(items: QueueItem[], currentId: number): QueueItem | null {
  if (items.length === 0) return null;
  const at = items.findIndex((it) => it.resumeId === currentId);
  const ordered = at < 0 ? items : [...items.slice(at + 1), ...items.slice(0, at)];
  return ordered.find((it) => it.score == null && it.resumeId !== currentId) ?? null;
}

/**
 * 部门切换后的落点：当前这位仍在新范围里就留在原地（不打断正在看的人），
 * 否则优先落到第一位未打分的，再退而求其次落到第一位。
 */
export function landingAfterDeptChange(items: QueueItem[], currentId: number): QueueItem | null {
  if (items.length === 0) return null;
  const stay = items.find((it) => it.resumeId === currentId);
  if (stay) return stay;
  return items.find((it) => it.score == null) ?? items[0];
}

/** 进度信息：第几位 / 共几位 / 还剩几位未打分 */
export function progressOf(items: QueueItem[], currentId: number) {
  const at = items.findIndex((it) => it.resumeId === currentId);
  return {
    index: at < 0 ? 0 : at + 1,
    total: items.length,
    ungraded: items.filter((it) => it.score == null).length,
  };
}
