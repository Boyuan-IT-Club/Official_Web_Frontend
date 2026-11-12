import { request } from '@/utils';

/**
 * 周期复盘 · 指标快照。数据权威在 Agent 服务 /admin/retrospective/snapshot*
 * (契约:Agent 仓 docs/proposals/cycle-retrospective.md §5「快照接口契约」)。
 *
 * 路径沿用本仓其它 Agent 管理接口的约定:走 Backend 代理 /api/admin/agent/**,
 * 由它转发到 Agent 并包成站内统一信封({ code, message, data })。
 * 权限:采集要 evaluation:run;读取要 resume:audit 或 evaluation:run。
 */
const BASE = '/api/admin/agent/retrospective';

/** 快照里的一个数。字段随 Agent 版本可能增减,除 id / metric 外都按可缺失处理 */
export interface SnapshotMetric {
  /** 全快照唯一:标量就是指标 id,分布的一格是「指标id[键]」 */
  id: string;
  /** 所属目录项的 id,用它去 catalog 里找名字和口径 */
  metric: string;
  /** 空 = 标量;非空 = 分布里的一格(部门名、部门 id、渠道名等;other 表示并入「其他」) */
  key?: string | null;
  /** 被抑制时为 null——不是 0 */
  value?: number | null;
  /** count 计数 / ratio 比率(0–1 小数) / ms 毫秒 / tokens */
  unit?: string;
  /** 样本量(比率的分母);可能为 null */
  n?: number | null;
  /** 小格子抑制:为真时 value 为 null */
  suppressed?: boolean;
  /** 被抑制的值落在哪一头:low / high(只出现在比率上)/ null(样本不足) */
  side?: 'low' | 'high' | null;
  /** 以下三项只在带基线读取时出现,任一侧没有值或被抑制时为 null */
  prev?: number | null;
  /** 差值;比率是百分点差(两个小数相减) */
  delta?: number | null;
  /** 相对变化;比率类不给 */
  delta_ratio?: number | null;
}

export interface SnapshotCatalogItem {
  id: string;
  domain: string;
  name: string;
  definition?: string;
  unit?: string;
  /** pending = 暂缺指标,reason 是原因 */
  status?: string;
  reason?: string | null;
}

/** ok 采到了 / unavailable 这次数据源不可用(带 reason)/ pending 该域指标都还算不出来 */
export interface SnapshotDomainState {
  status: string;
  reason?: string | null;
}

export interface SnapshotBody {
  schema?: string;
  cycle_id?: number;
  /** 对话与知识库两个域统计的时间窗(半开区间);取不到周期日期时为 null */
  window?: { start: string; end: string; timezone?: string } | null;
  /** 小格子阈值 */
  small_cell_min?: number;
  params?: Record<string, unknown>;
  domains?: Record<string, SnapshotDomainState>;
  catalog?: SnapshotCatalogItem[];
  metrics?: SnapshotMetric[];
  /** 目录里有、这次没取到值的指标 */
  absent?: { id: string; reason?: string }[];
  /** 带基线读取时才有 */
  baseline?: { cycle_id?: number; schema?: string };
}

export interface SnapshotResponse {
  cycle_id: number;
  version: number;
  metrics_schema?: string;
  taken_by?: number;
  taken_at?: string;
  snapshot: SnapshotBody;
  /** 仅采集接口返回:false = 内容与最新一版相同,没有落新版本 */
  created?: boolean;
}

/** 版本列表的一行,不含指标正文 */
export interface SnapshotVersionRow {
  cycle_id: number;
  version: number;
  metrics_schema?: string;
  content_hash?: string;
  taken_by?: number;
  taken_at?: string;
  domains?: Record<string, SnapshotDomainState>;
}

/**
 * 采集并保存一个周期的指标快照。200 不代表每个域都采到了,要看 snapshot.domains。
 * 采集要读后端统计和几张日志表,可能超过默认的 10 秒,这里单独放宽。
 */
export function takeRetrospectiveSnapshot(cycleId: number) {
  return request({
    url: `${BASE}/snapshot`,
    method: 'post',
    data: { cycle_id: cycleId },
    timeout: 60000,
  });
}

/** 读最新一版或指定 version;带 baseline_cycle_id 时每个指标附 prev / delta / delta_ratio */
export function getRetrospectiveSnapshot(params: {
  cycle_id: number;
  version?: number;
  baseline_cycle_id?: number;
}) {
  return request({ url: `${BASE}/snapshot`, method: 'get', params });
}

/** 一个周期的版本列表(新版本在前)与各域采集状态 */
export function listRetrospectiveSnapshots(cycleId: number) {
  return request({ url: `${BASE}/snapshots`, method: 'get', params: { cycle_id: cycleId } });
}
