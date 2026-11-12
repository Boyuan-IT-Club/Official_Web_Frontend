import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Radio,
  Result,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import { ReloadOutlined, WarningOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";
import { getAllCycles } from "@/api/manage/cycleApis";
import {
  KbDraft,
  KbDraftKind,
  KbDraftStatus,
  approveKbDraft,
  getKbDraft,
  listKbDrafts,
  rejectKbDraft,
  updateKbDraft,
} from "@/api/manage/kbDraftsApis";
import {
  ActionFailure,
  approveBlocker,
  approveFailure,
  approveOutcome,
  draftFlags,
  evidenceRows,
  kindHint,
  kindLabel,
  normalizeDraftList,
  statusLabel,
  verdictLabel,
} from "./draftsView";

const { Text, Paragraph } = Typography;

type StatusFilter = KbDraftStatus | "all";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "pending", label: "待审" },
  { value: "approved", label: "已批准" },
  { value: "rejected", label: "已驳回" },
  { value: "superseded", label: "已被顶替" },
  { value: "all", label: "全部" },
];

const KIND_COLOR: Record<string, string> = { alt_question: "geekblue", new_faq: "blue", missing: "orange" };
const FLAG_COLOR: Record<string, string | undefined> = { danger: "error", warn: "warning", info: undefined };
const VERDICT_COLOR: Record<string, string | undefined> = {
  supported: "success",
  unsupported: "warning",
  contradicted: "error",
};

/** antd Select 把 null 当成「没选」;周期 id ≥ 1,用 0 代表常青 */
const EVERGREEN = 0;

type CycleNames = Map<number, string>;
const cycleText = (id: number | null | undefined, names: CycleNames | null) =>
  id == null ? "常青(不绑定周期)" : names?.get(id) ?? `周期 #${id}`;

const fmtTime = (iso?: string | null) => (iso ? dayjs(iso).format("YYYY-MM-DD HH:mm") : "—");

const DraftDrawer: React.FC<{
  draftId: number | null;
  cycleNames: CycleNames | null;
  onClose: () => void;
  /** 草稿内容或状态变了,列表要跟着刷新 */
  onChanged: () => void;
}> = ({ draftId, cycleNames, onClose, onChanged }) => {
  const [draft, setDraft] = useState<KbDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<"save" | "approve" | "reject" | null>(null);
  const [form] = Form.useForm();
  const answer: string = Form.useWatch("answer", form) ?? "";

  const load = useCallback(async (id: number) => {
    setLoading(true);
    setLoadError(null);
    try {
      const res: any = await getKbDraft(id);
      const d: KbDraft | null = res?.data && typeof res.data === "object" ? res.data : null;
      if (!d) {
        setDraft(null);
        setLoadError("草稿详情的返回格式与预期不符,暂时无法展示");
        return;
      }
      setDraft(d);
      setDirty(false);
      form.setFieldsValue({
        question: d.question ?? "",
        answer: d.answer ?? "",
        cycle_id: d.cycle_id ?? EVERGREEN,
      });
    } catch (e: any) {
      setDraft(null);
      setLoadError(e?.message || "加载草稿详情失败");
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    setDraft(null);
    setFailure(null);
    if (draftId != null) load(draftId);
  }, [draftId, load]);

  const pending = draft?.status === "pending";
  const blocker = draft ? approveBlocker(draft, answer) : null;

  const save = async () => {
    if (!draft) return;
    const values = await form.validateFields();
    setBusy("save");
    setFailure(null);
    try {
      await updateKbDraft(draft.draft_id, {
        question: String(values.question ?? "").trim(),
        answer: String(values.answer ?? ""),
        cycle_id: values.cycle_id === EVERGREEN || values.cycle_id == null ? null : values.cycle_id,
      });
      message.success("已保存到草稿(还没有发布)");
      onChanged();
      await load(draft.draft_id);
    } catch (e: any) {
      setFailure({ message: e?.message || "保存失败", note: "修改没有保存;知识库没有被改动。" });
    } finally {
      setBusy(null);
    }
  };

  const approve = async () => {
    if (!draft) return;
    setBusy("approve");
    setFailure(null);
    try {
      const res: any = await approveKbDraft(draft.draft_id);
      const outcome = approveOutcome(res?.data);
      if (outcome.level === "warning") {
        // 内容已经发布,但有后续要办:用需要点掉的弹窗,不用一闪而过的提示
        Modal.warning({ title: "已发布,但审计没有记上", content: outcome.text });
      } else {
        message.success(outcome.text);
      }
      onChanged();
      onClose();
    } catch (e: any) {
      // 失败说明里写着知识库有没有被改动,留在抽屉里给管理员看,不能一闪而过
      setFailure(approveFailure(e));
      onChanged();
    } finally {
      setBusy(null);
    }
  };

  const confirmApprove = () => {
    if (!draft) return;
    const what =
      draft.kind === "alt_question"
        ? `给「${draft.target?.title || draft.target_source_id || "目标 FAQ"}」补上这种问法`
        : "把这条内容作为一条新的 FAQ 写入知识库";
    const conflictIds = Array.isArray(draft.conflict_with) ? draft.conflict_with : [];
    Modal.confirm({
      title: "批准并发布到知识库?",
      content: (
        <>
          <div>
            将{what},发布后立即参与检索,对话助手会用它回答用户。绑定:
            {cycleText(draft.cycle_id, cycleNames)}。
          </div>
          {conflictIds.length > 0 && (
            <div style={{ marginTop: 8, color: "#cf1322" }}>
              注意:这份草稿与现有条目 {conflictIds.join("、")} 的说法不一致,发布后知识库里会同时有两种说法。
            </div>
          )}
        </>
      ),
      okText: "确认发布",
      cancelText: "再看看",
      onOk: approve,
    });
  };

  const reject = async () => {
    if (!draft) return;
    setBusy("reject");
    setFailure(null);
    try {
      await rejectKbDraft(draft.draft_id);
      message.success("已驳回,这份草稿不会发布");
      onChanged();
      onClose();
    } catch (e: any) {
      setFailure({ message: e?.message || "驳回失败", note: "驳回没有生效;知识库没有被改动。" });
      onChanged();
    } finally {
      setBusy(null);
    }
  };

  const renderBody = () => {
    if (loading && !draft) return <Skeleton active paragraph={{ rows: 8 }} />;
    if (loadError) {
      return (
        <Result
          status="warning"
          title="草稿详情加载失败"
          subTitle={loadError}
          extra={<Button onClick={() => draftId != null && load(draftId)}>重试</Button>}
        />
      );
    }
    if (!draft) return null;

    const flags = draftFlags(draft);
    const conflicts = Array.isArray(draft.review?.conflicts) ? draft.review!.conflicts! : [];
    const conflictIds = Array.isArray(draft.conflict_with) ? draft.conflict_with : [];
    const rows = evidenceRows(draft);
    const samples = Array.isArray(draft.samples) ? draft.samples : [];
    const isAlt = draft.kind === "alt_question";

    return (
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <Space wrap>
          <Tag color={KIND_COLOR[draft.kind ?? ""]}>{kindLabel(draft.kind)}</Tag>
          <Tag>{statusLabel(draft.status)}</Tag>
          {flags.map((f) => (
            <Tag key={f.key} color={FLAG_COLOR[f.level]}>
              {f.text}
            </Tag>
          ))}
        </Space>
        {kindHint(draft.kind) && <Text type="secondary">{kindHint(draft.kind)}</Text>}

        {failure && (
          <Alert
            type="error"
            showIcon
            closable
            onClose={() => setFailure(null)}
            message={failure.message}
            description={failure.note}
          />
        )}

        {conflictIds.length > 0 && (
          <Alert
            type="error"
            showIcon
            message="这份草稿与现有条目的说法不一致"
            description={
              <>
                <div>发布前要先弄清哪个说法是对的,否则知识库里会有两个互相矛盾的答案。</div>
                <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                  {conflictIds.map((id) => {
                    const reason = conflicts.find((c) => c?.source_id === id)?.reason;
                    return (
                      <li key={id}>
                        {id}
                        {reason ? `:${reason}` : ""}
                      </li>
                    );
                  })}
                </ul>
              </>
            }
          />
        )}
        {draft.review?.mixed_cycles === true && (
          <Alert
            type="warning"
            showIcon
            message="出处来自多个招新周期"
            description="请确认这条内容该绑定哪个周期,或是否应当是常青内容,再批准。"
          />
        )}
        {draft.review?.note ? <Text type="secondary">审核备注:{draft.review.note}</Text> : null}

        {isAlt && (
          <div>
            <Text strong>要补问法的 FAQ</Text>
            {draft.target ? (
              <Descriptions size="small" column={1} bordered style={{ marginTop: 4 }}>
                <Descriptions.Item label="条目">
                  {draft.target.title || draft.target.source_id || "—"}
                  {draft.target.enabled === false && (
                    <Tag color="warning" style={{ marginLeft: 8 }}>
                      已停用
                    </Tag>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="现有问题">{draft.target.question || "—"}</Descriptions.Item>
                <Descriptions.Item label="现有的其他问法">
                  {Array.isArray(draft.target.alt_questions) && draft.target.alt_questions.length
                    ? draft.target.alt_questions.map((q) => <div key={q}>{q}</div>)
                    : "没有"}
                </Descriptions.Item>
                <Descriptions.Item label="答案">
                  <span style={{ whiteSpace: "pre-wrap" }}>{draft.target.answer || "—"}</span>
                </Descriptions.Item>
              </Descriptions>
            ) : (
              <Alert
                style={{ marginTop: 4 }}
                type="warning"
                showIcon
                message="这条 FAQ 已经不存在了"
                description="目标条目被删除后,这份补问法草稿没有地方可以挂,发布不了,只能驳回。"
              />
            )}
          </div>
        )}

        <Form
          form={form}
          layout="vertical"
          disabled={!pending}
          onValuesChange={() => setDirty(true)}
        >
          <Form.Item
            name="question"
            label={isAlt ? "要补上的问法" : "问题"}
            rules={[
              { required: true, whitespace: true, message: "问题必填" },
              { max: 200, message: "问题至多 200 字" },
            ]}
          >
            <Input.TextArea rows={2} maxLength={200} showCount />
          </Form.Item>
          {/* 补问法沿用目标 FAQ 的答案;只有由新 FAQ 转成的才留着起草时的答案供对照 */}
          {(!isAlt || Boolean(draft.answer)) && (
            <Form.Item
              name="answer"
              label={isAlt ? "起草时的答案(仅供对照,发布时不使用)" : "答案"}
              rules={[{ max: 4000, message: "答案至多 4000 字" }]}
              extra={
                draft.kind === "missing"
                  ? "官方条目里没有找到答案。请在这里写上答案并保存,才能批准。"
                  : undefined
              }
            >
              <Input.TextArea rows={6} maxLength={4000} showCount />
            </Form.Item>
          )}
          <Form.Item
            name="cycle_id"
            label="发布时绑定的招新周期"
            extra="常青内容任何时候都可被检索;绑定周期后只在该周期开放期间可被检索"
          >
            <Select<number>
              options={[
                { value: EVERGREEN, label: "常青(不绑定周期)" },
                ...Array.from(cycleNames ?? []).map(([value, label]) => ({ value, label })),
                // 周期列表没取到、或周期已被删除时,保留草稿原有的绑定
                ...(draft.cycle_id != null && !cycleNames?.has(draft.cycle_id)
                  ? [{ value: draft.cycle_id, label: `周期 #${draft.cycle_id}` }]
                  : []),
              ]}
            />
          </Form.Item>
        </Form>

        {rows.length > 0 && (
          <div>
            <Text strong>答案里每句话的出处</Text>
            <ol style={{ margin: "4px 0 0", paddingLeft: 20 }}>
              {rows.map((r) => (
                <li key={r.index} style={{ marginBottom: 6 }}>
                  <div>
                    {r.sentence || "(没有给出句子)"}
                    {r.verdict && (
                      <Tag color={VERDICT_COLOR[r.verdict]} style={{ marginLeft: 8 }}>
                        {verdictLabel(r.verdict)}
                      </Tag>
                    )}
                  </div>
                  {r.reason ? <Text type="warning">{r.reason}</Text> : null}
                  <div>
                    <Text type="secondary">
                      出处:{r.source_title || r.source_id || "未注明"}
                      {r.quote ? ` ——「${r.quote}」` : ""}
                    </Text>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        <div>
          <Text strong>
            用户是怎么问的
            {draft.support?.query_count != null
              ? `(${draft.support.query_count} 次 / ${draft.support.thread_count ?? "—"} 个会话)`
              : ""}
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
                </li>
              ))}
            </ul>
          ) : (
            <div>
              <Text type="secondary">样本所在的会话都已删除,没有可以展示的原话。</Text>
            </div>
          )}
        </div>

        {!pending && (
          <Text type="secondary">
            {statusLabel(draft.status)}
            {draft.decided_at ? ` · ${fmtTime(draft.decided_at)}` : ""}
            {draft.decided_by != null ? ` · 用户 #${draft.decided_by}` : ""}
            {draft.published_source_id ? ` · 已发布为条目 ${draft.published_source_id}` : ""}
          </Text>
        )}
      </Space>
    );
  };

  return (
    <Drawer
      title={draft ? `草稿审核:${draft.topic || draft.question || `#${draft.draft_id}`}` : "草稿审核"}
      open={draftId != null}
      onClose={onClose}
      width={760}
      destroyOnHidden
      footer={
        pending ? (
          <Space style={{ display: "flex", justifyContent: "flex-end" }} wrap>
            {dirty && <Text type="warning">有未保存的修改</Text>}
            <Popconfirm title="驳回后这份草稿不会发布,确定?" onConfirm={reject} okText="驳回">
              <Button danger loading={busy === "reject"} disabled={busy !== null && busy !== "reject"}>
                驳回
              </Button>
            </Popconfirm>
            <Button onClick={save} loading={busy === "save"} disabled={!dirty || busy !== null}>
              保存修改
            </Button>
            <Tooltip title={blocker ?? (dirty ? "请先保存修改,批准的是已保存的内容" : undefined)}>
              <Button
                type="primary"
                loading={busy === "approve"}
                disabled={Boolean(blocker) || dirty || (busy !== null && busy !== "approve")}
                onClick={confirmApprove}
              >
                批准并发布
              </Button>
            </Tooltip>
          </Space>
        ) : null
      }
    >
      {renderBody()}
    </Drawer>
  );
};

type ListState =
  | { kind: "loading" }
  /** 接口不存在:Agent 还是旧版本,或代理路由还没上线 */
  | { kind: "unsupported" }
  | { kind: "error"; message: string }
  | { kind: "ready" };

/**
 * 知识库运营 · 草稿审核(Agent 仓 docs/proposals/kb-ops-loop.md P2):
 * 缺口分析为排在前面的主题起草「补问法 / 新 FAQ / 待补充」,由人审核后才发布到知识库。
 * AgentAdmin 工作台「草稿审核」Tab,权限 kb:manage。
 */
const AgentKBDrafts: React.FC = () => {
  const [status, setStatus] = useState<StatusFilter>("pending");
  const [kind, setKind] = useState<KbDraftKind | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [items, setItems] = useState<KbDraft[]>([]);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState<ListState>({ kind: "loading" });
  const [openId, setOpenId] = useState<number | null>(null);
  const [cycleNames, setCycleNames] = useState<CycleNames | null>(null);
  const seq = useRef(0);

  const load = useCallback(async () => {
    const mine = ++seq.current;
    setState((s) => (s.kind === "unsupported" ? s : { kind: "loading" }));
    try {
      const res: any = await listKbDrafts({ status, ...(kind ? { kind } : {}), page, size });
      if (mine !== seq.current) return;
      const list = normalizeDraftList(res?.data);
      setItems(list.items);
      setTotal(list.total);
      setState({ kind: "ready" });
    } catch (e: any) {
      if (mine !== seq.current) return;
      setItems([]);
      setTotal(0);
      // 列表没有「查不到」这回事,404 只能是接口本身不存在
      setState(
        e?.status === 404
          ? { kind: "unsupported" }
          : { kind: "error", message: e?.message || "加载草稿列表失败" }
      );
    }
  }, [status, kind, page, size]);

  useEffect(() => {
    load();
  }, [load]);

  // 周期名只用来把 cycle_id 显示成名字;取不到就显示「周期 #id」,不影响审核
  useEffect(() => {
    getAllCycles()
      .then((res: any) => {
        if (!Array.isArray(res?.data)) return;
        const names: CycleNames = new Map();
        res.data.forEach((c: any) => {
          const id = Number(c?.cycleId);
          if (Number.isInteger(id) && id >= 1) names.set(id, c.cycleName ? String(c.cycleName) : `周期 #${id}`);
        });
        setCycleNames(names);
      })
      .catch(() => undefined);
  }, []);

  if (state.kind === "unsupported") {
    return (
      <Result
        status="info"
        title="草稿审核暂不可用"
        subTitle="当前的 Agent 服务还没有提供知识库草稿的接口(可能尚未升级或代理尚未上线),升级后这里会自动可用。"
        extra={<Button onClick={load}>重新检查</Button>}
      />
    );
  }

  const columns: ColumnsType<KbDraft> = [
    {
      title: "类型",
      dataIndex: "kind",
      width: 90,
      render: (k: string) => <Tag color={KIND_COLOR[k]}>{kindLabel(k)}</Tag>,
    },
    {
      title: "主题与问题",
      key: "topic",
      render: (_: unknown, d) => (
        <div>
          <div>
            <Text strong>{d.topic || `草稿 #${d.draft_id}`}</Text>
          </div>
          <Text type="secondary">{d.question || "—"}</Text>
        </div>
      ),
    },
    {
      title: "被问到",
      key: "support",
      width: 140,
      render: (_: unknown, d) =>
        d.support?.query_count != null
          ? `${d.support.query_count} 次 / ${d.support.thread_count ?? "—"} 个会话`
          : "—",
    },
    {
      title: "需要留意",
      key: "flags",
      width: 190,
      render: (_: unknown, d) => {
        const flags = draftFlags(d);
        return flags.length ? (
          <Space size={4} wrap>
            {flags.map((f) => (
              <Tag key={f.key} color={FLAG_COLOR[f.level]}>
                {f.text}
              </Tag>
            ))}
          </Space>
        ) : (
          "—"
        );
      },
    },
    {
      title: "周期",
      dataIndex: "cycle_id",
      width: 130,
      render: (id: number | null | undefined) => (id == null ? "常青" : cycleText(id, cycleNames)),
    },
    { title: "状态", dataIndex: "status", width: 90, render: (s: string) => statusLabel(s) },
    { title: "起草时间", dataIndex: "created_at", width: 150, render: (v: string) => fmtTime(v) },
    {
      title: "操作",
      key: "actions",
      width: 80,
      render: (_: unknown, d) => (
        <Button size="small" type="link" onClick={() => setOpenId(d.draft_id)}>
          {d.status === "pending" ? "审核" : "查看"}
        </Button>
      ),
    },
  ];

  const emptyText =
    status === "pending" ? (
      <Empty
        description={
          <>
            <div>没有待审的草稿。</div>
            <div>
              起草功能默认是关闭的:开启之后,每次「知识缺口」分析会为排在前面的主题起草,草稿才会出现在这里。
            </div>
          </>
        }
      />
    ) : (
      <Empty description="这个筛选下没有草稿" />
    );

  return (
    <div>
      <Paragraph type="secondary" style={{ marginTop: 0 }}>
        缺口分析起草的「补问法 / 新 FAQ / 待补充」都先停在这里。只有在这里点了「批准并发布」,
        内容才会写进知识库、被对话助手用来回答用户。
      </Paragraph>

      <Space style={{ marginBottom: 12 }} wrap>
        <Radio.Group
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          optionType="button"
          buttonStyle="solid"
          options={STATUS_OPTIONS}
        />
        <Select<KbDraftKind>
          aria-label="草稿类型"
          style={{ width: 150 }}
          placeholder="全部类型"
          allowClear
          value={kind}
          onChange={(v) => {
            setKind(v ?? undefined);
            setPage(1);
          }}
          options={[
            { value: "alt_question", label: "补问法" },
            { value: "new_faq", label: "新 FAQ" },
            { value: "missing", label: "待补充" },
          ]}
        />
        <Tooltip title="重新加载">
          <Button icon={<ReloadOutlined />} onClick={load} />
        </Tooltip>
      </Space>

      {state.kind === "error" ? (
        <Result
          status="warning"
          title="草稿列表加载失败"
          subTitle={
            <>
              <div>{state.message}</div>
              {/* 后端对没映射的路径回 500 而不是 404,所以「代理还没上线」也会落到这里 */}
              <div style={{ fontSize: 12 }}>
                如果后端或 Agent 服务还没升级到支持草稿审核的版本,也会看到这个提示。
              </div>
            </>
          }
          extra={<Button onClick={load}>重试</Button>}
        />
      ) : (
        <Table<KbDraft>
          rowKey="draft_id"
          size="small"
          loading={state.kind === "loading"}
          columns={columns}
          dataSource={items}
          locale={{ emptyText }}
          pagination={{
            current: page,
            pageSize: size,
            total,
            showSizeChanger: true,
            pageSizeOptions: [20, 50, 100],
            onChange: (p, s) => {
              setPage(p);
              setSize(s);
            },
          }}
        />
      )}

      <DraftDrawer
        draftId={openId}
        cycleNames={cycleNames}
        onClose={() => setOpenId(null)}
        onChanged={load}
      />
    </div>
  );
};

export default AgentKBDrafts;
