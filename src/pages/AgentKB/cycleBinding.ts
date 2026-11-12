import dayjs, { Dayjs } from "dayjs";

/**
 * 知识条目的「招新周期」绑定:纯逻辑,不发请求、不渲染。
 *
 * 规则(Agent 侧 kb-ops-loop D7):
 *   - cycle_id 为空 = 常青,任何时候都可被检索;
 *   - 绑定了周期 = 只在该周期开放期间可被检索,周期结束后自动退出检索。
 * 「开放」以 /api/cycles/open 为准——Agent 检索时读的就是它,这里不另算一套。
 */

/** 展示与选择只用到这几个字段;日期缺失时只是少一句「已结束/未开始」的说明 */
export interface CycleInfo {
  cycleId: number;
  cycleName: string;
  startDate?: string | null;
  endDate?: string | null;
}

/**
 * 周期目录。两份数据各走一个接口,各自可能取不到:
 * 取不到用 null 表示「不知道」,不能用空数组/空集合顶替——
 * 那会把「没取到」说成「一个周期都没有 / 一个都没开放」,进而误报「检索不到」。
 */
export interface CycleDirectory {
  /** 全部周期,用于选项与名称;null = 没取到 */
  cycles: CycleInfo[] | null;
  /** 当前开放的周期 id;null = 没取到 */
  openIds: ReadonlySet<number> | null;
}

export const EMPTY_DIRECTORY: CycleDirectory = { cycles: null, openIds: null };

export const EVERGREEN_LABEL = "常青(不绑定周期)";

/** 周期信息没取全时给管理员的一句话:哪些事暂时做不了、哪些不受影响;都取到了返回 null */
export function directoryProblem(directory: CycleDirectory): string | null {
  const noCycles = directory.cycles === null;
  const noOpen = directory.openIds === null;
  if (!noCycles && !noOpen) return null;
  const kept = "条目照常可以查看和编辑,已有的周期绑定会原样保留";
  if (noCycles && noOpen) {
    return `招新周期信息加载失败:${kept};暂时不能改绑到其他周期,也无法判断绑定了周期的条目是否在检索范围内。`;
  }
  if (noCycles) {
    return `招新周期列表加载失败:${kept};暂时不能改绑到其他周期(仍可改回常青)。`;
  }
  return "开放中的周期加载失败:暂时无法判断绑定了周期的条目现在是否在检索范围内,其他功能不受影响。";
}

/**
 * 把接口回来的 cycle_id 收敛成「正整数或 null」。
 * 线上的 Agent 可能还是旧版本、根本不返回这个字段:undefined 与 null 一样按常青处理。
 */
export function normalizeCycleId(raw: unknown): number | null {
  return typeof raw === "number" && Number.isInteger(raw) && raw >= 1 ? raw : null;
}

/** /api/cycles 的返回 → 周期列表;形状不对(不是数组)按没取到处理 */
export function toCycleInfos(data: unknown): CycleInfo[] | null {
  if (!Array.isArray(data)) return null;
  const out: CycleInfo[] = [];
  data.forEach((c: any) => {
    const cycleId = normalizeCycleId(Number(c?.cycleId));
    if (cycleId === null) return;
    out.push({
      cycleId,
      cycleName: c.cycleName ? String(c.cycleName) : `周期 #${cycleId}`,
      startDate: c.startDate ?? null,
      endDate: c.endDate ?? null,
    });
  });
  return out;
}

/** /api/cycles/open 的返回 → 开放周期 id 集合;形状不对按没取到处理 */
export function toOpenIds(data: unknown): Set<number> | null {
  if (!Array.isArray(data)) return null;
  const ids = new Set<number>();
  data.forEach((c: any) => {
    const cycleId = normalizeCycleId(Number(c?.cycleId));
    if (cycleId !== null) ids.add(cycleId);
  });
  return ids;
}

export type BindingStatus =
  /** 没绑定周期 */
  | "evergreen"
  /** 绑定的周期正在开放,可被检索 */
  | "open"
  /** 周期已结束,不会被检索 */
  | "ended"
  /** 周期还没开始,暂时不会被检索 */
  | "upcoming"
  /** 不在开放期,但说不清是结束了还是没开始(缺日期,或周期已被删除) */
  | "closed"
  /** 开放周期没取到,无法判断 */
  | "unknown";

export interface BindingView {
  status: BindingStatus;
  cycleId: number | null;
  /** 周期名;取不到名字时退回「周期 #id」,常青时就是「常青」 */
  label: string;
  /** 跟在名字后面的状态词,如「已结束」;没有可说的为空串 */
  stateText: string;
  /** 现在检索不到——列表与表单都要据此给出明显提示 */
  unsearchable: boolean;
  /** 给管理员的一句话说明 */
  hint: string;
}

const parseDay = (v?: string | null): Dayjs | null => {
  if (!v) return null;
  const d = dayjs(v);
  return d.isValid() ? d : null;
};

/** 一个 cycle_id 当前意味着什么:绑没绑、绑的是谁、现在检索得到吗 */
export function describeBinding(
  rawCycleId: unknown,
  directory: CycleDirectory,
  today: Dayjs = dayjs()
): BindingView {
  const cycleId = normalizeCycleId(rawCycleId);
  if (cycleId === null) {
    return {
      status: "evergreen",
      cycleId: null,
      label: "常青",
      stateText: "",
      unsearchable: false,
      hint: "常青内容,任何时候都可被检索",
    };
  }

  const { cycles, openIds } = directory;
  const cycle = cycles?.find((c) => c.cycleId === cycleId);
  const label = cycle?.cycleName ?? `周期 #${cycleId}`;
  const base = { cycleId, label };

  if (openIds === null) {
    return {
      ...base,
      status: "unknown",
      stateText: "开放状态未知",
      unsearchable: false,
      hint: "开放周期没取到,暂时无法判断这条内容现在是否在检索范围内",
    };
  }
  if (openIds.has(cycleId)) {
    return {
      ...base,
      status: "open",
      stateText: "开放中",
      unsearchable: false,
      hint: "周期开放中,可被检索;周期结束后自动退出检索",
    };
  }

  // 以下都不在开放期,只是说法不同
  if (cycles !== null && !cycle) {
    return {
      ...base,
      status: "closed",
      stateText: "周期不存在",
      unsearchable: true,
      hint: "绑定的周期已不存在,这条内容现在不会被检索到;请改回常青或换绑其他周期",
    };
  }
  const end = parseDay(cycle?.endDate);
  if (end && today.isAfter(end, "day")) {
    return {
      ...base,
      status: "ended",
      stateText: "已结束",
      unsearchable: true,
      hint: "周期已结束,这条内容现在不会被检索到;仍要使用请改回常青或换绑下一届",
    };
  }
  const start = parseDay(cycle?.startDate);
  if (start && today.isBefore(start, "day")) {
    return {
      ...base,
      status: "upcoming",
      stateText: "未开始",
      unsearchable: true,
      hint: "周期还没开始,这条内容暂时不会被检索到,周期开放后自动生效",
    };
  }
  return {
    ...base,
    status: "closed",
    stateText: "未开放",
    unsearchable: true,
    hint: "周期当前不在开放期,这条内容现在不会被检索到",
  };
}

export interface CycleOption {
  value: number;
  label: string;
}

/**
 * 选择器里的周期选项(不含「常青」那一项),新的排前面。
 *
 * 当前绑定值不在列表里时补一项占位:周期列表取不到、或周期已被删除时,
 * 选择器仍要能显示并原样保留这个绑定,而不是把它显示成一个裸数字或悄悄变回常青。
 */
export function buildCycleOptions(
  directory: CycleDirectory,
  current: number | null,
  today: Dayjs = dayjs()
): CycleOption[] {
  const cycles = directory.cycles ?? [];
  const options = [...cycles]
    .sort((a, b) => {
      const byStart = String(b.startDate ?? "").localeCompare(String(a.startDate ?? ""));
      return byStart !== 0 ? byStart : b.cycleId - a.cycleId;
    })
    .map((c) => {
      const { stateText } = describeBinding(c.cycleId, directory, today);
      // 「开放状态未知」是目录层面的问题,不逐项重复
      const suffix = directory.openIds !== null && stateText ? `(${stateText})` : "";
      return { value: c.cycleId, label: `${c.cycleName}${suffix}` };
    });

  if (current !== null && !cycles.some((c) => c.cycleId === current)) {
    options.push({
      value: current,
      label: directory.cycles === null ? `周期 #${current}` : `周期 #${current}(周期不存在)`,
    });
  }
  return options;
}
