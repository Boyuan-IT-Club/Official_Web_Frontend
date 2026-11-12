import type {
  SnapshotBody,
  SnapshotDomainState,
  SnapshotMetric,
} from "@/api/manage/retrospectiveApis";

/**
 * 指标快照的展示逻辑:纯函数,不发请求、不渲染。
 *
 * 最要紧的一条:被小格子抑制的值(suppressed)没有数,**不能显示成 0**——
 * 「<5」和「0」对读的人是两回事,而快照之所以抑制,正是不想让人反推出具体人数。
 * 字段随 Agent 版本可能增减,这里对缺字段一律降级显示,不抛错。
 */

/** 快照没带阈值时的兜底(Agent 侧 SMALL_CELL_MIN) */
export const DEFAULT_SMALL_CELL_MIN = 5;

const DOMAIN_LABELS: Record<string, string> = {
  funnel: "招新漏斗",
  conversation: "对话助理",
  kb: "知识库",
  screening: "简历初筛",
  agreement: "人机一致",
  qbank: "面试出题",
  cost: "成本",
};

/** 域的中文名;不认识的域(Agent 新增的)原样显示,不丢 */
export const domainLabel = (domain: string): string => DOMAIN_LABELS[domain] ?? domain;

/** 分布里一格的键:只有 other 有约定的含义,其余原样显示 */
export const keyLabel = (key?: string | null): string => (key === "other" ? "其他" : key ?? "");

const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** 千分位、至多两位小数。不用 toLocaleString:结果随运行环境的 ICU 数据变 */
export function formatNumber(v: number): string {
  const rounded = Math.round(v * 100) / 100;
  const [int, frac] = String(Math.abs(rounded)).split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${rounded < 0 ? "-" : ""}${grouped}${frac ? `.${frac}` : ""}`;
}

/** 按单位把一个数写成字:ratio 是 0–1 的小数,转成百分比 */
export function formatByUnit(value: number, unit?: string): string {
  if (unit === "ratio") return `${formatNumber(value * 100)}%`;
  if (unit === "ms") return `${formatNumber(value)} ms`;
  if (unit === "tokens") return `${formatNumber(value)} tokens`;
  if (!unit || unit === "count") return formatNumber(value);
  return `${formatNumber(value)} ${unit}`;
}

export interface ValueText {
  text: string;
  /** 被小格子抑制:text 是「<5」这类说法,不是数 */
  suppressed: boolean;
  /** 既没被抑制也没有数(字段缺失) */
  missing: boolean;
}

/** 一个指标值该怎么显示 */
export function formatMetricValue(
  m: SnapshotMetric,
  smallCellMin: number = DEFAULT_SMALL_CELL_MIN
): ValueText {
  // 以 suppressed 为准:哪怕上游同时带了一个数,也不显示它
  if (m.suppressed) {
    if (m.unit === "ratio") {
      if (m.side === "low") {
        return {
          text: isNumber(m.n) ? `不足 ${smallCellMin} / ${formatNumber(m.n)}` : `不足 ${smallCellMin}`,
          suppressed: true,
          missing: false,
        };
      }
      if (m.side === "high") return { text: "接近 100%", suppressed: true, missing: false };
      return { text: "样本不足", suppressed: true, missing: false };
    }
    return {
      text: m.side === "low" ? `<${smallCellMin}` : "样本不足",
      suppressed: true,
      missing: false,
    };
  }
  if (!isNumber(m.value)) return { text: "—", suppressed: false, missing: true };
  return { text: formatByUnit(m.value, m.unit), suppressed: false, missing: false };
}

/** 基线周期的值;没有(含那边被抑制)显示「—」 */
export const formatPrev = (m: SnapshotMetric): string =>
  isNumber(m.prev) ? formatByUnit(m.prev, m.unit) : "—";

export interface DeltaText {
  text: string;
  direction: "up" | "down" | "flat";
}

/**
 * 与基线的差。任一侧没有值或被抑制时上游不给差值,这里返回 null(显示「—」)。
 * 比率给的是百分点差;其余给差值,有相对变化时附在括号里。
 * 只说方向不说好坏:投递数涨是好事,错误率涨不是,这里分不清。
 */
export function formatDelta(m: SnapshotMetric): DeltaText | null {
  if (!isNumber(m.delta)) return null;
  if (m.delta === 0) return { text: "持平", direction: "flat" };
  const sign = m.delta > 0 ? "+" : "-";
  const direction = m.delta > 0 ? "up" : "down";
  const abs = Math.abs(m.delta);
  if (m.unit === "ratio") {
    return { text: `${sign}${formatNumber(abs * 100)} 个百分点`, direction };
  }
  const relative = isNumber(m.delta_ratio)
    ? `(${sign}${formatNumber(Math.abs(m.delta_ratio) * 100)}%)`
    : "";
  return { text: `${sign}${formatByUnit(abs, m.unit)}${relative}`, direction };
}

/** 统计时间窗。直接截字符串而不转本地时间:窗口是按北京时间切的,不该随浏览器时区变 */
export function formatWindow(window: SnapshotBody["window"]): string | null {
  if (!window || typeof window.start !== "string" || typeof window.end !== "string") return null;
  const cut = (iso: string) => iso.slice(0, 16).replace("T", " ");
  const zone = window.timezone ? `(${window.timezone})` : "";
  return `${cut(window.start)} ~ ${cut(window.end)}${zone}`;
}

export type MetricRowKind =
  /** 一个数 */
  | "scalar"
  /** 一张小表(同一指标的多格) */
  | "breakdown"
  /** 目录里标了暂缺,还算不出来 */
  | "pending"
  /** 目录里有,这次没取到(列在 absent 里) */
  | "absent"
  /** 目录里有,但这次既没有值也没说原因(多半是所属的域没采到) */
  | "missing";

export interface MetricRow {
  /** 目录项 id */
  id: string;
  name: string;
  definition: string;
  unit?: string;
  kind: MetricRowKind;
  /** scalar 的值 */
  value?: SnapshotMetric;
  /** breakdown 的各格 */
  cells?: SnapshotMetric[];
  /** pending / absent / missing 的原因 */
  reason?: string;
}

export interface DomainSection {
  domain: string;
  label: string;
  /** ok / unavailable / pending;快照没给时为 unknown */
  status: string;
  reason?: string;
  rows: MetricRow[];
}

const domainOfId = (id: string): string => (id.includes(".") ? id.split(".")[0] : "other");

/**
 * 把快照按域整理成可以直接渲染的结构:域的顺序、域内指标的顺序都跟目录走。
 *
 * 目录里没有的指标值不丢——单独成行,用 id 当名字。目录是随快照存的,正常不会对不上;
 * 但对不上时把数藏起来,比显示一个没有口径说明的数更糟。
 */
export function buildDomainSections(snapshot: SnapshotBody | null | undefined): DomainSection[] {
  if (!snapshot || typeof snapshot !== "object") return [];
  const catalog = Array.isArray(snapshot.catalog)
    ? snapshot.catalog.filter((c) => c && typeof c.id === "string")
    : [];
  const metrics = Array.isArray(snapshot.metrics)
    ? snapshot.metrics.filter((m) => m && typeof m.id === "string")
    : [];
  const domains: Record<string, SnapshotDomainState> =
    snapshot.domains && typeof snapshot.domains === "object" ? snapshot.domains : {};
  const absent = new Map<string, string>();
  (Array.isArray(snapshot.absent) ? snapshot.absent : []).forEach((a) => {
    if (a && typeof a.id === "string") absent.set(a.id, a.reason ?? "");
  });

  const byMetric = new Map<string, SnapshotMetric[]>();
  metrics.forEach((m) => {
    const owner = typeof m.metric === "string" && m.metric ? m.metric : m.id.replace(/\[.*\]$/, "");
    byMetric.set(owner, [...(byMetric.get(owner) ?? []), m]);
  });

  const sections = new Map<string, DomainSection>();
  const sectionOf = (domain: string): DomainSection => {
    let section = sections.get(domain);
    if (!section) {
      const state = domains[domain];
      section = {
        domain,
        label: domainLabel(domain),
        status: state?.status ?? "unknown",
        reason: state?.reason ?? undefined,
        rows: [],
      };
      sections.set(domain, section);
    }
    return section;
  };

  const valueRow = (
    base: Pick<MetricRow, "id" | "name" | "definition" | "unit">,
    values: SnapshotMetric[]
  ): MetricRow =>
    values.length === 1 && !values[0].key
      ? { ...base, kind: "scalar", value: values[0] }
      : { ...base, kind: "breakdown", cells: values };

  const seen = new Set<string>();
  catalog.forEach((item) => {
    seen.add(item.id);
    const section = sectionOf(item.domain || domainOfId(item.id));
    const base = {
      id: item.id,
      name: item.name || item.id,
      definition: item.definition ?? "",
      unit: item.unit,
    };
    if (item.status === "pending") {
      section.rows.push({ ...base, kind: "pending", reason: item.reason ?? "" });
      return;
    }
    const values = byMetric.get(item.id) ?? [];
    if (values.length) {
      section.rows.push(valueRow(base, values));
    } else if (absent.has(item.id)) {
      section.rows.push({ ...base, kind: "absent", reason: absent.get(item.id) });
    } else {
      section.rows.push({
        ...base,
        kind: "missing",
        reason: section.status === "unavailable" ? section.reason : undefined,
      });
    }
  });

  byMetric.forEach((values, id) => {
    if (seen.has(id)) return;
    sectionOf(domainOfId(id)).rows.push(
      valueRow({ id, name: id, definition: "", unit: values[0]?.unit }, values)
    );
  });

  // 目录里一项都没有、但状态表里列了的域也要露面(比如整域没采到)
  Object.keys(domains).forEach((domain) => sectionOf(domain));

  return Array.from(sections.values());
}

export interface UnavailableDomain {
  domain: string;
  label: string;
  reason: string;
}

/** 这次没采到的域。采集返回 200 不代表每个域都采到了,有这些就该提示稍后重新采集 */
export function unavailableDomains(
  domains: Record<string, SnapshotDomainState> | null | undefined
): UnavailableDomain[] {
  if (!domains || typeof domains !== "object") return [];
  return Object.keys(domains)
    .filter((d) => domains[d]?.status === "unavailable")
    .map((d) => ({ domain: d, label: domainLabel(d), reason: domains[d]?.reason ?? "" }));
}

export interface CycleOption {
  cycleId: number;
  cycleName: string;
  startDate?: string | null;
}

/**
 * /api/cycles 的返回 → 周期列表。不是数组按没取到处理(null),
 * 别把「没取到」当成「一个周期都没有」;id 不是正整数的坏行丢掉。
 */
export function toCycleList(data: unknown): CycleOption[] | null {
  if (!Array.isArray(data)) return null;
  const out: CycleOption[] = [];
  data.forEach((c: any) => {
    const cycleId = Number(c?.cycleId);
    if (!Number.isInteger(cycleId) || cycleId < 1) return;
    out.push({
      cycleId,
      cycleName: c.cycleName ? String(c.cycleName) : `周期 #${cycleId}`,
      startDate: c.startDate ?? null,
    });
  });
  return out;
}

/**
 * 进页面默认看哪个周期:已经开始的周期里最新的一个(正在进行的,或刚结束的那届);
 * 都还没开始就取列表里最新的。
 */
export function pickDefaultCycle(
  cycles: { cycleId: number; startDate?: string | null }[],
  today: string
): number | null {
  if (!cycles.length) return null;
  const sorted = [...cycles].sort((a, b) => {
    const byStart = String(b.startDate ?? "").localeCompare(String(a.startDate ?? ""));
    return byStart !== 0 ? byStart : b.cycleId - a.cycleId;
  });
  const started = sorted.find((c) => c.startDate && String(c.startDate).slice(0, 10) <= today);
  return (started ?? sorted[0]).cycleId;
}
