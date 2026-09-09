// 总览矩阵：候选人 × 全部评分维度的着色表格。
// 评语两级呈现：悬浮分数格看该维度署名评语；点姓名整行展开看全部评语加总评。
import React, { useMemo, useState } from 'react';
import { Table, Tag, Tooltip, Typography } from 'antd';
import type { EvaluationDimension } from '@/api/manage/interviewEvaluation';
import { FinalCandidate, RECOMMENDATION_LABEL, heatTier, orderedDimensions } from './finalReview';
import './finalMatrix.scss';

const { Text } = Typography;

export interface FinalMatrixProps {
  candidates: FinalCandidate[];   // 已按默认序排好
  dimensions: EvaluationDimension[];
  /** 点行进入舞台细看 */
  onOpenStage: (resultId: number) => void;
}

const FinalMatrix: React.FC<FinalMatrixProps> = ({ candidates, dimensions, onOpenStage }) => {
  const dims = orderedDimensions(dimensions);
  const [expanded, setExpanded] = useState<number[]>([]);

  // 每维度一列的着色需要整列数值
  const colValues = useMemo(() => {
    const m = new Map<number, Array<number | null | undefined>>();
    dims.forEach((d) => m.set(d.dimensionId, candidates.map((c) => c.scores?.[d.dimensionId])));
    m.set(-1, candidates.map((c) => c.evalTotal));
    return m;
  }, [candidates, dims]);

  const columns: any[] = [
    { title: '#', width: 46, render: (_: unknown, __: FinalCandidate, i: number) => i + 1 },
    {
      title: '姓名（点击展开评语）', dataIndex: 'name', width: 150, fixed: 'left' as const,
      render: (v: string, r: FinalCandidate) => (
        <a onClick={(e) => { e.stopPropagation();
          setExpanded((prev) => (prev.includes(r.resultId) ? prev.filter((x) => x !== r.resultId) : [...prev, r.resultId])); }}>
          {v} {expanded.includes(r.resultId) ? '▴' : '▾'}
        </a>
      ),
    },
    { title: '志愿', width: 120,
      render: (_: unknown, r: FinalCandidate) => (r.firstDeptName
        ? `${r.firstDeptName}${r.secondDeptName ? ` / ${r.secondDeptName}` : ''}` : '—') },
    ...dims.map((d) => ({
      title: `${d.name}/${d.maxScore}`,
      width: 96,
      align: 'center' as const,
      sorter: (a: FinalCandidate, b: FinalCandidate) =>
        (a.scores?.[d.dimensionId] ?? -1) - (b.scores?.[d.dimensionId] ?? -1),
      render: (_: unknown, r: FinalCandidate) => {
        const v = r.scores?.[d.dimensionId];
        const tier = heatTier(v, colValues.get(d.dimensionId) ?? []);
        const note = r.dimensionNotes?.[d.dimensionId];
        const writer = r.dimensionWriters?.[d.dimensionId]?.name;
        const cell = <span className={`fm-cell fm-h${tier}`}>{v ?? '—'}</span>;
        return note
          ? <Tooltip title={<span>{note}{writer ? ` —— ${writer}` : ''}</span>}>{cell}</Tooltip>
          : cell;
      },
    })),
    { title: '总分', width: 84, align: 'center' as const, defaultSortOrder: 'descend' as const,
      sorter: (a: FinalCandidate, b: FinalCandidate) => (a.evalTotal ?? -1) - (b.evalTotal ?? -1),
      render: (_: unknown, r: FinalCandidate) => (
        <span className={`fm-cell fm-h${heatTier(r.evalTotal, colValues.get(-1) ?? [])}`}>
          <b>{r.evalTotal != null ? Number(r.evalTotal).toFixed(1) : '—'}</b>
        </span>) },
    { title: '简历分', dataIndex: 'resumeScore', width: 80, align: 'center' as const,
      sorter: (a: FinalCandidate, b: FinalCandidate) => (a.resumeScore ?? -1) - (b.resumeScore ?? -1),
      render: (v: number | null) => v ?? '—' },
    { title: '结论', width: 96,
      render: (_: unknown, r: FinalCandidate) => {
        const rec = r.recommendation != null ? RECOMMENDATION_LABEL[r.recommendation] : null;
        return rec ? <Tag color={rec.color}>{rec.text}</Tag> : '—';
      } },
    { title: '预录取', dataIndex: 'preDeptName', width: 96,
      render: (v: string | null) => (v ? <Tag color="blue">{v}</Tag> : '—') },
  ];

  return (
    <Table
      className="final-matrix"
      rowKey="resultId"
      size="small"
      dataSource={candidates}
      columns={columns}
      pagination={false}
      scroll={{ x: 'max-content' }}
      onRow={(r) => ({ onDoubleClick: () => onOpenStage(r.resultId) })}
      expandable={{
        expandedRowKeys: expanded,
        showExpandColumn: false,
        expandedRowRender: (r: FinalCandidate) => (
          <div className="fm-expand">
            {orderedDimensions(dimensions).map((d) => {
              const note = r.dimensionNotes?.[d.dimensionId];
              const writer = r.dimensionWriters?.[d.dimensionId]?.name;
              return (
                <p key={d.dimensionId}>
                  <b>{d.name}</b>：{note ? <>{note}{writer && <Text type="secondary">（{writer}）</Text>}</> : <Text type="secondary">无评语</Text>}
                </p>
              );
            })}
            <p><b>总评</b>：{r.comment || <Text type="secondary">无</Text>}
              {(r.contributors?.length ?? 0) > 0 && (
                <Text type="secondary">（{r.contributors!.map((p) => p.name ?? `#${p.userId}`).join('、')}）</Text>
              )}
            </p>
            <Text type="secondary" style={{ fontSize: 12 }}>双击任意行进入舞台细看</Text>
          </div>
        ),
      }}
    />
  );
};

export default FinalMatrix;
