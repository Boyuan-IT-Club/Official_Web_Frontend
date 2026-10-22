// 总览矩阵：候选人 × 全部评分维度的着色表格。
// 评语两级呈现：悬浮分数格看该维度署名评语；点姓名整行展开看全部评语加总评。
import React, { useMemo, useState } from 'react';
import { Button, Popconfirm, Table, Tag, Tooltip, Typography } from 'antd';
import type { EvaluationDimension } from '@/api/manage/interviewEvaluation';
import {
  FinalCandidate, RECOMMENDATION_LABEL, decisionText, heatTier, isConflict, orderedDimensions,
} from './finalReview';
import { isDecided } from './resultBatch';
import PreAdmitPicker from './PreAdmitPicker';
import './finalMatrix.scss';

const { Text } = Typography;

export interface FinalMatrixProps {
  candidates: FinalCandidate[];   // 已按默认序排好
  dimensions: EvaluationDimension[];
  /** 点行进入舞台细看 */
  onOpenStage: (resultId: number) => void;
  /** 就地改预录取部门：扫表时看到合适的直接放进去，不必进舞台 */
  depts: Array<{ deptId: number; deptName: string }>;
  onAssign: (c: FinalCandidate, deptId: number) => Promise<void> | void;
  onRemove: (c: FinalCandidate) => Promise<void> | void;
}

const FinalMatrix: React.FC<FinalMatrixProps> = ({
  candidates, dimensions, onOpenStage, depts, onAssign, onRemove,
}) => {
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
          {/* 线上面试整体排在最后，标记出来免得看着像乱序 */}
          {r.online && <Tag color="purple" style={{ marginLeft: 6 }}>线上</Tag>}
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
    {
      // 预录取只对还没决定的人有意义；已经录取/未通过的人放在这里看得到，免得以为漏了人
      title: '当前结果', width: 88, fixed: 'right' as const,
      render: (_: unknown, r: FinalCandidate) => (isDecided(r.decision)
        ? <Tag color={r.decision === 1 ? 'green' : 'red'}>{decisionText(r.decision)}</Tag>
        : <Text type="secondary">{decisionText(r.decision)}</Text>),
    },
    {
      title: '预录取', dataIndex: 'preDeptName', width: 128, fixed: 'right' as const,
      render: (_: string | null, r: FinalCandidate) => (
        // 点下拉不该连带触发行的双击进舞台
        <span onDoubleClick={(e) => e.stopPropagation()}>
          {isConflict(r)
            ? (
              <>
                <Tooltip title={`已经${decisionText(r.decision)}却还在名单里（${r.preDeptName ?? ''}），转正前要先移出`}>
                  <Tag color="red">冲突</Tag>
                </Tooltip>
                <Popconfirm title="移出预录取名单？" okText="移出" cancelText="取消" onConfirm={() => onRemove(r)}>
                  <Button type="link" size="small" danger style={{ padding: 0 }}>移出</Button>
                </Popconfirm>
              </>
            )
            : (
              <PreAdmitPicker
                deptId={r.preDeptId}
                depts={depts}
                onAssign={(deptId) => onAssign(r, deptId)}
                onRemove={() => onRemove(r)}
                disabled={isDecided(r.decision)}
                disabledReason={`已经${decisionText(r.decision)}，不能再预录取；如需改动请到「录取结果」更正`}
              />
            )}
        </span>
      ),
    },
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
