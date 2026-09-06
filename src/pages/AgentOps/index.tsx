import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  Drawer,
  Descriptions,
  Input,
  Row,
  Segmented,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  AlertOutlined,
  CheckCircleFilled,
  MessageOutlined,
  ReloadOutlined,
  TeamOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";
import StatCard from "../AgentAdmin/StatCard";
import "./index.scss";
import {
  AgentConversationRow,
  AgentSessionMessage,
  AgentSessionRow,
  getAgentConversation,
  getAgentSessionMessages,
  listAgentConversations,
  listAgentSessions,
} from "@/api/manage/agentApis";

const { Text, Paragraph } = Typography;

/** 错误码 → 展示(契约 #90;null = 正常轮) */
const ERROR_TAG: Record<string, { color: string; text: string }> = {
  auth_expired: { color: "warning", text: "登录过期" },
  backend_unavailable: { color: "error", text: "后端不可用" },
  model_error: { color: "error", text: "模型错误" },
  invalid_request: { color: "processing", text: "无效请求" },
  client_disconnected: { color: "default", text: "用户断连" },
  unknown: { color: "error", text: "未知错误" },
};

/** 运营监控:仪表盘头 + 两种视图(按轮次 / 按会话)+ 详情抽屉(M6 #115;agent:monitor) */
const AgentOps: React.FC = () => {
  const [list, setList] = useState<AgentConversationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [userIdFilter, setUserIdFilter] = useState<string>("");
  const [view, setView] = useState<string>("rounds");

  // 会话视图(G3)
  const [sessions, setSessions] = useState<AgentSessionRow[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [activeSession, setActiveSession] = useState<AgentSessionRow | null>(null);
  const [transcript, setTranscript] = useState<AgentSessionMessage[]>([]);
  const [sessionRounds, setSessionRounds] = useState<AgentConversationRow[]>([]);
  const [sessionDetailLoading, setSessionDetailLoading] = useState(false);

  // 轮次抽屉(#112 视图)
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detail, setDetail] = useState<AgentConversationRow | null>(null);
  const [threadRounds, setThreadRounds] = useState<AgentConversationRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async (userId?: number) => {
    setLoading(true);
    try {
      const res: any = await listAgentConversations({ limit: 100, user_id: userId });
      setList(res?.data?.items ?? []);
    } catch (e: any) {
      message.error(e?.message || "加载对话列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSessions = useCallback(async (userId?: number) => {
    setSessionsLoading(true);
    try {
      const res: any = await listAgentSessions({ user_id: userId });
      setSessions(res?.data?.items ?? []);
    } catch (e: any) {
      message.error(e?.message || "加载会话列表失败");
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  const reload = useCallback(
    (uid?: number) => (view === "sessions" ? loadSessions(uid) : load(uid)),
    [view, load, loadSessions]
  );

  useEffect(() => {
    load();
  }, [load]);

  const onFilterSearch = (v: string) => {
    const uid = v ? Number(v) : undefined;
    if (view === "sessions") loadSessions(uid);
    else load(uid);
  };

  const openDetail = async (row: AgentConversationRow) => {
    setDrawerOpen(true);
    setDetailLoading(true);
    setDetail(null);
    setThreadRounds([]);
    try {
      const [detailRes, threadRes]: any[] = await Promise.all([
        getAgentConversation(row.id),
        listAgentConversations({ thread_id: row.thread_id, limit: 200 }),
      ]);
      setDetail(detailRes?.data ?? null);
      setThreadRounds(threadRes?.data?.items ?? []);
    } catch (e: any) {
      message.error(e?.message || "加载会话详情失败");
    } finally {
      setDetailLoading(false);
    }
  };

  /** 会话抽屉(G3):原文全文(checkpointer)+ 该会话轮次列表。 */
  const openSessionDrawer = async (s: AgentSessionRow) => {
    setActiveSession(s);
    setDrawerOpen(true);
    setSessionDetailLoading(true);
    setTranscript([]);
    setSessionRounds([]);
    try {
      const [msgRes, roundRes]: any[] = await Promise.all([
        getAgentSessionMessages(s.thread_id),
        listAgentConversations({ thread_id: s.thread_id, limit: 200 }),
      ]);
      setTranscript(msgRes?.data?.messages ?? []);
      setSessionRounds(roundRes?.data?.items ?? []);
    } catch (e: any) {
      message.error(e?.message || "加载会话原文失败");
    } finally {
      setSessionDetailLoading(false);
    }
  };

  const summary = useMemo(() => {
    const today = dayjs().format("YYYY-MM-DD");
    const withTokens = list.filter((r) => r.input_tokens != null);
    const avgIn = withTokens.length
      ? Math.round(
          withTokens.reduce((a, r) => a + (r.input_tokens ?? 0), 0) / withTokens.length
        )
      : null;
    return {
      rounds: list.length,
      today: list.filter((r) => r.created_at && dayjs(r.created_at).format("YYYY-MM-DD") === today)
        .length,
      errors: list.filter((r) => r.error_code).length,
      avgIn,
    };
  }, [list]);

  const statusRender = (code: string | null) => {
    if (!code)
      return (
        <Tag color="success" icon={<CheckCircleFilled />} style={{ marginInlineEnd: 0 }}>
          正常
        </Tag>
      );
    const t = ERROR_TAG[code] ?? { color: "error", text: code };
    return (
      <Tag color={t.color} icon={<AlertOutlined />} style={{ marginInlineEnd: 0 }}>
        {t.text}
      </Tag>
    );
  };

  const columns: ColumnsType<AgentConversationRow> = [
    {
      title: "时间",
      dataIndex: "created_at",
      width: 150,
      render: (v: string) => (v ? dayjs(v).format("MM-DD HH:mm:ss") : "-"),
    },
    { title: "用户", dataIndex: "user_id", width: 70 },
    {
      title: "问题首字",
      dataIndex: "user_message_head",
      ellipsis: true,
      render: (v: string) => v || <Text type="secondary">(无内容/错误行)</Text>,
    },
    { title: "状态", dataIndex: "error_code", width: 120, render: statusRender },
    {
      title: "Tokens (入/出)",
      key: "tokens",
      width: 130,
      render: (_, r) =>
        r.input_tokens == null && r.output_tokens == null ? (
          <Tooltip title="错误轮或历史数据未采集用量">
            <Text type="secondary">-</Text>
          </Tooltip>
        ) : (
          <Text code>
            {r.input_tokens ?? "-"} / {r.output_tokens ?? "-"}
          </Text>
        ),
    },
  ];

  const roundColumns: ColumnsType<AgentConversationRow> = [
    {
      title: "时间",
      dataIndex: "created_at",
      width: 150,
      render: (v: string) => (v ? dayjs(v).format("MM-DD HH:mm:ss") : "-"),
    },
    { title: "问题首字", dataIndex: "user_message_head", ellipsis: true },
    { title: "状态", dataIndex: "error_code", width: 100, render: statusRender },
  ];

  const sessionColumns: ColumnsType<AgentSessionRow> = [
    { title: "用户", dataIndex: "owner_user_id", width: 80 },
    {
      title: "最近问题(预览)",
      dataIndex: "preview",
      ellipsis: true,
      render: (v: string, r) =>
        v || <Text type="secondary">{r.subject || "(无对话内容)"}</Text>,
    },
    {
      title: "轮次",
      dataIndex: "rounds",
      width: 80,
      render: (v: number) => <Tag style={{ marginInlineEnd: 0 }}>{v}</Tag>,
    },
    {
      title: "最近活跃",
      dataIndex: "last_at",
      width: 160,
      render: (v: string, r) => {
        const t = v || r.created_at;
        return t ? dayjs(t).format("YYYY-MM-DD HH:mm") : "-";
      },
    },
  ];

  const filterBar = (
    <Space>
      <Input.Search
        placeholder="按用户 ID 过滤"
        allowClear
        style={{ width: 170 }}
        onSearch={onFilterSearch}
      />
      <Button size="small" icon={<ReloadOutlined />} onClick={() => reload()} />
    </Space>
  );

  return (
    <div>
      <Row gutter={[12, 12]}>
        <Col xs={12} md={8} lg={6}>
          <StatCard
            icon={<MessageOutlined />}
            tint="#e6f4ff"
            accent="#1890ff"
            title="最近轮次"
            value={summary.rounds}
          />
        </Col>
        <Col xs={12} md={8} lg={6}>
          <StatCard
            icon={<ThunderboltOutlined />}
            tint="#f0f5ff"
            accent="#2f54eb"
            title="今日对话"
            value={summary.today}
          />
        </Col>
        <Col xs={12} md={8} lg={6}>
          <StatCard
            icon={<AlertOutlined />}
            tint={summary.errors > 0 ? "#fff1f0" : "#f6ffed"}
            accent={summary.errors > 0 ? "#ff4d4f" : "#52c41a"}
            title="错误轮次"
            value={summary.errors}
            tooltip="单轮失败/断连也会留痕(#110 断连留痕设计)"
          />
        </Col>
        <Col xs={12} md={8} lg={6}>
          <StatCard
            icon={<TeamOutlined />}
            tint="#fff7e6"
            accent="#fa8c16"
            title="平均输入 tokens"
            value={summary.avgIn ?? "-"}
            tooltip="仅统计含用量采集的轮次(#113 修复后每轮必采)"
          />
        </Col>
      </Row>

      <Card
        size="small"
        title="对话记录"
        style={{ marginTop: 16, borderRadius: 12 }}
        extra={
          <Space>
            <Segmented
              value={view}
              onChange={(v) => {
                setView(v as string);
                if (v === "sessions") loadSessions();
              }}
              options={[
                { label: "按轮次", value: "rounds" },
                { label: "按会话", value: "sessions" },
              ]}
            />
            {filterBar}
          </Space>
        }
      >
        <Paragraph type="secondary" style={{ marginTop: 0 }}>
          {view === "rounds"
            ? "每轮(SSE 一次请求)落一行;点击行查看轮次详情与本会话全部轮次。PII 在写入前已脱敏。"
            : "每个 thread 一个会话;点击查看会话原文(全文)与轮次列表。"}
        </Paragraph>

        {view === "rounds" ? (
          <Table<AgentConversationRow>
            rowKey="id"
            loading={loading}
            size="small"
            columns={columns}
            dataSource={list}
            onRow={(row) => ({ onClick: () => openDetail(row), style: { cursor: "pointer" } })}
            pagination={{ pageSize: 15, showTotal: (t) => `共 ${t} 轮` }}
          />
        ) : (
          <Table<AgentSessionRow>
            rowKey="thread_id"
            loading={sessionsLoading}
            size="small"
            columns={sessionColumns}
            dataSource={sessions}
            onRow={(row) => ({
              onClick: () => openSessionDrawer(row),
              style: { cursor: "pointer" },
            })}
            pagination={{ pageSize: 15, showTotal: (t) => `共 ${t} 个会话` }}
          />
        )}
      </Card>

      {/* 轮次详情抽屉(按轮次视图) */}
      <Drawer
        title={`会话详情(第 ${detail?.id ?? "-"} 轮)`}
        width={640}
        open={drawerOpen && !activeSession}
        onClose={() => {
          setDrawerOpen(false);
          setActiveSession(null);
        }}
        loading={detailLoading}
      >
        {detail && (
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Thread">{detail.thread_id}</Descriptions.Item>
            <Descriptions.Item label="用户">{detail.user_id ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="耗时">
              {detail.duration_ms == null
                ? "-"
                : detail.duration_ms < 1000
                  ? `${detail.duration_ms}ms`
                  : `${(detail.duration_ms / 1000).toFixed(1)}s`}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              {detail.error_code
                ? <Tag color="warning">{ERROR_TAG[detail.error_code]?.text ?? detail.error_code}</Tag>
                : <Tag color="success">正常</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="问题原文">
              {detail.user_message || <Text type="secondary">(错误行不存内容)</Text>}
            </Descriptions.Item>
            <Descriptions.Item label="回复摘要">
              <Paragraph style={{ marginBottom: 0, whiteSpace: "pre-wrap" }} ellipsis={{ expandable: true }}>
                {detail.reply_summary || <Text type="secondary">(空)</Text>}
              </Paragraph>
            </Descriptions.Item>
            <Descriptions.Item label="工具调用">
              {detail.tools?.length
                ? detail.tools.map((t, i) => <Tag key={i}>{t}</Tag>)
                : <Text type="secondary">无</Text>}
            </Descriptions.Item>
            <Descriptions.Item label="Tokens (入/出)">
              {detail.input_tokens == null && detail.output_tokens == null
                ? "-"
                : `${detail.input_tokens ?? "-"} / ${detail.output_tokens ?? "-"}`}
            </Descriptions.Item>
          </Descriptions>
        )}

        <Typography.Title level={5} style={{ marginTop: 24 }}>
          本会话全部轮次({threadRounds.length})
        </Typography.Title>
        <Table<AgentConversationRow>
          rowKey="id"
          size="small"
          columns={roundColumns}
          dataSource={threadRounds}
          pagination={false}
          expandable={{
            expandedRowRender: (r) => (
              <div>
                <Paragraph style={{ marginBottom: 4, whiteSpace: "pre-wrap" }}>
                  <Text type="secondary">摘要:</Text>
                  {r.reply_summary || "(空)"}
                </Paragraph>
                {r.tools?.length ? <span>工具: {r.tools.join(", ")}</span> : null}
              </div>
            ),
          }}
        />
      </Drawer>

      {/* 会话原文抽屉(按会话视图,G3) */}
      <Drawer
        title={
          <span style={{ fontSize: 14 }}>
            会话原文
            <Text type="secondary" code style={{ marginLeft: 8, fontSize: 12 }}>
              {activeSession?.thread_id}
            </Text>
          </span>
        }
        width={640}
        open={drawerOpen && !!activeSession}
        onClose={() => {
          setDrawerOpen(false);
          setActiveSession(null);
        }}
      >
        {sessionDetailLoading ? (
          <div style={{ textAlign: "center", padding: 32 }}>
            <Spin />
          </div>
        ) : (
          <>
            {activeSession && (
              <Space style={{ marginBottom: 12 }} size={12}>
                <Text type="secondary">用户 {activeSession.owner_user_id}</Text>
                <Text type="secondary">
                  开始 {activeSession.created_at ? dayjs(activeSession.created_at).format("MM-DD HH:mm") : "-"}
                </Text>
                <Tag>{activeSession.rounds} 轮</Tag>
              </Space>
            )}

            <div className="agent-ops-transcript">
              {transcript.length === 0 ? (
                <Text type="secondary">(该会话在记忆存储中暂无原文)</Text>
              ) : (
                transcript.map((m, i) => (
                  <div
                    key={i}
                    className={`agent-ops-transcript__msg agent-ops-transcript__msg--${m.role}`}
                  >
                    <div className="agent-ops-transcript__bubble">{m.content}</div>
                  </div>
                ))
              )}
            </div>

            <Typography.Title level={5} style={{ marginTop: 24 }}>
              轮次记录({sessionRounds.length})
            </Typography.Title>
            <Table<AgentConversationRow>
              rowKey="id"
              size="small"
              columns={roundColumns}
              dataSource={sessionRounds}
              pagination={false}
              expandable={{
                expandedRowRender: (r) => (
                  <div>
                    <Paragraph style={{ marginBottom: 4, whiteSpace: "pre-wrap" }}>
                      <Text type="secondary">摘要:</Text>
                      {r.reply_summary || "(空)"}
                    </Paragraph>
                    {r.tools?.length ? <span>工具: {r.tools.join(", ")}</span> : null}
                  </div>
                ),
              }}
            />
          </>
        )}
      </Drawer>
    </div>
  );
};

export default AgentOps;
