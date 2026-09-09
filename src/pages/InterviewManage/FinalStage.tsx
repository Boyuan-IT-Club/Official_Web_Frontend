// 终审舞台：一人一屏的 Hero 面板。渲染选中候选人的全部决策信息，
// 底部部门胶囊单人预录取。数据与动作全部由 PreAdmitTab 注入。
import React from 'react';
import { Button, Tag, Typography } from 'antd';
import type { EvaluationDimension } from '@/api/manage/interviewEvaluation';
import { FinalCandidate, RECOMMENDATION_LABEL, orderedDimensions } from './finalReview';
import './finalStage.scss';

const { Text } = Typography;

export interface FinalStageProps {
  candidate: FinalCandidate;
  rank: number;
  total: number;
  dimensions: EvaluationDimension[];
  depts: Array<{ deptId: number; deptName: string }>;
  onAssign: (deptId: number) => void;
  onRemove: () => void;
  onViewResume: () => void;
}

const FinalStage: React.FC<FinalStageProps> = ({
  candidate: c, rank, total, dimensions, depts, onAssign, onRemove, onViewResume,
}) => {
  const rec = c.recommendation != null ? RECOMMENDATION_LABEL[c.recommendation] : null;
  return (
    <div className="final-stage">
      <div className="fs-grid">
        <div className="fs-main">
          <h1 className="fs-name">{c.name}</h1>
          <p className="fs-meta">
            {c.username ? `${c.username} · ` : ''}
            志愿 <b>{c.firstDeptName ?? '—'}</b>{c.secondDeptName ? ` / ${c.secondDeptName}` : ''}
            {c.evalStatus === 2 && c.submittedByName
              ? ` · 评价已定稿（${c.submittedByName}${c.submittedAt ? ` ${String(c.submittedAt).replace('T', ' ').slice(5, 16)}` : ''}）`
              : c.evalStatus === 1 ? ' · 评价进行中' : ''}
            {' · '}<Button type="link" size="small" style={{ padding: 0 }} onClick={onViewResume}>查看简历 ↗</Button>
          </p>

          {c.scheduleId == null || (!c.scores && !c.comment) ? (
            <div className="fs-empty">
              {c.scheduleId == null
                ? '未参加线下面试（本人选择线上，或未被排上场次）——只有简历分与志愿可供参考。'
                : '面试官还没有填写评价。'}
            </div>
          ) : (
            <>
              {orderedDimensions(dimensions).map((d) => {
                const score = c.scores?.[d.dimensionId];
                const note = c.dimensionNotes?.[d.dimensionId];
                const writer = c.dimensionWriters?.[d.dimensionId]?.name;
                const pct = score != null && d.maxScore > 0 ? Math.min(100, (score / d.maxScore) * 100) : 0;
                return (
                  <div className="fs-dim" key={d.dimensionId}>
                    <span className="fs-dim-name">{d.name}</span>
                    <div className="fs-bar-wrap">
                      <div className="fs-bar"><i style={{ width: `${pct}%` }} /></div>
                      <em className="fs-bar-score">{score != null ? `${score} / ${d.maxScore}` : '—'}</em>
                    </div>
                    <blockquote className="fs-quote">
                      {note || <i>该维度没有评语</i>}
                      {note && writer && <i> —— {writer}</i>}
                    </blockquote>
                  </div>
                );
              })}
              <div className="fs-dim">
                <span className="fs-dim-name">总评</span>
                <div />
                <blockquote className="fs-quote">
                  {c.comment || <i>没有总评</i>}
                  {(c.contributors?.length ?? 0) > 0 && (
                    <i> —— {c.contributors!.map((p) => p.name ?? `#${p.userId}`).join('、')}</i>
                  )}
                </blockquote>
              </div>
            </>
          )}
        </div>

        <aside className="fs-side">
          <div className="fs-big">
            {c.evalTotal != null ? Number(c.evalTotal).toFixed(1) : '—'}
            <small>面试加权总分{c.evalTotal != null ? ` · 全场第 ${rank} / ${total}` : ''}</small>
          </div>
          <div className="fs-kv"><span>简历分</span><b>{c.resumeScore ?? '—'}</b></div>
          <div className="fs-kv"><span>当前结果</span><b>{decisionText(c.decision)}</b></div>
          {rec && <Tag color={rec.color} className="fs-rec">面试官结论 · {rec.text}</Tag>}
        </aside>
      </div>

      <div className="fs-actions">
        <Text type="secondary">预录取到：</Text>
        {depts.map((d, i) => (
          <button
            type="button"
            key={d.deptId}
            className={`fs-dept${c.preDeptId === d.deptId ? ' is-on' : ''}`}
            onClick={() => (c.preDeptId === d.deptId ? onRemove() : onAssign(d.deptId))}
          >
            {d.deptName}<small>{i + 1}</small>
          </button>
        ))}
        {c.preDeptId != null && (
          <Button size="small" danger type="text" onClick={onRemove}>移出名单（0）</Button>
        )}
        <span className="fs-hint">← → 翻人 · 数字键选部门 · 再点高亮部门或按 0 移出 · Esc 退出</span>
      </div>
    </div>
  );
};

function decisionText(d?: number): string {
  if (d === 1) return '已录取';
  if (d === 2) return '未通过';
  if (d === 3) return '待调剂';
  return '待定';
}

export default FinalStage;
