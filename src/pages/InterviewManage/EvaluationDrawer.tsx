// 单人评价抽屉：在「结果与通知」里就地看完这个人的全部面试评价，
// 不用切去「评价汇总」再肉眼对行。数据就是评价汇总接口那份
// CandidateSummary，此组件只负责展开呈现。
import React from 'react';
import { Descriptions, Drawer, Empty, Table, Tag, Typography } from 'antd';
import type { CandidateSummary, EvaluationDimension } from '@/api/manage/interviewEvaluation';

const { Paragraph, Text } = Typography;

const REC: Record<number, { color: string; text: string }> = {
  1: { color: 'green', text: '倾向通过' },
  2: { color: 'orange', text: '待定' },
  3: { color: 'red', text: '不倾向' },
};

export interface EvaluationDrawerProps {
  open: boolean;
  onClose: () => void;
  candidateName?: string;
  summary?: CandidateSummary | null;
  dimensions: EvaluationDimension[];
}

const EvaluationDrawer: React.FC<EvaluationDrawerProps> = ({
  open, onClose, candidateName, summary, dimensions,
}) => (
  <Drawer
    open={open}
    onClose={onClose}
    width={560}
    title={`面试评价 · ${candidateName ?? summary?.candidateName ?? ''}`}
  >
    {!summary ? (
      <Empty description="这位同学还没有面试评价（未面试，或面试官还没填写）" />
    ) : (
      <>
        <Descriptions column={2} size="small" style={{ marginBottom: 16 }}>
          <Descriptions.Item label="加权总分">
            <Text strong style={{ fontSize: 18 }}>{summary.totalScore ?? '—'}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="共同结论">
            {summary.recommendation != null
              ? <Tag color={REC[summary.recommendation]?.color}>{REC[summary.recommendation]?.text}</Tag>
              : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            {summary.status === 2 ? <Tag color="green">已定稿</Tag> : <Tag color="orange">进行中</Tag>}
          </Descriptions.Item>
          <Descriptions.Item label="面试部门">{summary.deptName ?? '—'}</Descriptions.Item>
          {summary.submittedByName && (
            <Descriptions.Item label="定稿人" span={2}>
              {summary.submittedByName}
              {summary.submittedAt ? ` · ${String(summary.submittedAt).replace('T', ' ').slice(0, 16)}` : ''}
            </Descriptions.Item>
          )}
        </Descriptions>

        <Table
          size="small"
          rowKey={(d: EvaluationDimension) => d.dimensionId}
          pagination={false}
          dataSource={dimensions}
          style={{ marginBottom: 16 }}
          columns={[
            { title: '维度', dataIndex: 'name', width: 110 },
            {
              title: '得分', width: 90, align: 'right' as const,
              render: (_: unknown, d: EvaluationDimension) => {
                const v = summary.scores?.[d.dimensionId];
                return v == null
                  ? <Text type="secondary">—</Text>
                  : <span>{v} <Text type="secondary">/ {d.maxScore}</Text></span>;
              },
            },
            {
              // 评价的主要内容在各维度评语里，署名来自协同表格的单元格级记录
              title: '评语（署名）',
              render: (_: unknown, d: EvaluationDimension) => {
                const note = summary.dimensionNotes?.[d.dimensionId];
                const writer = summary.dimensionWriters?.[d.dimensionId]?.name;
                if (!note) return <Text type="secondary">—</Text>;
                return (
                  <>
                    <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{note}</Paragraph>
                    {writer && <Text type="secondary" style={{ fontSize: 12 }}>—— {writer}</Text>}
                  </>
                );
              },
            },
          ]}
        />

        {summary.comment && (
          <>
            <Text strong>面试记录与总评</Text>
            <Paragraph style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>{summary.comment}</Paragraph>
          </>
        )}

        <Text strong>参与面试官</Text>
        <div style={{ marginTop: 6 }}>
          {(summary.contributors ?? []).length === 0
            ? <Text type="secondary">—</Text>
            : summary.contributors.map((c: any) => (
              <Tag key={c.userId}>{c.name ?? `#${c.userId}`}</Tag>
            ))}
        </div>
      </>
    )}
  </Drawer>
);

export default EvaluationDrawer;
