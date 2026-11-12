import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Empty,
  Result,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import { CameraOutlined, InfoCircleOutlined, ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";
import { getAllCycles } from "@/api/manage/cycleApis";
import {
  SnapshotMetric,
  SnapshotResponse,
  SnapshotVersionRow,
  getRetrospectiveSnapshot,
  listRetrospectiveSnapshots,
  takeRetrospectiveSnapshot,
} from "@/api/manage/retrospectiveApis";
import { getToken } from "@/utils";
import { hasPermission } from "@/utils/jwt";
import {
  CycleOption,
  DEFAULT_SMALL_CELL_MIN,
  DomainSection,
  MetricRow,
  buildDomainSections,
  formatDelta,
  formatMetricValue,
  formatNumber,
  formatPrev,
  formatWindow,
  keyLabel,
  pickDefaultCycle,
  toCycleList,
  unavailableDomains,
} from "./snapshotView";

const { Title, Paragraph, Text } = Typography;

type ViewState =
  | { kind: "idle" }
  | { kind: "loading" }
  /** 接口不存在:Agent 还是旧版本,或代理路由还没上线 */
  | { kind: "unsupported" }
  | { kind: "error"; message: string }
  /** 该周期还没有快照 */
  | { kind: "empty" }
  | { kind: "ready"; data: SnapshotResponse; baselineProblem?: string };

/** 表格的一行:指标本身,或分布里的一格 */
interface TableRow {
  key: string;
  label: string;
  definition?: string;
  /** 有值的行(标量、分布的一格) */
  metric?: SnapshotMetric;
  /** 没有值的行给一句说明(暂缺 / 本次未取到) */
  note?: { tag: string; reason?: string };
  children?: TableRow[];
}

const toTableRows = (rows: MetricRow[]): TableRow[] =>
  rows.map((row) => {
    const base = { key: row.id, label: row.name, definition: row.definition };
    if (row.kind === "scalar") return { ...base, metric: row.value };
    if (row.kind === "breakdown") {
      return {
        ...base,
        children: (row.cells ?? []).map((cell) => ({
          key: cell.id,
          label: keyLabel(cell.key) || cell.id,
          metric: cell,
        })),
      };
    }
    const tag = row.kind === "pending" ? "暂缺" : "本次未取到";
    return { ...base, note: { tag, reason: row.reason } };
  });

const DOMAIN_STATUS_TAG: Record<string, { color?: string; text: string }> = {
  unavailable: { color: "error", text: "本次未采到" },
  pending: { text: "暂缺" },
};

const DomainCard: React.FC<{
  section: DomainSection;
  smallCellMin: number;
  withBaseline: boolean;
}> = ({ section, smallCellMin, withBaseline }) => {
  const data = useMemo(() => toTableRows(section.rows), [section.rows]);
  const statusTag = DOMAIN_STATUS_TAG[section.status];

  const columns: ColumnsType<TableRow> = [
    {
      title: "指标",
      dataIndex: "label",
      render: (label: string, row) => (
        <span>
          {label}
          {row.definition ? (
            <Tooltip title={row.definition}>
              <InfoCircleOutlined style={{ marginLeft: 6, color: "rgba(0,0,0,.35)" }} />
            </Tooltip>
          ) : null}
        </span>
      ),
    },
    {
      title: "数值",
      key: "value",
      width: 200,
      render: (_: unknown, row) => {
        if (row.note) {
          return (
            <Tooltip title={row.note.reason || undefined}>
              <Tag>{row.note.tag}</Tag>
            </Tooltip>
          );
        }
        if (!row.metric) {
          return row.children ? <Text type="secondary">共 {row.children.length} 项</Text> : "—";
        }
        const value = formatMetricValue(row.metric, smallCellMin);
        if (value.suppressed) {
          return (
            <Tooltip title={`为避免指向个人,小于 ${smallCellMin} 的格子不留具体数值——这不是 0`}>
              <Tag color="warning">{value.text}</Tag>
            </Tooltip>
          );
        }
        return value.missing ? <Text type="secondary">{value.text}</Text> : value.text;
      },
    },
    {
      title: "样本量",
      key: "n",
      width: 100,
      // 计数的样本量就是它自己,再写一遍只是噪音;比率、分位数、合计才需要看分母
      render: (_: unknown, row) =>
        typeof row.metric?.n === "number" && row.metric.unit !== "count"
          ? formatNumber(row.metric.n)
          : "—",
    },
    ...(withBaseline
      ? ([
          {
            title: "基线周期",
            key: "prev",
            width: 150,
            render: (_: unknown, row) => (row.metric ? formatPrev(row.metric) : "—"),
          },
          {
            title: "变化",
            key: "delta",
            width: 200,
            render: (_: unknown, row) => {
              const delta = row.metric ? formatDelta(row.metric) : null;
              return delta ? delta.text : <Text type="secondary">—</Text>;
            },
          },
        ] as ColumnsType<TableRow>)
      : []),
  ];

  return (
    <Card
      size="small"
      style={{ marginBottom: 16 }}
      title={
        <Space>
          <span>{section.label}</span>
          {statusTag && <Tag color={statusTag.color}>{statusTag.text}</Tag>}
          {section.status !== "ok" && section.reason ? (
            <Text type="secondary" style={{ fontSize: 12, fontWeight: "normal" }}>
              {section.reason}
            </Text>
          ) : null}
        </Space>
      }
    >
      {data.length ? (
        <Table<TableRow>
          size="small"
          rowKey="key"
          pagination={false}
          columns={columns}
          dataSource={data}
          expandable={{ defaultExpandAllRows: true }}
        />
      ) : (
        <Text type="secondary">这个域没有可展示的指标</Text>
      )}
    </Card>
  );
};

/**
 * 周期复盘 · 指标快照(Agent 仓 docs/proposals/cycle-retrospective.md P1)。
 *
 * 每个周期留一份纯代码算出的指标快照,是跨周期对比的唯一基线;后续的复盘报告、
 * 组织记忆都从它来。这里只做快照的采集与查看。
 * 权限:查看 resume:audit 或 evaluation:run;采集 evaluation:run。
 */
const Retrospective: React.FC = () => {
  const canTake = hasPermission(getToken(), "evaluation:run");

  const [cycles, setCycles] = useState<CycleOption[] | null>(null);
  const [cyclesLoading, setCyclesLoading] = useState(true);
  const [cycleId, setCycleId] = useState<number | null>(null);
  /** null = 不对比 */
  const [baselineId, setBaselineId] = useState<number | null>(null);
  /** null = 最新一版 */
  const [version, setVersion] = useState<number | null>(null);
  const [versions, setVersions] = useState<SnapshotVersionRow[]>([]);
  const [view, setView] = useState<ViewState>({ kind: "idle" });
  const [taking, setTaking] = useState(false);
  /** 切周期/版本太快时,丢掉后到的旧响应 */
  const seq = useRef(0);

  const loadCycles = useCallback(async () => {
    setCyclesLoading(true);
    try {
      const res: any = await getAllCycles();
      const list = toCycleList(res?.data);
      setCycles(list);
      if (list?.length) {
        setCycleId((current) => current ?? pickDefaultCycle(list, dayjs().format("YYYY-MM-DD")));
      }
    } catch {
      setCycles(null);
    } finally {
      setCyclesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCycles();
  }, [loadCycles]);

  const load = useCallback(
    async (cycle: number, ver: number | null, baseline: number | null) => {
      const mine = ++seq.current;
      const stale = () => mine !== seq.current;
      setView({ kind: "loading" });

      // 先取版本列表:周期没有快照时它返回空列表(200),只有接口本身不存在才是 404。
      // 直接取快照的话,「还没有快照」和「接口不存在」都是 404,分不开。
      let items: SnapshotVersionRow[];
      try {
        const res: any = await listRetrospectiveSnapshots(cycle);
        items = Array.isArray(res?.data?.items) ? res.data.items : [];
      } catch (e: any) {
        if (stale()) return;
        setVersions([]);
        setView(
          e?.status === 404
            ? { kind: "unsupported" }
            : { kind: "error", message: e?.message || "加载指标快照失败" }
        );
        return;
      }
      if (stale()) return;
      setVersions(items);
      if (!items.length) {
        setView({ kind: "empty" });
        return;
      }

      const base = { cycle_id: cycle, ...(ver != null ? { version: ver } : {}) };
      try {
        let res: any;
        let baselineProblem: string | undefined;
        if (baseline == null) {
          res = await getRetrospectiveSnapshot(base);
        } else {
          try {
            res = await getRetrospectiveSnapshot({ ...base, baseline_cycle_id: baseline });
          } catch (e: any) {
            // 400 基线就是本周期 / 404 基线还没有快照 / 409 指标定义版本不同:
            // 都只是「比不了」,本周期的数照常给
            if (![400, 404, 409].includes(e?.status)) throw e;
            baselineProblem = e?.message || "无法与所选的基线周期对比";
            res = await getRetrospectiveSnapshot(base);
          }
        }
        if (stale()) return;
        const data = res?.data;
        if (!data || typeof data.snapshot !== "object" || data.snapshot === null) {
          setView({ kind: "error", message: "指标快照的返回格式与预期不符,暂时无法展示" });
          return;
        }
        setView({ kind: "ready", data, baselineProblem });
      } catch (e: any) {
        if (stale()) return;
        setView({ kind: "error", message: e?.message || "加载指标快照失败" });
      }
    },
    []
  );

  useEffect(() => {
    if (cycleId != null) load(cycleId, version, baselineId);
  }, [cycleId, version, baselineId, load]);

  const take = async () => {
    if (cycleId == null) return;
    setTaking(true);
    try {
      const res: any = await takeRetrospectiveSnapshot(cycleId);
      const d = res?.data;
      const missed = unavailableDomains(d?.snapshot?.domains);
      if (d?.created === false) {
        message.info(`内容与第 ${d.version} 版相同,没有新增版本`);
      } else {
        message.success(`已采集并保存为第 ${d?.version ?? "?"} 版`);
      }
      if (missed.length) {
        message.warning(
          `有 ${missed.length} 个数据域这次没有采到(${missed.map((m) => m.label).join("、")}),请稍后重新采集`,
          8
        );
      }
      // 采完看最新一版;version 本来就是 null 时 effect 不会重跑,手动拉一次
      if (version === null) load(cycleId, null, baselineId);
      else setVersion(null);
    } catch (e: any) {
      message.error(e?.message || "采集指标快照失败");
    } finally {
      setTaking(false);
    }
  };

  const cycleName = (id: number | null | undefined) =>
    id == null ? "" : cycles?.find((c) => c.cycleId === id)?.cycleName ?? `周期 #${id}`;

  const cycleOptions = useMemo(
    () => (cycles ?? []).map((c) => ({ value: c.cycleId, label: c.cycleName })),
    [cycles]
  );

  const takeButton = canTake ? (
    <Button
      type="primary"
      icon={<CameraOutlined />}
      loading={taking}
      disabled={cycleId == null}
      onClick={take}
    >
      采集快照
    </Button>
  ) : null;

  const renderBody = () => {
    if (view.kind === "idle") return null;
    if (view.kind === "loading") {
      return (
        <div style={{ textAlign: "center", padding: 48 }}>
          <Spin />
        </div>
      );
    }
    if (view.kind === "unsupported") {
      return (
        <Result
          status="info"
          title="指标快照暂不可用"
          subTitle="当前的 Agent 服务还没有提供周期复盘的快照接口(可能尚未升级或代理尚未上线),升级后这里会自动可用。"
        />
      );
    }
    if (view.kind === "error") {
      return (
        <Result
          status="warning"
          title="指标快照加载失败"
          subTitle={
            <>
              <div>{view.message}</div>
              {/* 后端对没映射的路径回 500 而不是 404,所以「代理还没上线」也会落到这里 */}
              <div style={{ fontSize: 12 }}>
                如果后端或 Agent 服务还没升级到支持周期复盘的版本,也会看到这个提示。
              </div>
            </>
          }
          extra={
            <Button onClick={() => cycleId != null && load(cycleId, version, baselineId)}>
              重试
            </Button>
          }
        />
      );
    }
    if (view.kind === "empty") {
      return (
        <Empty
          style={{ padding: 48 }}
          description={
            canTake
              ? "这个周期还没有指标快照。对话与检索日志会按保留期清理,建议在周期结束时采集一份。"
              : "这个周期还没有指标快照(采集需要 evaluation:run 权限)。"
          }
        >
          {takeButton}
        </Empty>
      );
    }

    const { data, baselineProblem } = view;
    const snapshot = data.snapshot;
    const smallCellMin =
      typeof snapshot.small_cell_min === "number" ? snapshot.small_cell_min : DEFAULT_SMALL_CELL_MIN;
    const sections = buildDomainSections(snapshot);
    const missed = unavailableDomains(snapshot.domains);
    const withBaseline = Boolean(snapshot.baseline);
    const windowText = formatWindow(snapshot.window);

    return (
      <>
        {missed.length > 0 && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
            message={`这一版有 ${missed.length} 个数据域没有采到,对应的指标是空的`}
            description={
              <>
                {missed.map((m) => (
                  <div key={m.domain}>
                    {m.label}
                    {m.reason ? `:${m.reason}` : ""}
                  </div>
                ))}
                <div>等数据源恢复后重新采集一次,会落一个新版本。</div>
              </>
            }
          />
        )}
        {baselineProblem && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            message={`没有与「${cycleName(baselineId)}」对比:${baselineProblem}`}
          />
        )}

        <Descriptions size="small" column={{ xs: 1, sm: 2, lg: 3 }} style={{ marginBottom: 12 }}>
          <Descriptions.Item label="版本">第 {data.version} 版</Descriptions.Item>
          <Descriptions.Item label="采集时间">
            {data.taken_at ? dayjs(data.taken_at).format("YYYY-MM-DD HH:mm") : "—"}
          </Descriptions.Item>
          <Descriptions.Item label="采集人">
            {data.taken_by != null ? `用户 #${data.taken_by}` : "—"}
          </Descriptions.Item>
          <Descriptions.Item label="指标定义">
            {data.metrics_schema ?? snapshot.schema ?? "—"}
          </Descriptions.Item>
          <Descriptions.Item label="统计时间窗">
            {windowText ?? "未取到周期起止日期"}
          </Descriptions.Item>
          {withBaseline && (
            <Descriptions.Item label="对比基线">
              {cycleName(snapshot.baseline?.cycle_id ?? baselineId)}(最新一版同定义快照)
            </Descriptions.Item>
          )}
        </Descriptions>
        <Paragraph type="secondary" style={{ fontSize: 12 }}>
          快照只留聚合数:小于 {smallCellMin} 的格子不保存具体数值,显示为「&lt;{smallCellMin}」
          「样本不足」等字样,它们不等于 0。
        </Paragraph>

        {sections.length ? (
          sections.map((section) => (
            <DomainCard
              // 换版本/换基线时整表重建,展开状态与列一起刷新
              key={`${data.cycle_id}-${data.version}-${withBaseline}-${section.domain}`}
              section={section}
              smallCellMin={smallCellMin}
              withBaseline={withBaseline}
            />
          ))
        ) : (
          <Empty description="这一版快照里没有指标" />
        )}
      </>
    );
  };

  return (
    <div>
      <Title level={4} style={{ marginTop: 0 }}>
        周期复盘
      </Title>
      <Paragraph type="secondary" style={{ marginTop: 0 }}>
        每个招新周期留一份指标快照:投递与面试、对话助理、知识库、简历初筛、面试出题与成本,
        全部由代码聚合得出,是跨周期对比的基线。
      </Paragraph>

      {!cyclesLoading && cycles === null && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="招新周期列表加载失败,暂时无法选择周期"
          action={
            <Button size="small" onClick={loadCycles}>
              重试
            </Button>
          }
        />
      )}

      <Space style={{ marginBottom: 16 }} wrap>
        <Select<number>
          aria-label="招新周期"
          style={{ minWidth: 220 }}
          placeholder="选择招新周期"
          loading={cyclesLoading}
          value={cycleId ?? undefined}
          options={cycleOptions}
          showSearch
          optionFilterProp="label"
          onChange={(id) => {
            setCycleId(id);
            setVersion(null);
            // 基线不能是本周期
            if (baselineId === id) setBaselineId(null);
          }}
        />
        <Select<number>
          aria-label="快照版本"
          style={{ minWidth: 220 }}
          placeholder="最新一版"
          allowClear
          disabled={!versions.length}
          value={version ?? undefined}
          onChange={(v) => setVersion(v ?? null)}
          options={versions.map((v) => ({
            value: v.version,
            label: `第 ${v.version} 版${
              v.taken_at ? ` · ${dayjs(v.taken_at).format("MM-DD HH:mm")}` : ""
            }${unavailableDomains(v.domains).length ? " · 有缺域" : ""}`,
          }))}
        />
        <Select<number>
          aria-label="对比基线"
          style={{ minWidth: 220 }}
          placeholder="对比基线:不对比"
          allowClear
          disabled={view.kind !== "ready"}
          value={baselineId ?? undefined}
          onChange={(id) => setBaselineId(id ?? null)}
          options={cycleOptions.filter((o) => o.value !== cycleId)}
        />
        {view.kind !== "unsupported" && view.kind !== "empty" && takeButton}
        <Tooltip title="重新加载">
          <Button
            icon={<ReloadOutlined />}
            disabled={cycleId == null}
            onClick={() => cycleId != null && load(cycleId, version, baselineId)}
          />
        </Tooltip>
      </Space>

      {renderBody()}
    </div>
  );
};

export default Retrospective;
