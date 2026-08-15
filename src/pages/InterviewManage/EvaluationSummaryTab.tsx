// 评价汇总：一位候选人一行，署上本场共同参与的面试官，供「结果与通知」录入录取决定时参考。
// 读的是物化后的 interview_evaluation，比协同文档滞后一个物化周期（默认 30 秒）。
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Button, Empty, Input, Space, Table, Tag, Tooltip, Typography,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import {
  CandidateSummary, EVALUATION_STATUS, EvaluationSummary, RECOMMENDATION_OPTIONS, getEvaluationSummary,
} from '@/api/manage/interviewEvaluation';

const { Text, Paragraph } = Typography;

const fmtDateTime = (v?: string | null) => (v ? String(v).replace('T', ' ').slice(0, 16) : '—');

const RECOMMENDATION_COLOR: Record<number, string> = { 1: 'green', 2: 'orange', 3: 'red' };

const recommendationLabel = (value?: number | null) =>
  RECOMMENDATION_OPTIONS.find((o) => o.value === value)?.label ?? '—';

const EvaluationSummaryTab: React.FC<{ cycleId: number }> = ({ cycleId }) => {
  const [summary, setSummary] = useState<EvaluationSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getEvaluationSummary(cycleId);
      setSummary(res?.data ?? null);
    } catch (e: any) {
      setSummary(null);
      setError(e?.message || '加载评价汇总失败');
    } finally {
      setLoading(false);
    }
  }, [cycleId]);

  useEffect(() => { load(); }, [load]);

  const dimensions = summary?.dimensions ?? [];

  const rows = useMemo(() => {
    const list = summary?.candidates ?? [];
    const text = keyword.trim().toLowerCase();
    if (!text) return list;
    return list.filter((c) => `${c.candidateName}${c.deptName ?? ''}`.toLowerCase().includes(text));
  }, [summary, keyword]);

  const columns: any[] = [
    {
      title: '候选人',
      dataIndex: 'candidateName',
      fixed: 'left',
      width: 160,
      render: (name: string, row: CandidateSummary) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 500 }}>{name || `#${row.scheduleId}`}</span>
          <Text type="secondary" style={{ fontSize: 12 }}>{row.deptName || '—'}</Text>
        </Space>
      ),
    },
    {
      title: '面试时间',
      dataIndex: 'interviewTime',
      width: 140,
      render: (v: string) => <Text style={{ fontSize: 12 }}>{fmtDateTime(v)}</Text>,
    },
    ...dimensions.map((dimension) => ({
      title: (
        <Tooltip title={`满分 ${dimension.maxScore}，权重 ${dimension.weight}`}>
          <span>{dimension.name}</span>
        </Tooltip>
      ),
      key: `dim-${dimension.dimensionId}`,
      width: 100,
      align: 'center' as const,
      sorter: (a: CandidateSummary, b: CandidateSummary) =>
        (a.scores?.[dimension.dimensionId] ?? -1) - (b.scores?.[dimension.dimensionId] ?? -1),
      render: (_v: unknown, row: CandidateSummary) => {
        const value = row.scores?.[dimension.dimensionId];
        return value === undefined || value === null
          ? <Text type="secondary">—</Text>
          : <span>{value}</span>;
      },
    })),
    {
      title: '加权总分',
      dataIndex: 'totalScore',
      width: 120,
      align: 'center' as const,
      defaultSortOrder: 'descend' as const,
      sorter: (a: CandidateSummary, b: CandidateSummary) => (a.totalScore ?? -1) - (b.totalScore ?? -1),
      render: (value: number | null) => (value === null || value === undefined
        ? <Text type="secondary">—</Text>
        : <Text strong>{value}</Text>),
    },
    {
      title: '推荐意见',
      dataIndex: 'recommendation',
      width: 120,
      render: (value: number) => (value
        ? <Tag color={RECOMMENDATION_COLOR[value]}>{recommendationLabel(value)}</Tag>
        : <Text type="secondary">—</Text>),
    },
    {
      title: '参与面试官',
      key: 'contributors',
      width: 200,
      render: (_v: unknown, row: CandidateSummary) => {
        const contributors = row.contributors ?? [];
        if (contributors.length === 0) return <Text type="secondary">还没有人填写</Text>;
        return (
          <Tooltip title={`本场共绑定 ${row.assignedInterviewerCount} 位面试官`}>
            <Space size={4} wrap>
              {contributors.map((c) => (
                <Tag key={c.userId}>{c.name || `#${c.userId}`}</Tag>
              ))}
            </Space>
          </Tooltip>
        );
      },
    },
    {
      title: '状态',
      key: 'status',
      width: 150,
      align: 'center' as const,
      sorter: (a: CandidateSummary, b: CandidateSummary) => (a.status ?? 0) - (b.status ?? 0),
      render: (_v: unknown, row: CandidateSummary) => {
        if (row.status === EVALUATION_STATUS.SUBMITTED) {
          return (
            <Tooltip title={`${row.submittedByName || `#${row.submittedBy}`} 于 ${fmtDateTime(row.submittedAt)} 定稿`}>
              <Tag color="blue">已定稿</Tag>
            </Tooltip>
          );
        }
        if (row.status === EVALUATION_STATUS.DRAFT) {
          return (
            <Tooltip title={row.lastEditedBy ? `最近由 ${row.lastEditedByName || `#${row.lastEditedBy}`} 修改` : undefined}>
              <Tag>进行中</Tag>
            </Tooltip>
          );
        }
        return <Text type="secondary">未开始</Text>;
      },
    },
  ];

  const expanded = (row: CandidateSummary) => {
    if (!row.comment) {
      return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="本场还没有填写面试记录" />;
    }
    return (
      <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>{row.comment}</Paragraph>
    );
  };

  if (error) {
    return (
      <Alert
        type="info"
        showIcon
        message="暂时看不到评价汇总"
        description={`${error}。评价表开启并有面试官填写评价后，这里才会有数据。`}
        action={<Button size="small" onClick={load}>重试</Button>}
      />
    );
  }

  return (
    <>
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search
          allowClear
          placeholder="搜索姓名 / 部门"
          style={{ width: 240 }}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>刷新</Button>
        <Text type="secondary">评价由协同服务定期回写，最新改动可能有几十秒延迟</Text>
      </Space>

      <Table
        rowKey="scheduleId"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={rows}
        scroll={{ x: 'max-content' }}
        expandable={{ expandedRowRender: expanded }}
        pagination={{ defaultPageSize: 20, showSizeChanger: true, showTotal: (t) => `共 ${t} 人` }}
      />
    </>
  );
};

export default EvaluationSummaryTab;
