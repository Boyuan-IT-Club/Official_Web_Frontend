import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  Empty,
  InputNumber,
  Radio,
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
import { PlayCircleOutlined, ReloadOutlined, WarningOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";
import {
  KbOpsRun,
  KbOpsScopeFilter,
  KbOpsTopic,
  listKbOpsRuns,
  listKbOpsTopics,
  startKbOpsRun,
} from "@/api/manage/kbOpsApis";
import {
  draftStatusLabel,
  gapHintLabel,
  normalizeRuns,
  normalizeTopics,
  runStatusLabel,
  runWarnings,
  scopeLabel,
  splitByNature,
  summarizeStats,
  topicTitle,
  triageLabel,
} from "./topicsView";

const { Text, Paragraph } = Typography;

const SCOPE_OPTIONS: { value: KbOpsScopeFilter; label: string }[] = [
  { value: "actionable", label: "待处理" },
  { value: "all", label: "全部" },
  { value: "official_knowledge", label: "官方知识" },
  { value: "personal_data", label: "个人数据" },
  { value: "untriaged", label: "未归类" },
  { value: "out_of_scope", label: "超出范围" },
  { value: "chitchat", label: "闲聊" },
];

type ViewState =
  | { kind: "loading" }
  /** 接口不存在:Agent 还是旧版本,或代理路由还没上线 */
  | { kind: "unsupported" }
  | { kind: "error"; message: string }
  | { kind: "ready"; run: KbOpsRun | null; items: KbOpsTopic[] };

const fmtTime = (iso?: string | null, pattern = "MM-DD HH:mm") =>
  iso ? dayjs(iso).format(pattern) : "—";

const TopicTable: React.FC<{ items: KbOpsTopic[] }> = ({ items }) => {
  const columns: ColumnsType<KbOpsTopic> = [
    { title: "#", dataIndex: "rank", width: 50 },
    {
      title: "主题",
      key: "topic",
      render: (_: unknown, t) => {
        const untriaged = triageLabel(t.triage_status);
        return (
          <div>
            <div>
              <Text strong>{topicTitle(t)}</Text>
              {untriaged && (
                <Tag style={{ marginLeft: 8 }} color="default">
                  {untriaged}
                </Tag>
              )}
            </div>
            {t.canonical_question ? (
              <Text type="secondary" style={{ fontSize: 12 }}>
                标准问法:{t.canonical_question}
              </Text>
            ) : null}
          </div>
        );
      },
    },
    {
      title: "归类",
      dataIndex: "scope",
      width: 100,
      render: (scope: string | null | undefined) => (
        <Tag color={scope === "official_knowledge" ? "blue" : scope === "personal_data" ? "purple" : undefined}>
          {scopeLabel(scope)}
        </Tag>
      ),
    },
    {
      title: "被问到",
      key: "heat",
      width: 150,
      render: (_: unknown, t) =>
        `${t.query_count ?? "—"} 次 / ${t.thread_count ?? "—"} 个会话`,
    },
    {
      title: (
        <Tooltip title="相似度接近门槛但没过的次数。多的话,多半是知识库里有答案、只是问法没覆盖到">
          差一点命中
        </Tooltip>
      ),
      dataIndex: "near_miss_count",
      width: 110,
      render: (v: number | undefined) => v ?? "—",
    },
    {
      title: "建议",
      key: "hint",
      width: 170,
      render: (_: unknown, t) => {
        const hint = gapHintLabel(t.gap_hint);
        const draft = draftStatusLabel(t.draft_status);
        if (!hint && !draft) return "—";
        return (
          <Space size={4} wrap>
            {hint && <Tag color={t.gap_hint === "missing" ? "orange" : "geekblue"}>{hint}</Tag>}
            {draft && <Tag>{draft}</Tag>}
          </Space>
        );
      },
    },
    {
      title: "最近出现",
      dataIndex: "last_seen",
      width: 120,
      render: (v: string | undefined) => fmtTime(v),
    },
  ];

  return (
    <Table<KbOpsTopic>
      size="small"
      rowKey={(t) => String(t.topic_id ?? `rank-${t.rank}`)}
      pagination={false}
      columns={columns}
      dataSource={items}
      expandable={{
        expandedRowRender: (t) => {
          const samples = Array.isArray(t.samples) ? t.samples : [];
          return (
            <div style={{ paddingLeft: 8 }}>
              {t.reason ? (
                <Paragraph style={{ marginBottom: 8 }}>
                  <Text type="secondary">归类理由:</Text>
                  {t.reason}
                </Paragraph>
              ) : null}
              <Text type="secondary">
                用户原话(至多 3 条){typeof t.best_vec_score === "number"
                  ? `,与知识库最高相似分 ${t.best_vec_score.toFixed(2)}`
                  : ""}
                :
              </Text>
              {samples.length ? (
                <ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>
                  {samples.map((s, i) => (
                    <li key={i}>
                      {/* 用户提问是不可信输入:只当纯文本显示 */}
                      <span>{s.query}</span>
                      {s.injection_suspect ? (
                        <Tag color="warning" icon={<WarningOutlined />} style={{ marginLeft: 8 }}>
                          疑似指令
                        </Tag>
                      ) : null}
                      {s.asked_at ? (
                        <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                          {fmtTime(s.asked_at)}
                        </Text>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <div>
                  <Text type="secondary">样本所在的会话都已删除,没有可以展示的原话。</Text>
                </div>
              )}
            </div>
          );
        },
      }}
    />
  );
};

/**
 * 知识库运营 · 缺口主题清单(Agent 仓 docs/proposals/kb-ops-loop.md P1):
 * 把「用户问了、知识库没答上」的提问聚成主题,按影响面排序。只读,不改知识库。
 * AgentAdmin 工作台「知识缺口」Tab,权限 kb:manage。
 */
const AgentKBOps: React.FC<{
  /** 有分析在跑时多久查一次结局。只为测试能调小,页面不传 */
  pollMs?: number;
}> = ({ pollMs = 5000 }) => {
  const [runs, setRuns] = useState<KbOpsRun[]>([]);
  /** null = 最近一次成功的运行(由接口决定) */
  const [runId, setRunId] = useState<string | null>(null);
  const [scope, setScope] = useState<KbOpsScopeFilter>("actionable");
  const [view, setView] = useState<ViewState>({ kind: "loading" });
  const [days, setDays] = useState<number>(7);
  const [starting, setStarting] = useState(false);
  /** 切运行/切范围太快时,丢掉后到的旧响应 */
  const seq = useRef(0);

  const loadRuns = useCallback(async (): Promise<"ok" | "unsupported" | "error"> => {
    try {
      const res: any = await listKbOpsRuns(20);
      setRuns(normalizeRuns(res?.data));
      return "ok";
    } catch (e: any) {
      // 运行列表没有「查不到」这回事,404 只能是接口本身不存在
      if (e?.status === 404) {
        setView({ kind: "unsupported" });
        return "unsupported";
      }
      return "error";
    }
  }, []);

  const loadTopics = useCallback(async (run: string | null, sc: KbOpsScopeFilter) => {
    const mine = ++seq.current;
    setView((v) => (v.kind === "unsupported" ? v : { kind: "loading" }));
    try {
      const res: any = await listKbOpsTopics({ ...(run ? { run_id: run } : {}), scope: sc });
      if (mine !== seq.current) return;
      setView({ kind: "ready", ...normalizeTopics(res?.data) });
    } catch (e: any) {
      if (mine !== seq.current) return;
      if (e?.status === 404 && !run) {
        // 没指定运行还 404:接口不存在。指定了运行的 404 是「运行不存在」(多半已被清理)
        setView({ kind: "unsupported" });
      } else {
        setView({ kind: "error", message: e?.message || "加载主题清单失败" });
      }
    }
  }, []);

  const refresh = useCallback(async () => {
    const outcome = await loadRuns();
    if (outcome !== "unsupported") await loadTopics(runId, scope);
  }, [loadRuns, loadTopics, runId, scope]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId, scope]);

  // 有分析在跑就轮询运行列表;跑完(不管成败)自动刷新清单
  const hasRunning = runs.some((r) => r.status === "running");
  const wasRunning = useRef(false);
  useEffect(() => {
    if (!hasRunning) {
      if (wasRunning.current) {
        wasRunning.current = false;
        loadTopics(runId, scope);
      }
      return undefined;
    }
    wasRunning.current = true;
    const timer = setInterval(() => {
      loadRuns();
    }, pollMs);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasRunning, pollMs]);

  const start = async () => {
    setStarting(true);
    try {
      await startKbOpsRun(days);
      message.success("已开始分析,完成后清单会自动刷新");
      await loadRuns();
    } catch (e: any) {
      if (e?.status === 409) {
        message.warning(e?.message || "已有一次分析在进行中");
        await loadRuns();
      } else {
        message.error(e?.message || "启动分析失败");
      }
    } finally {
      setStarting(false);
    }
  };

  const runOptions = useMemo(
    () =>
      runs.map((r) => ({
        value: r.run_id,
        label: `${fmtTime(r.started_at)} · ${runStatusLabel(r.status)}${
          typeof r.stats?.topics === "number" ? ` · ${r.stats.topics} 个主题` : ""
        }`,
      })),
    [runs]
  );

  if (view.kind === "unsupported") {
    return (
      <Result
        status="info"
        title="缺口主题清单暂不可用"
        subTitle="当前的 Agent 服务还没有提供知识库运营分析的接口(可能尚未升级或代理尚未上线),升级后这里会自动可用。"
        extra={<Button onClick={refresh}>重新检查</Button>}
      />
    );
  }

  const runningRun = runs.find((r) => r.status === "running");

  const renderBody = () => {
    if (view.kind === "loading") {
      return (
        <div style={{ textAlign: "center", padding: 48 }}>
          <Spin />
        </div>
      );
    }
    if (view.kind === "error") {
      return (
        <Result
          status="warning"
          title="主题清单加载失败"
          subTitle={
            <>
              <div>{view.message}</div>
              {/* 后端对没映射的路径回 500 而不是 404,所以「代理还没上线」也会落到这里 */}
              <div style={{ fontSize: 12 }}>
                如果后端或 Agent 服务还没升级到支持知识库运营分析的版本,也会看到这个提示。
              </div>
            </>
          }
          extra={<Button onClick={refresh}>重试</Button>}
        />
      );
    }

    const { run, items } = view;
    if (!run) {
      return (
        <Empty
          style={{ padding: 48 }}
          description={
            runningRun
              ? "第一次分析正在进行,完成后这里会出现清单。"
              : "还没有成功完成过的分析。点「开始分析」,系统会把最近没答上的提问聚成主题。"
          }
        />
      );
    }

    const stats = summarizeStats(run.stats);
    const warnings = runWarnings(run);
    const { gaps, personal } = splitByNature(items);

    return (
      <>
        {run.status === "failed" && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 12 }}
            message="这次分析没有完成"
            description={run.error || "没有给出原因"}
          />
        )}
        {warnings.map((w) => (
          <Alert key={w} type="warning" showIcon style={{ marginBottom: 12 }} message={w} />
        ))}

        <Paragraph type="secondary" style={{ marginBottom: 8 }}>
          分析时间窗:{fmtTime(run.window_start, "YYYY-MM-DD HH:mm")} ~{" "}
          {fmtTime(run.window_end, "YYYY-MM-DD HH:mm")}
          {run.triggered_by != null ? ` · 触发人:用户 #${run.triggered_by}` : ""}
        </Paragraph>
        {stats.length > 0 && (
          <Space size="large" wrap style={{ marginBottom: 12 }}>
            {stats.map((s) => (
              <Tooltip key={s.label} title={s.hint}>
                <span>
                  <Text type="secondary">{s.label}:</Text>
                  <Text strong>{s.value}</Text>
                </span>
              </Tooltip>
            ))}
          </Space>
        )}

        {items.length === 0 ? (
          <Empty description="这次分析在所选范围内没有主题" />
        ) : scope === "actionable" ? (
          <>
            {gaps.length > 0 && (
              <>
                <Typography.Title level={5}>知识库缺口({gaps.length})</Typography.Title>
                <TopicTable items={gaps} />
              </>
            )}
            {personal.length > 0 && (
              <>
                <Typography.Title level={5} style={{ marginTop: 20 }}>
                  要查本人数据的提问({personal.length})
                </Typography.Title>
                <Paragraph type="secondary">
                  这类提问问的是自己的面试时间、结果等,补知识条目解决不了,需要助手有对应的查询工具。
                </Paragraph>
                <TopicTable items={personal} />
              </>
            )}
          </>
        ) : (
          <TopicTable items={items} />
        )}
      </>
    );
  };

  return (
    <div>
      <Paragraph type="secondary" style={{ marginTop: 0 }}>
        把「用户问了、知识库没答上」的提问聚成主题,按影响面排序。这里只读,不改知识库;
        补条目或补问法请到「知识库」里操作。
      </Paragraph>

      <Space style={{ marginBottom: 12 }} wrap>
        <InputNumber
          aria-label="回看天数"
          min={1}
          max={30}
          precision={0}
          value={days}
          onChange={(v) => setDays(typeof v === "number" ? v : 7)}
          prefix="回看"
          suffix="天"
          style={{ width: 130 }}
        />
        <Button
          type="primary"
          icon={<PlayCircleOutlined />}
          loading={starting}
          disabled={Boolean(runningRun)}
          onClick={start}
        >
          开始分析
        </Button>
        <Select<string>
          aria-label="分析运行"
          style={{ minWidth: 260 }}
          placeholder="最近一次成功的分析"
          allowClear
          disabled={!runOptions.length}
          value={runId ?? undefined}
          options={runOptions}
          onChange={(v) => setRunId(v ?? null)}
        />
        <Tooltip title="重新加载">
          <Button icon={<ReloadOutlined />} onClick={refresh} />
        </Tooltip>
      </Space>

      {runningRun && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message={`有一次分析正在进行(${fmtTime(runningRun.started_at)} 开始),完成后清单会自动刷新。`}
        />
      )}

      <div style={{ marginBottom: 12 }}>
        <Radio.Group
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          optionType="button"
          buttonStyle="solid"
          options={SCOPE_OPTIONS}
        />
      </div>

      {renderBody()}
    </div>
  );
};

export default AgentKBOps;
