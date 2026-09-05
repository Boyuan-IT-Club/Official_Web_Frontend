import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  Row,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  AlertOutlined,
  CloudDownloadOutlined,
  CloudUploadOutlined,
  MessageOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";
import { AgentConversationRow, listAgentConversations } from "@/api/manage/agentApis";

const { Text, Paragraph } = Typography;

/** 统计卡:彩色图标圆片 + 数值(项目主色系) */
function StatCard({
  icon,
  tint,
  title,
  value,
  suffix,
  accent,
  tooltip,
}: {
  icon: React.ReactNode;
  tint: string;
  title: string;
  value: string | number;
  suffix?: string;
  accent: string;
  tooltip?: string;
}) {
  const titleEl = tooltip ? <Tooltip title={tooltip}>{title}</Tooltip> : title;
  return (
    <Card
      size="small"
      style={{ borderRadius: 12, boxShadow: "0 1px 4px rgba(0,21,41,.06)" }}
      styles={{ body: { padding: "14px 16px" } }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span
          style={{
            width: 42,
            height: 42,
            borderRadius: 10,
            background: tint,
            color: accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            flexShrink: 0,
          }}
        >
          {icon}
        </span>
        <Statistic title={titleEl} value={value} suffix={suffix} />
      </div>
    </Card>
  );
}

/** 用量仪表盘:最近窗口 token/缓存率/错误率速览(M6 #115)。
 *  看板级聚合(按日/按用户/价格)归 #65(OBS-08),此处只做最近数据速览。 */
const AgentUsage: React.FC = () => {
  const [list, setList] = useState<AgentConversationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await listAgentConversations({ limit: 200 });
      setList(res?.data?.items ?? []);
      setUpdatedAt(dayjs().format("HH:mm:ss"));
    } catch (e: any) {
      message.error(e?.message || "加载用量数据失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(() => {
    const withUsage = list.filter(
      (r) => r.input_tokens != null || r.output_tokens != null
    );
    const sum = (pick: (r: AgentConversationRow) => number | null | undefined) =>
      withUsage.reduce((acc, r) => acc + (pick(r) ?? 0), 0);
    const input = sum((r) => r.input_tokens);
    const output = sum((r) => r.output_tokens);
    const hit = sum((r) => r.cache_hit_tokens);
    const miss = sum((r) => r.cache_miss_tokens);
    const errors = list.filter((r) => r.error_code).length;
    return {
      rounds: list.length,
      input,
      output,
      cacheRate: hit + miss > 0 ? hit / (hit + miss) : null,
      errorRate: list.length ? errors / list.length : null,
      errors,
    };
  }, [list]);

  const columns: ColumnsType<AgentConversationRow> = [
    {
      title: "时间",
      dataIndex: "created_at",
      width: 170,
      render: (v: string) => (v ? dayjs(v).format("MM-DD HH:mm:ss") : "-"),
    },
    { title: "用户", dataIndex: "user_id", width: 80 },
    {
      title: "输入 tokens",
      dataIndex: "input_tokens",
      width: 120,
      render: (v: number | null) => v ?? "-",
    },
    {
      title: "输出 tokens",
      dataIndex: "output_tokens",
      width: 120,
      render: (v: number | null) => v ?? "-",
    },
    {
      title: "缓存命中",
      key: "cache",
      width: 140,
      render: (_, r) => {
        if (r.cache_hit_tokens == null && r.cache_miss_tokens == null) return "-";
        const total = (r.cache_hit_tokens ?? 0) + (r.cache_miss_tokens ?? 0);
        if (!total) return <Tag color="default">0%</Tag>;
        const rate = (r.cache_hit_tokens ?? 0) / total;
        return (
          <Tag color={rate >= 0.5 ? "success" : rate > 0 ? "warning" : "error"}>
            {(rate * 100).toFixed(0)}%
          </Tag>
        );
      },
    },
    {
      title: "状态",
      dataIndex: "error_code",
      width: 100,
      render: (code: string | null) =>
        code ? <Tag color="error">{code}</Tag> : <Tag color="success">正常</Tag>,
    },
  ];

  return (
    <div>
      <Row gutter={[12, 12]}>
        <Col xs={12} sm={12} md={8} lg={5}>
          <StatCard
            icon={<MessageOutlined />}
            tint="#e6f4ff"
            accent="#1890ff"
            title="最近轮次"
            value={summary.rounds}
          />
        </Col>
        <Col xs={12} sm={12} md={8} lg={5}>
          <StatCard
            icon={<CloudUploadOutlined />}
            tint="#f0f5ff"
            accent="#2f54eb"
            title="输入 tokens"
            value={summary.input}
          />
        </Col>
        <Col xs={12} sm={12} md={8} lg={5}>
          <StatCard
            icon={<CloudDownloadOutlined />}
            tint="#f6ffed"
            accent="#52c41a"
            title="输出 tokens"
            value={summary.output}
          />
        </Col>
        <Col xs={12} sm={12} md={8} lg={5}>
          <StatCard
            icon={<ThunderboltOutlined />}
            tint="#fffbe6"
            accent="#faad14"
            title="缓存命中率"
            value={summary.cacheRate == null ? "-" : (summary.cacheRate * 100).toFixed(1)}
            suffix={summary.cacheRate == null ? "" : "%"}
            tooltip="命中率 = prompt_cache_hit / (hit + miss),DeepSeek 自动前缀缓存"
          />
        </Col>
        <Col xs={12} sm={12} md={8} lg={4}>
          <StatCard
            icon={<AlertOutlined />}
            tint={summary.errors > 0 ? "#fff1f0" : "#f6ffed"}
            accent={summary.errors > 0 ? "#ff4d4f" : "#52c41a"}
            title="错误率"
            value={summary.errorRate == null ? "-" : (summary.errorRate * 100).toFixed(1)}
            suffix={summary.errorRate == null ? "" : "%"}
          />
        </Col>
      </Row>

      <Card
        size="small"
        title="最近轮次明细"
        style={{ marginTop: 16, borderRadius: 12 }}
        extra={
          <span>
            {updatedAt && (
              <Text type="secondary" style={{ marginRight: 12 }}>
                更新于 {updatedAt}
              </Text>
            )}
            <Button size="small" icon={<ReloadOutlined />} onClick={load} />
          </span>
        }
      >
        <Paragraph type="secondary" style={{ marginTop: 0 }}>
          统计口径:最近 {list.length} 轮(自采数据,#113);缓存命中率 = hit/(hit+miss);
          价格离线聚合与按日/按用户看板归 #65(OBS-08),不在本页。
        </Paragraph>
        <Table<AgentConversationRow>
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={list}
          pagination={{ pageSize: 15, showTotal: (t) => `共 ${t} 轮` }}
        />
      </Card>
    </div>
  );
};

export default AgentUsage;
