import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Empty,
  Modal,
  Popconfirm,
  Result,
  Select,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import { FileAddOutlined, ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { getAllCycles } from "@/api/manage/cycleApis";
import {
  ReportResponse,
  ReportVersionRow,
  getRetrospectiveReport,
  listRetrospectiveReports,
  publishRetrospectiveReport,
  runRetrospectiveReport,
} from "@/api/manage/retrospectiveApis";
import { getToken } from "@/utils";
import { hasPermission } from "@/utils/jwt";
import {
  RunFailure,
  errorText,
  normalizeReportList,
  publishFailureNote,
  reportNotes,
  reportStatusColor,
  reportStatusLabel,
  runFailure,
  unverifiedRows,
} from "./reportView";
import { CycleOption, pickDefaultCycle, toCycleList } from "./snapshotView";

const { Paragraph, Text } = Typography;

// Markdown 渲染器(带公式、代码高亮)体积不小,而且只有真的打开一份报告时才用得上:按需加载
const MarkdownContent = React.lazy(() => import("@/components/AgentChat/Markdown"));

type ViewState =
  | { kind: "idle" }
  | { kind: "loading" }
  /** 接口不存在:Agent 还是旧版本,或代理路由还没上线 */
  | { kind: "unsupported" }
  | { kind: "error"; message: string }
  /** 这个周期没有(对当前账号可见的)报告 */
  | { kind: "empty"; message?: string }
  | { kind: "ready"; report: ReportResponse };

const fmtTime = (iso?: string | null) => (iso ? dayjs(iso).format("YYYY-MM-DD HH:mm") : "—");

/**
 * 周期复盘 · 报告(Agent 仓 docs/proposals/cycle-retrospective.md P2)。
 *
 * 报告是模型对着指标快照写的解读:先生成草稿,由人审阅后发布。已发布的不能改,
 * 只能发布新版本取代。生成是后台任务,要几分钟。
 * 权限:生成、看草稿、发布要 evaluation:run;只有 resume:audit 的人只看得到已发布的版本。
 */
const ReportTab: React.FC<{
  /** 报告在生成时多久查一次。只为测试能调小,页面不传 */
  pollMs?: number;
}> = ({ pollMs = 5000 }) => {
  const canRun = hasPermission(getToken(), "evaluation:run");

  const [cycles, setCycles] = useState<CycleOption[] | null>(null);
  const [cyclesLoading, setCyclesLoading] = useState(true);
  const [cycleId, setCycleId] = useState<number | null>(null);
  /** 生成时对比的基线周期;null = 不对比 */
  const [baselineId, setBaselineId] = useState<number | null>(null);
  /** null = 最新一版 */
  const [version, setVersion] = useState<number | null>(null);
  const [versions, setVersions] = useState<ReportVersionRow[]>([]);
  const [view, setView] = useState<ViewState>({ kind: "idle" });
  const [starting, setStarting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  /** 触发生成被拒的说明;留在页面上,不一闪而过 */
  const [runProblem, setRunProblem] = useState<RunFailure | null>(null);
  const [publishProblem, setPublishProblem] = useState<{ message: string; note: string } | null>(null);
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

  const load = useCallback(async (cycle: number, ver: number | null, quiet = false) => {
    const mine = ++seq.current;
    const stale = () => mine !== seq.current;
    if (!quiet) setView({ kind: "loading" });

    // 先取版本列表:没有报告时它是空列表(200),只有接口本身不存在才是 404
    let items: ReportVersionRow[];
    try {
      const res: any = await listRetrospectiveReports(cycle);
      items = normalizeReportList(res?.data);
    } catch (e: any) {
      if (stale()) return;
      setVersions([]);
      setView(
        e?.status === 404
          ? { kind: "unsupported" }
          : { kind: "error", message: errorText(e, "加载复盘报告失败") }
      );
      return;
    }
    if (stale()) return;
    setVersions(items);
    if (!items.length) {
      setView({ kind: "empty" });
      return;
    }

    try {
      const res: any = await getRetrospectiveReport({
        cycle_id: cycle,
        ...(ver != null ? { version: ver } : {}),
      });
      if (stale()) return;
      const report = res?.data;
      if (!report || typeof report !== "object" || typeof report.version !== "number") {
        setView({ kind: "error", message: "复盘报告的返回格式与预期不符,暂时无法展示" });
        return;
      }
      setView({ kind: "ready", report });
    } catch (e: any) {
      if (stale()) return;
      // 列表里有、这里却 404:这一版对当前账号不可见(没有执行权的人只看得到已发布的)
      setView(
        e?.status === 404
          ? { kind: "empty", message: errorText(e, "没有找到可以查看的报告") }
          : { kind: "error", message: errorText(e, "加载复盘报告失败") }
      );
    }
  }, []);

  useEffect(() => {
    if (cycleId != null) load(cycleId, version);
  }, [cycleId, version, load]);

  // 看的这一版还在生成:隔一会儿查一次,生成完(或失败)自动显示,不用手动刷新
  const generating = view.kind === "ready" && view.report.status === "generating";
  useEffect(() => {
    if (!generating || cycleId == null) return undefined;
    const timer = setInterval(() => load(cycleId, version, true), pollMs);
    return () => clearInterval(timer);
  }, [generating, cycleId, version, pollMs, load]);

  const generate = async () => {
    if (cycleId == null) return;
    setStarting(true);
    setRunProblem(null);
    try {
      const res: any = await runRetrospectiveReport(cycleId, baselineId);
      const v = res?.data?.version;
      message.success(
        `已开始生成${typeof v === "number" ? `第 ${v} 版` : ""}报告,需要几分钟,生成完会自动显示`
      );
      if (typeof v === "number" && v !== version) setVersion(v);
      else load(cycleId, version);
    } catch (e: any) {
      setRunProblem(runFailure(e));
    } finally {
      setStarting(false);
    }
  };

  const publish = async (report: ReportResponse) => {
    setPublishing(true);
    setPublishProblem(null);
    try {
      await publishRetrospectiveReport(report.cycle_id, report.version);
      message.success(`第 ${report.version} 版报告已发布`);
      load(report.cycle_id, version);
    } catch (e: any) {
      setPublishProblem({ message: errorText(e, "发布失败"), note: publishFailureNote(e) });
    } finally {
      setPublishing(false);
    }
  };

  const confirmPublish = (report: ReportResponse) => {
    const dropped = unverifiedRows(report).length;
    Modal.confirm({
      title: `发布第 ${report.version} 版复盘报告?`,
      content: (
        <>
          <div>
            发布后,只有查看权限的人也能看到这一版。已发布的报告不能修改,只能再发布新的版本取代它。
          </div>
          {dropped > 0 && (
            <div style={{ marginTop: 8 }}>
              这一版有 {dropped} 处内容因为对不上指标而没有进入报告,请确认已经看过。
            </div>
          )}
        </>
      ),
      okText: "确认发布",
      cancelText: "再看看",
      onOk: () => publish(report),
    });
  };

  const cycleName = (id: number | null | undefined) =>
    id == null ? "" : cycles?.find((c) => c.cycleId === id)?.cycleName ?? `周期 #${id}`;
  const cycleOptions = useMemo(
    () => (cycles ?? []).map((c) => ({ value: c.cycleId, label: c.cycleName })),
    [cycles]
  );

  const generateButton = canRun ? (
    <Popconfirm
      title="生成一版新的报告草稿?"
      description="会先采集一次指标快照,再由模型写报告,需要几分钟。"
      okText="开始生成"
      cancelText="取消"
      onConfirm={generate}
      disabled={cycleId == null || generating}
    >
      <Button
        type="primary"
        icon={<FileAddOutlined />}
        loading={starting}
        disabled={cycleId == null || generating}
      >
        生成报告
      </Button>
    </Popconfirm>
  ) : null;

  const renderReport = (report: ReportResponse) => {
    const notes = reportNotes(report);
    const dropped = unverifiedRows(report);

    if (report.status === "generating") {
      return (
        <Result
          icon={<Spin size="large" />}
          title={`第 ${report.version} 版报告正在生成`}
          subTitle="通常需要几分钟,生成完会自动显示在这里;超过 15 分钟还没完成会被记为失败。"
          extra={
            <Button onClick={() => cycleId != null && load(cycleId, version)}>立即刷新</Button>
          }
        />
      );
    }

    return (
      <>
        <Descriptions size="small" column={{ xs: 1, sm: 2, lg: 3 }} style={{ marginBottom: 12 }}>
          <Descriptions.Item label="版本">
            第 {report.version} 版{" "}
            <Tag color={reportStatusColor(report.status)} style={{ marginLeft: 4 }}>
              {reportStatusLabel(report.status)}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="生成">
            {fmtTime(report.finished_at ?? report.created_at)}
            {report.created_by != null ? ` · 用户 #${report.created_by}` : ""}
          </Descriptions.Item>
          <Descriptions.Item label="依据的快照">
            {report.snapshot_version != null ? `第 ${report.snapshot_version} 版` : "—"}
            {report.baseline_cycle_id != null ? `,对比 ${cycleName(report.baseline_cycle_id)}` : ""}
          </Descriptions.Item>
          {report.published_at ? (
            <Descriptions.Item label="发布">
              {fmtTime(report.published_at)}
              {report.published_by != null ? ` · 用户 #${report.published_by}` : ""}
            </Descriptions.Item>
          ) : null}
        </Descriptions>

        {report.status === "failed" && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 12 }}
            message="这一版报告没有生成出来"
            description={report.error || "没有给出原因。可以重新生成一版。"}
          />
        )}
        {report.status === "superseded" && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            message="这一版已经被之后发布的版本取代,仅供回看。"
          />
        )}
        {publishProblem && (
          <Alert
            type="error"
            showIcon
            closable
            onClose={() => setPublishProblem(null)}
            style={{ marginBottom: 12 }}
            message={publishProblem.message}
            description={publishProblem.note}
          />
        )}
        {notes.map((n) => (
          <Alert key={n.key} type={n.level} showIcon style={{ marginBottom: 12 }} message={n.text} />
        ))}

        {dropped.length > 0 && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
            message={`有 ${dropped.length} 处内容没有进入报告`}
            description={
              <>
                <div>这些句子里的数字在指标快照里对不上,被程序拿掉了。审阅时请留意相关的结论是否还成立。</div>
                <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                  {dropped.map((u, i) => (
                    <li key={i}>
                      {u.where ? <Text type="secondary">[{u.where}] </Text> : null}
                      {/* 模型写的句子:只当纯文本显示 */}
                      <span>{u.text || "(没有给出原文)"}</span>
                      {u.reason ? <Text type="secondary"> —— {u.reason}</Text> : null}
                    </li>
                  ))}
                </ul>
              </>
            }
          />
        )}

        {report.status !== "failed" &&
          (report.report_md ? (
            <Card size="small">
              <Suspense fallback={<Spin />}>
                <MarkdownContent content={report.report_md} />
              </Suspense>
            </Card>
          ) : (
            <Empty description="这一版没有正文" />
          ))}

        {canRun && report.status === "draft" && (
          <div style={{ marginTop: 16, textAlign: "right" }}>
            <Button type="primary" loading={publishing} onClick={() => confirmPublish(report)}>
              发布这一版
            </Button>
          </div>
        )}
      </>
    );
  };

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
          title="复盘报告暂不可用"
          subTitle="当前的 Agent 服务还没有提供复盘报告的接口(可能尚未升级或代理尚未上线),升级后这里会自动可用。"
        />
      );
    }
    if (view.kind === "error") {
      return (
        <Result
          status="warning"
          title="复盘报告加载失败"
          subTitle={
            <>
              <div>{view.message}</div>
              <div style={{ fontSize: 12 }}>
                如果后端或 Agent 服务还没升级到支持复盘报告的版本,也会看到这个提示。
              </div>
            </>
          }
          extra={<Button onClick={() => cycleId != null && load(cycleId, version)}>重试</Button>}
        />
      );
    }
    if (view.kind === "empty") {
      return (
        <Empty
          style={{ padding: 48 }}
          description={
            view.message ??
            (canRun
              ? "这个周期还没有复盘报告。"
              : "这个周期还没有已发布的复盘报告(草稿只有持 evaluation:run 的人看得到)。")
          }
        />
      );
    }
    return renderReport(view.report);
  };

  return (
    <div>
      <Paragraph type="secondary" style={{ marginTop: 0 }}>
        报告是模型对着指标快照写的解读:数字都来自快照,对不上的句子会被拿掉并列出来。
        生成的是草稿,审阅后点「发布」才对只有查看权限的人可见。
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

      <Space style={{ marginBottom: 12 }} wrap>
        <Select<number>
          aria-label="报告的招新周期"
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
            setRunProblem(null);
            setPublishProblem(null);
            if (baselineId === id) setBaselineId(null);
          }}
        />
        <Select<number>
          aria-label="报告版本"
          style={{ minWidth: 240 }}
          placeholder="最新一版"
          allowClear
          disabled={!versions.length}
          value={version ?? undefined}
          onChange={(v) => {
            setVersion(v ?? null);
            setPublishProblem(null);
          }}
          options={versions.map((v) => ({
            value: v.version,
            label: `第 ${v.version} 版 · ${reportStatusLabel(v.status)}${
              v.created_at ? ` · ${dayjs(v.created_at).format("MM-DD HH:mm")}` : ""
            }`,
          }))}
        />
        {canRun && view.kind !== "unsupported" && (
          <>
            <Tooltip title="生成新报告时,写出相对这个周期的变化;不选就不对比">
              <Select<number>
                aria-label="生成时对比的基线"
                style={{ minWidth: 220 }}
                placeholder="生成时对比:不对比"
                allowClear
                value={baselineId ?? undefined}
                onChange={(id) => setBaselineId(id ?? null)}
                options={cycleOptions.filter((o) => o.value !== cycleId)}
              />
            </Tooltip>
            {generateButton}
          </>
        )}
        <Tooltip title="重新加载">
          <Button
            icon={<ReloadOutlined />}
            disabled={cycleId == null}
            onClick={() => cycleId != null && load(cycleId, version)}
          />
        </Tooltip>
      </Space>

      {runProblem &&
        (runProblem.kind === "disabled" ? (
          <Alert
            type="info"
            showIcon
            closable
            onClose={() => setRunProblem(null)}
            style={{ marginBottom: 12 }}
            message="报告生成还没有开启"
            description={
              <>
                <div>{runProblem.message}</div>
                <div>已有的报告不受影响,仍然可以查看和发布。</div>
              </>
            }
          />
        ) : (
          <Alert
            type={runProblem.kind === "busy" ? "warning" : "error"}
            showIcon
            closable
            onClose={() => setRunProblem(null)}
            style={{ marginBottom: 12 }}
            message={runProblem.kind === "busy" ? "现在不能生成" : "没有开始生成"}
            description={runProblem.message}
          />
        ))}

      {renderBody()}
    </div>
  );
};

export default ReportTab;
