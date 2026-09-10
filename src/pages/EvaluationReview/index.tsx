import React, { useCallback, useEffect, useState } from "react";
import {
  Button,
  Drawer,
  Empty,
  Input,
  Modal,
  Radio,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import {
  BookOutlined,
  CheckOutlined,
  ReloadOutlined,
  RobotOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";
import {
  ScorecardDetail,
  ScorecardRow,
  adoptEvaluation,
  getEvaluationQbank,
  getEvaluationScorecard,
  listEvaluationQueue,
  pickQuestions,
  rejectEvaluation,
  runResumeEvaluation,
} from "@/api/manage/evaluationApis";
import { getAllCycles } from "@/api/manage/cycleApis";

const { Text, Paragraph } = Typography;

const STATUS_TAG: Record<string, { color: string; text: string }> = {
  draft: { color: "default", text: "待评审" },
  adopted: { color: "success", text: "已采纳" },
  rejected: { color: "error", text: "已驳回" },
};

const VERDICT_TEXT: Record<string, string> = {
  sincere: "态度端正",
  perfunctory: "态度敷衍",
  bad_faith: "态度不端",
};

/** 简历评估评审队列(B 模块 #135,#128):0 分队列/维卡/采纳/驳回/题库勾选。
 * 权限:评审动作 resume:audit;面试官 interview:evaluate 只读维卡与题库。 */
const EvaluationReview: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const [cycleId, setCycleId] = useState<number | null>(null);
  const [queue, setQueue] = useState<"all" | "zero">("all");
  const [rows, setRows] = useState<ScorecardRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [detail, setDetail] = useState<ScorecardDetail | null>(null);
  const [detailResume, setDetailResume] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [qbankOpen, setQbankOpen] = useState(false);
  const [qbank, setQbank] = useState<any>(null);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [selectedRows, setSelectedRows] = useState<ScorecardRow[]>([]);
  const [rescoring, setRescoring] = useState(false);

  const load = useCallback(
    async (cid = cycleId, q = queue) => {
      if (cid === null) return;
      setLoading(true);
      try {
        const res: any = await listEvaluationQueue(cid, q);
        setRows(res?.data?.items ?? []);
      } catch (e: any) {
        message.error(e?.message || "加载评审队列失败");
      } finally {
        setLoading(false);
      }
    },
    [cycleId, queue]
  );

  const startRescoring = () => {
    if (selectedRows.length === 0 || cycleId === null) return;
    // 同一简历多版本去重(每 resume 一票)。方案A(闸门1):只提交 resume_id,
    // 归属 user_id 由 Agent 权威派生,前端不再携带(历史行 user_id 可能为空)。
    const resumeIds = Array.from(new Set(selectedRows.map((r) => r.resume_id)));
    const items = resumeIds;
    Modal.confirm({
      title: `对选中的 ${items.length} 份简历重新 AI 评分？`,
      content: "将生成新版评分卡与题组(旧版本保留可对比);人工评审记录不受影响。",
      okText: "重新评分",
      cancelText: "取消",
      onOk: async () => {
        setRescoring(true);
        try {
          await runResumeEvaluation(cycleId, items);
          setSelectedKeys([]);
          setSelectedRows([]);
          await load();
          message.success(`已提交 ${items.length} 份简历重新评分`);
        } catch (e: any) {
          message.error(e?.message || "重新评分提交失败");
        } finally {
          setRescoring(false);
        }
      },
    });
  };

  useEffect(() => {
    // 默认周期自动取最新一个(否则写死数字,新周期数据会"看不到")
    (async () => {
      try {
        const res: any = await getAllCycles();
        const cycles: number[] = (res?.data ?? []).map((c: any) => c.cycleId);
        const latest = cycles.length ? Math.max(...cycles) : null;
        if (latest) {
          setCycleId(latest);
          load(latest);
          return;
        }
      } catch {
        /* 周期接口失败时保持空列表 */
      }
      load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDetail = async (row: ScorecardRow) => {
    setDetailResume(row.resume_id);
    setDetailOpen(true);
    setDetail(null);
    try {
      const res: any = await getEvaluationScorecard(row.resume_id, cycleId);
      setDetail(res?.data ?? null);
    } catch (e: any) {
      message.error(e?.message || "加载评分卡失败");
    }
  };

  const openQbank = async (row: ScorecardRow) => {
    setDetailResume(row.resume_id);
    setQbankOpen(true);
    setQbank(null);
    try {
      const res: any = await getEvaluationQbank(row.resume_id, cycleId);
      setQbank(res?.data ?? null);
    } catch (e: any) {
      message.error(e?.message || "该候选暂无预置题库");
    }
  };

  const doAdopt = (row: ScorecardRow) => {
    let score = Math.round(row.total ?? 0);
    Modal.confirm({
      title: `采纳 AI 参考分并投本人一票`,
      content: (
        <div>
          <Paragraph type="secondary">
            将以你的身份向简历 #{row.resume_id} 投一票
            （终分 = 全部评审票平均）。可在下方改为人工分数。
          </Paragraph>
          <Input
            defaultValue={String(score)}
            type="number"
            min={0}
            max={100}
            onChange={(e) => {
              score = Number(e.target.value);
            }}
          />
        </div>
      ),
      onOk: async () => {
        try {
          await adoptEvaluation(row.resume_id, cycleId, score, row.card_version);
          message.success("已采纳并投一票");
          load();
        } catch (e: any) {
          message.error(e?.message || "采纳失败");
        }
      },
    });
  };

  const doReject = (row: ScorecardRow) => {
    Modal.confirm({
      title: "驳回该 AI 参考分?",
      content: "驳回后卡置为已驳回,可重新触发初筛生成新版本。",
      onOk: async () => {
        try {
          await rejectEvaluation(row.resume_id, cycleId, row.card_version);
          message.success("已驳回");
          load();
        } catch (e: any) {
          message.error(e?.message || "驳回失败");
        }
      },
    });
  };

  const doPick = async (resumeId: number, q: any) => {
    try {
      // 闸门5(评审):直接消费 Agent 的 qbank.pickable 扁平视图——
      // 它是权威题引用(group_index/role/category/chain_index/layer_index/
      // evidence_path/theme),record_pick 原样落库。之前从规范化 UI 对象
      // 读 q.anchor/q.evidence.path(不存在)→ pick log 丢定位信息,
      // 链问题还把 chain.theme 当 evidence_path。按题干文匹配回 pickable。
      const ref =
        (qbank?.pickable ?? []).find((p: any) => p.question === q.question) ?? null;
      const questionRef = ref ?? {
        category: q.tag ?? "",
        question: q.question,
        evidence_path: q.path ?? "",
      };
      await pickQuestions({
        resume_id: resumeId,
        cycle_id: cycleId,
        questions: [questionRef],
      });
      message.success("已勾选(记入 pick log)");
    } catch (e: any) {
      message.error(e?.message || "勾选失败");
    }
  };

  const columns: ColumnsType<ScorecardRow> = [
    { title: "简历 ID", dataIndex: "resume_id", width: 90 },
    { title: "卡版本", dataIndex: "card_version", width: 80 },
    {
      title: "状态",
      dataIndex: "status",
      width: 90,
      render: (v: string) => (
        <Tag color={STATUS_TAG[v]?.color}>{STATUS_TAG[v]?.text ?? v}</Tag>
      ),
    },
    {
      title: "初筛",
      dataIndex: "hard_zero",
      width: 100,
      render: (v: boolean) =>
        v ? <Tag color="red">初筛不过</Tag> : <Tag color="green">通过</Tag>,
    },
    {
      title: "AI 参考总分",
      dataIndex: "total",
      width: 110,
      render: (v: number | null) => (v === null ? "-" : <b>{v}</b>),
    },
    {
      title: "生成时间",
      dataIndex: "created_at",
      width: 150,
      render: (v: string) => (v ? dayjs(v).format("MM-DD HH:mm") : "-"),
    },
    {
      title: "操作",
      key: "actions",
      width: 250,
      render: (_: unknown, r) => (
        <Space>
          <Button size="small" type="link" onClick={() => openDetail(r)}>
            维卡
          </Button>
          <Button size="small" type="link" icon={<BookOutlined />} onClick={() => openQbank(r)}>
            题库
          </Button>
          <Button size="small" type="primary" ghost onClick={() => doAdopt(r)}>
            采纳
          </Button>
          <Button size="small" danger ghost onClick={() => doReject(r)}>
            驳回
          </Button>
        </Space>
      ),
    },
  ];

  const table = (
    <>
      <Space style={{ marginBottom: 12 }} wrap>
        <Input.Search
          allowClear
          style={{ width: 160 }}
          defaultValue="2026"
          prefix="周期"
          onSearch={(v) => {
            const cid = Number(v) || 2026;
            setCycleId(cid);
            load(cid, queue);
          }}
        />
        <Radio.Group
          value={queue}
          optionType="button"
          buttonStyle="solid"
          onChange={(e) => {
            setQueue(e.target.value);
            load(cycleId, e.target.value);
          }}
          options={[
            { value: "all", label: "全部" },
            { value: "zero", label: "0 分/初筛不过" },
          ]}
        />
        <Button icon={<ReloadOutlined />} onClick={() => load()} />
        <Button
          icon={<RobotOutlined />}
          type="primary"
          ghost
          disabled={selectedRows.length === 0 || rescoring}
          loading={rescoring}
          onClick={startRescoring}
        >
          AI 重新评分{selectedRows.length ? `（已选 ${selectedRows.length}）` : ""}
        </Button>
      </Space>
      <Table
        rowKey={(r) => `${r.resume_id}-${r.card_version}`}
        rowSelection={{
          selectedRowKeys: selectedKeys,
          onChange: (keys, rows) => {
            setSelectedKeys(keys.map(String));
            setSelectedRows(rows);
          },
        }}
        size="small"
        loading={loading}
        columns={columns}
        dataSource={rows}
        locale={{ emptyText: <Empty description="暂无评分卡;先在评测任务里触发初筛" /> }}
        pagination={{ pageSize: 10, showSizeChanger: false }}
      />
    </>
  );

  const detailDrawer = (
    <Drawer
      title={`评分卡:简历 #${detailResume ?? ""}`}
      width={560}
      open={detailOpen}
      onClose={() => setDetailOpen(false)}
    >
      {!detail ? (
        <Empty description="加载中/无数据" />
      ) : (
        <div>
          <Space style={{ marginBottom: 12 }}>
            <Tag color={STATUS_TAG[detail.status]?.color}>
              {STATUS_TAG[detail.status]?.text ?? detail.status}
            </Tag>
            {detail.hard_zero ? <Tag color="red">初筛不过</Tag> : null}
            <Text strong>AI 参考总分:{detail.total ?? "-"}</Text>
          </Space>
          {(detail.card?.dimensions ?? []).map((d) => (
            <div
              key={d.field_key}
              style={{
                border: "1px solid #f0f0f0",
                borderRadius: 8,
                padding: 12,
                marginBottom: 8,
              }}
            >
              <Space>
                <Text strong>{d.field_key}</Text>
                <Tag color="blue">{d.score} 分</Tag>
              </Space>
              <Paragraph style={{ marginBottom: 4 }}>{d.rationale}</Paragraph>
              <Paragraph type="secondary" style={{ marginBottom: 0 }} italic>
                依据:「{d.evidence}」
              </Paragraph>
            </div>
          ))}
          <Paragraph type="secondary">
            态度:{VERDICT_TEXT[detail.card?.attitude?.verdict] ?? "-"}
            {detail.card?.attitude?.reason ? ` — ${detail.card.attitude.reason}` : ""}
          </Paragraph>
        </div>
      )}
    </Drawer>
  );

  const qbankDrawer = (
    <Drawer
      title={
        <Space>
          <BookOutlined /> 预置题库:简历 #{detailResume ?? ""}
        </Space>
      }
      width={560}
      open={qbankOpen}
      onClose={() => setQbankOpen(false)}
    >
      {(() => {
        if (!qbank) return <Empty description="加载中…" />;
        const groups: any[] = qbank.envelope?.groups ?? [];
        // #153/#用户反馈:按组 Tab 渲染——repo 组(v2 嵌套)每个仓一个 Tab,
        // 旧形状组(评测/奖项/兜底)各一个 Tab
        const GROUP_LABEL: Record<string, string> = {
          repo: "仓库深挖",
          autograding: "评测错因",
          awards: "奖项追问",
          base_and_skills: "基础三维与技能题",
        };
        const ATTR_COLOR: Record<string, string> = {
          "trusted-own": "green",
          "trusted-contribution": "cyan",
          claimed: "orange",
          unverified: "red",
          none: "default",
        };
        const tabs = groups.map((g: any, gi: number) => {
          const kind = String(g.group ?? "");
          const v2 = g.qbank_v2;
          const inner = v2?.group ?? null;
          const qs: any[] = [];
          if (inner) {
            if (inner.entry)
              qs.push({
                tag: `入口·${(inner.entry.category ?? "").replace(/^C\d+_/, "")}`,
                question: inner.entry.question,
                path: inner.entry.evidence?.path ?? "",
                minutes: inner.entry.time_minutes ?? 3,
                reference: inner.entry.answer_reference ?? null,
              });
            for (const [ci, chain] of (inner.chains ?? []).entries())
              for (const [li, layer] of (chain.layers ?? []).entries())
                qs.push({
                  tag: `链${ci + 1}·L${li + 1}·${(chain.category ?? "").replace(/^C\d+_/, "")}`,
                  question: layer.question,
                  path: chain.theme ?? "",
                  minutes: null,
                  reference: null,
                  signal: layer.expected_signal ?? "",
                });
            for (const r of inner.reserves ?? [])
              qs.push({
                tag: `备选·${(r.category ?? "").replace(/^C\d+_/, "")}`,
                question: r.question,
                path: r.evidence?.path ?? "",
                minutes: r.time_minutes ?? 3,
                reference: r.answer_reference ?? null,
              });
          } else {
            for (const q of g.questions ?? [])
              qs.push({
                tag: q.anchor ?? "",
                question: q.question,
                path: q.evidence?.path ?? "",
                minutes: q.time_minutes ?? 3,
                reference: q.answer_reference ?? null,
              });
          }
          const attr = inner ? (v2.attribution ?? "none") : null;
          const labelBits: string[] = [];
          if (kind === "repo") {
            labelBits.push(g.repo || g.owner || GROUP_LABEL[kind] || "仓库深挖");
          } else {
            labelBits.push(GROUP_LABEL[kind] ?? kind);
          }
          if (v2?.degraded) labelBits.push("降级");
          return {
            key: String(gi),
            label: (
              <span>
                {labelBits.join(" · ")}
                {attr ? (
                  <Tag color={ATTR_COLOR[attr] ?? "default"} style={{ marginLeft: 6, marginRight: 0 }}>
                    {attr}
                  </Tag>
                ) : null}
              </span>
            ),
            questions: qs,
            repoSummary: inner ? v2.repo_summary ?? "" : g.repo_summary ?? "",
            theme: inner ? "repo" : kind,
          };
        });
        const totalQs = tabs.reduce((n, t) => n + t.questions.length, 0);
        if (!totalQs) {
          const skipped = groups.some((g: any) => g.mode === "skipped");
          return (
            <Empty
              description={skipped ? "该候选项目维证据不足,已跳过深挖(其余维度见评分卡)" : "暂无预置题(或该维被跳过)"}
            />
          );
        }
        return (
          <>
            <Tabs
              items={tabs.map((t: any) => ({
                key: t.key,
                label: t.label,
                children: (
                  <>
                    {t.theme === "repo" && t.repoSummary ? (
                      <Paragraph type="secondary" style={{ marginTop: 0 }}>
                        {t.repoSummary}
                      </Paragraph>
                    ) : null}
                    {t.questions.map((q: any, i: number) => (
                      <div
                        key={i}
                        style={{ border: "1px solid #f0f0f0", borderRadius: 8, padding: 12, marginBottom: 8 }}
                      >
                        <Space style={{ marginBottom: 4 }} wrap>
                          <Tag color="purple">{q.tag}</Tag>
                          {q.path ? <Tag>{q.path}</Tag> : null}
                          {q.minutes ? <Text type="secondary">{q.minutes} 分钟</Text> : null}
                        </Space>
                        <Paragraph strong style={{ marginBottom: 4 }}>
                          {q.question}
                        </Paragraph>
                        {q.signal ? (
                          <Paragraph type="secondary" style={{ marginBottom: 4 }}>
                            过关信号:{q.signal}
                          </Paragraph>
                        ) : null}
                        {q.reference ? (
                          <Paragraph type="secondary" style={{ marginBottom: 4 }}>
                            好答:{q.reference.strong} / 达标:{q.reference.acceptable} / 弱:
                            {q.reference.weak}
                          </Paragraph>
                        ) : null}
                        <Button
                          size="small"
                          icon={<CheckOutlined />}
                          onClick={() => doPick(detailResume ?? 0, q)}
                        >
                          勾选此题
                        </Button>
                      </div>
                    ))}
                  </>
                ),
              }))}
            />
          </>
        );
      })()}
    </Drawer>
  );

  if (embedded) {
    return (
      <>
        {table}
        {detailDrawer}
        {qbankDrawer}
      </>
    );
  }
  return (
    <div>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        简历评估评审队列
      </Typography.Title>
      <Paragraph type="secondary" style={{ marginTop: 0 }}>
        AI 参考分仅供复核;采纳 = 以你本人身份投一票,终分为全部评审票平均(权限
        resume:audit)。0 分队列 = 初筛不过,不自动拒,可人工改判。
      </Paragraph>
      {table}
      {detailDrawer}
      {qbankDrawer}
    </div>
  );
};

export default EvaluationReview;
