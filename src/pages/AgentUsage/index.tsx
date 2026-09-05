import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card, Col, Row, Statistic, Table, Tag, Typography, message } from "antd";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";
import { AgentConversationRow, listAgentConversations } from "@/api/manage/agentApis";

const { Text, Paragraph } = Typography;

/** 用量速览:最近窗口内的 token/缓存率/错误率(M6 #115)。
 *  看板级聚合(按日/按用户/价格)归 #65(OBS-08),此处只做最近数据速览。 */
const AgentUsage: React.FC = () => {
  const [list, setList] = useState<AgentConversationRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await listAgentConversations({ limit: 200 });
      setList(res?.data?.items ?? []);
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
    const withUsage = list.filter((r) => r.input_tokens != null || r.output_tokens != null);
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
    <Card title="Agent 用量速览" loading={loading}>
      <Paragraph type="secondary">
        统计口径:最近 {list.length} 轮(自采数据,#113);缓存命中率 = hit/(hit+miss);
        价格离线聚合与按日/按用户看板归 #65(OBS-08),不在本页。
      </Paragraph>
      <Row gutter={16}>
        <Col span={5}><Statistic title="最近轮次" value={summary.rounds} /></Col>
        <Col span={5}><Statistic title="输入 tokens" value={summary.input} /></Col>
        <Col span={5}><Statistic title="输出 tokens" value={summary.output} /></Col>
        <Col span={4}>
          <Statistic
            title="缓存命中率"
            value={summary.cacheRate == null ? "-" : (summary.cacheRate * 100).toFixed(1)}
            suffix={summary.cacheRate == null ? "" : "%"}
          />
        </Col>
        <Col span={5}>
          <Statistic
            title="错误率"
            value={summary.errorRate == null ? "-" : (summary.errorRate * 100).toFixed(1)}
            suffix={summary.errorRate == null ? "" : "%"}
          />
        </Col>
      </Row>

      <Typography.Title level={5} style={{ marginTop: 24 }}>
        最近轮次明细
      </Typography.Title>
      <Table<AgentConversationRow>
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={list}
        pagination={{ pageSize: 15, showTotal: (t) => <Text type="secondary">共 {t} 轮</Text> }}
      />
    </Card>
  );
};

export default AgentUsage;
