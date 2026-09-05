import React, { useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  Drawer,
  Descriptions,
  Input,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";
import {
  AgentConversationRow,
  getAgentConversation,
  listAgentConversations,
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

const formatDuration = (ms?: number | null) =>
  ms == null ? "-" : ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;

/** 运营视图:最近对话列表 + 轮次详情(M6 #115;权限 agent:monitor) */
const AgentOps: React.FC = () => {
  const [list, setList] = useState<AgentConversationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [userIdFilter, setUserIdFilter] = useState<string>("");

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

  useEffect(() => {
    load();
  }, [load]);

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

  const columns: ColumnsType<AgentConversationRow> = [
    {
      title: "时间",
      dataIndex: "created_at",
      width: 180,
      render: (v: string) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm:ss") : "-"),
    },
    { title: "用户", dataIndex: "user_id", width: 80 },
    {
      title: "问题首字",
      dataIndex: "user_message_head",
      ellipsis: true,
      render: (v: string) => v || <Text type="secondary">(无内容/错误行)</Text>,
    },
    {
      title: "状态",
      dataIndex: "error_code",
      width: 110,
      render: (code: string | null) => {
        if (!code) return <Tag color="success">正常</Tag>;
        const t = ERROR_TAG[code] ?? { color: "error", text: code };
        return <Tag color={t.color}>{t.text}</Tag>;
      },
    },
  ];

  const roundColumns: ColumnsType<AgentConversationRow> = [
    {
      title: "时间",
      dataIndex: "created_at",
      width: 160,
      render: (v: string) => (v ? dayjs(v).format("MM-DD HH:mm:ss") : "-"),
    },
    { title: "问题首字", dataIndex: "user_message_head", ellipsis: true },
    {
      title: "状态",
      dataIndex: "error_code",
      width: 100,
      render: (code: string | null) =>
        code ? <Tag color="warning">{ERROR_TAG[code]?.text ?? code}</Tag> : <Tag color="success">正常</Tag>,
    },
  ];

  return (
    <Card
      title="Agent 运营视图"
      extra={
        <Space>
          <Input.Search
            placeholder="按用户 ID 过滤"
            allowClear
            style={{ width: 180 }}
            onSearch={(v) => load(v ? Number(v) : undefined)}
          />
          <Button icon={<ReloadOutlined />} onClick={() => load()} />
        </Space>
      }
    >
      <Table<AgentConversationRow>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={list}
        onRow={(row) => ({ onClick: () => openDetail(row), style: { cursor: "pointer" } })}
        pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 轮` }}
      />

      <Drawer
        title={`会话详情(第 ${detail?.id ?? "-"} 轮)`}
        width={640}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        loading={detailLoading}
      >
        {detail && (
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Thread">{detail.thread_id}</Descriptions.Item>
            <Descriptions.Item label="用户">{detail.user_id ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="耗时">{formatDuration(detail.duration_ms)}</Descriptions.Item>
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
    </Card>
  );
};

export default AgentOps;
