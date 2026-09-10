// 评价总览：全周期评价进度 + 分数分布。数据来自评价汇总与全周期名册，
// 前端聚合（evalStage.aggregateOverview）。入口：评价表页与评价舞台顶栏。
import React, { useEffect, useState } from 'react';
import { Alert, Card, Drawer, Spin, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { getEvaluationSummary } from '@/api/manage/interviewEvaluation';
import { listSchedulesRoster } from '@/api/manage/interviewAdmin';
import { EvalOverviewData, aggregateOverview } from './evalStage';
import './evalOverview.scss';

const { Text } = Typography;

const EvalOverview: React.FC<{ cycleId: number; open: boolean; onClose: () => void }> = ({ cycleId, open, onClose }) => {
  const navigate = useNavigate();
  const [data, setData] = useState<EvalOverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setData(null);
    setError(null);
    Promise.all([
      getEvaluationSummary(cycleId),
      listSchedulesRoster(cycleId).catch(() => null),
    ]).then(([sum, roster]: any[]) => {
      if (cancelled) return;
      setData(aggregateOverview(
        (roster?.data ?? []).map((r: any) => ({
          scheduleId: r.scheduleId, name: r.name || r.username,
          interviewTime: r.interviewTime, sessionId: r.sessionId, deptName: r.deptName,
        })),
        sum?.data?.candidates ?? [],
        sum?.data?.dimensions ?? [],
        new Date(),
      ));
    }).catch((e: any) => { if (!cancelled) setError(e?.message || '加载失败'); });
    return () => { cancelled = true; };
  }, [open, cycleId]);

  return (
    <Drawer open={open} onClose={onClose} width={620} title="评价总览" zIndex={1200}>
      {error && <Alert type="error" showIcon message={error} />}
      {!data && !error && <Spin style={{ display: 'block', margin: '48px auto' }} />}
      {data && (
        <div className="eval-overview">
          <Card size="small" title="评价进度" className="ov-card">
            <div className="ov-nums">
              <div className="ov-num good"><b>{data.finalized}</b><span>已定稿</span></div>
              <div className="ov-num"><b>{data.inProgress}</b><span>进行中</span></div>
              <div className="ov-num warn"><b>{data.missing.length}</b><span>面完未评</span></div>
              <div className="ov-num muted"><b>{data.notStarted}</b><span>待面试</span></div>
            </div>
            {data.perSession.map((s) => (
              <div className="ov-row" key={s.label}>
                <span className="ov-label">{s.label}</span>
                <div className="ov-track">
                  <i style={{ width: `${(s.done / Math.max(1, s.total)) * 100}%` }} />
                  <em style={{ left: `${(s.done / Math.max(1, s.total)) * 100}%`, width: `${(s.inProgress / Math.max(1, s.total)) * 100}%` }} />
                </div>
                <span className="ov-pct">{s.done}/{s.total}</span>
              </div>
            ))}
            {data.missing.length > 0 && (
              <Alert
                type="warning"
                showIcon
                style={{ marginTop: 10 }}
                message={`缺评 ${data.missing.length} 人（面试时间已过，一个分都没有）`}
                description={data.missing.map((m) => (
                  <div key={m.scheduleId}>
                    <a onClick={() => { onClose(); navigate(`/evaluation/${cycleId}/${m.scheduleId}?stage=1`); }}>
                      {m.name}
                    </a>
                    {m.interviewTime ? ` · ${String(m.interviewTime).replace('T', ' ').slice(5, 16)} 面试` : ''}
                  </div>
                ))}
              />
            )}
          </Card>

          <Card size="small" title="分数分布（已有评分的候选人）" className="ov-card">
            {data.dimAverages.map((d) => (
              <div className="ov-row" key={d.name}>
                <span className="ov-label">{d.name}</span>
                <div className="ov-track"><i style={{ width: `${(d.avg / Math.max(1, d.maxScore)) * 100}%` }} /></div>
                <span className="ov-pct">均 {d.avg.toFixed(1)}/{d.maxScore}</span>
              </div>
            ))}
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 10 }}>加权总分分布</Text>
            <div className="ov-hist">
              {data.histogram.bins.map((b, i) => {
                const max = Math.max(1, ...data.histogram.bins);
                return <i key={i} className={b === max && b > 0 ? 'hi' : ''} style={{ height: `${(b / max) * 100}%` }} title={`${b} 人`} />;
              })}
            </div>
            <div className="ov-hx">{data.histogram.labels.map((l, i) => <span key={i}>{l}</span>)}</div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
              数据来自物化结果，最新改动可能有约 30 秒延迟。
            </Text>
          </Card>
        </div>
      )}
    </Drawer>
  );
};

export default EvalOverview;
