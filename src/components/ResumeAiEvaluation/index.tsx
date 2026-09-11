import React, { useEffect, useState } from 'react';
import {
  Alert, Button, Card, Collapse, Drawer, Empty, Skeleton, Space, Tabs, Tag, Typography, message,
} from 'antd';
import { BookOutlined, CheckOutlined, RobotOutlined } from '@ant-design/icons';
import {
  ScorecardDetail, getEvaluationQbank, getEvaluationScorecard, pickQuestions,
} from '@/api/manage/evaluationApis';
import './index.scss';

const { Paragraph, Text } = Typography;

const ATTITUDE_TEXT: Record<string, string> = {
  sincere: '态度端正',
  perfunctory: '态度较敷衍',
  bad_faith: '态度存在明显问题',
};

export const aiRecommendation = (detail: Pick<ScorecardDetail, 'hard_zero' | 'total'>) => {
  if (detail.hard_zero) return { color: 'error', text: '建议重点复核' };
  if (detail.total == null) return { color: 'default', text: '暂无建议' };
  if (detail.total >= 85) return { color: 'success', text: '建议优先进入面试' };
  if (detail.total >= 60) return { color: 'processing', text: '建议进入人工复核' };
  return { color: 'warning', text: '建议谨慎复核' };
};

type QbankDrawerProps = {
  open: boolean;
  onClose: () => void;
  resumeId?: number | null;
  cycleId?: number | null;
  scheduleId?: number;
};

export const EvaluationQbankDrawer: React.FC<QbankDrawerProps> = ({
  open, onClose, resumeId, cycleId, scheduleId,
}) => {
  const [qbank, setQbank] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !resumeId || !cycleId) return;
    let cancelled = false;
    setQbank(null);
    setLoading(true);
    getEvaluationQbank(resumeId, cycleId)
      .then((res: any) => { if (!cancelled) setQbank(res?.data ?? null); })
      .catch((e: any) => { if (!cancelled) message.error(e?.message || '该候选人暂无 AI 预设题库'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, resumeId, cycleId]);

  const groups: { group: string; mode?: string; questions?: any[] }[] = qbank?.envelope?.groups ?? [];
  const groupLabels: Record<string, string> = {
    repo: '仓库深挖',
    autograding: '评测错因',
    awards: '奖项追问',
    base_and_skills: '基础与技能',
  };

  // #153/用户反馈:按组分 Tab——repo 组每个仓一个 Tab(v2 信封带 owner/repo/
  // attribution),旧形状组各一个 Tab
  const groupTabs = groups.map((group: any, gi: number) => {
    const kind = String(group.group ?? '');
    const v2 = group.qbank_v2;
    const inner = v2?.group ?? null;
    const qs: any[] = [];
    if (inner) {
      if (inner.entry)
        qs.push({
          anchor: `入口·${(inner.entry.category ?? '').replace(/^C\d+_/, '')}`,
          question: inner.entry.question,
          evidence: { path: inner.entry.evidence?.path ?? '' },
          time_minutes: inner.entry.time_minutes ?? 3,
          answer_reference: inner.entry.answer_reference ?? null,
        });
      for (const [ci, chain] of (inner.chains ?? []).entries())
        for (const [li, layer] of (chain.layers ?? []).entries())
          qs.push({
            anchor: `链${ci + 1}·L${li + 1}·${(chain.category ?? '').replace(/^C\d+_/, '')}`,
            question: layer.question,
            evidence: { path: '' },
            time_minutes: 3,
            sub_prompts: layer.expected_signal ? [`过关信号:${layer.expected_signal}`] : [],
          });
      for (const r of inner.reserves ?? [])
        qs.push({
          anchor: `备选·${(r.category ?? '').replace(/^C\d+_/, '')}`,
          question: r.question,
          evidence: { path: r.evidence?.path ?? '' },
          time_minutes: r.time_minutes ?? 3,
          answer_reference: r.answer_reference ?? null,
        });
    } else {
      for (const q of group.questions ?? [])
        qs.push({ anchor: q.anchor ?? '', question: q.question, evidence: { path: q.evidence?.path ?? '' }, time_minutes: q.time_minutes ?? 3, answer_reference: q.answer_reference ?? null, sub_prompts: q.sub_prompts });
    }
    const kindLabel = groupLabels[kind] ?? kind;
    let label = kindLabel;
    if (kind === 'repo' && (group.owner || group.repo)) {
      label = group.repo ? group.repo : `${group.owner}/…`;
    }
    return {
      key: String(gi),
      label: (
        <span>
          {label}
          {v2?.degraded ? <Tag color="orange">降级</Tag> : null}
          {v2?.attribution && v2.attribution !== 'none' ? (
            <Tag color={v2.attribution === 'trusted-own' ? 'green' : v2.attribution === 'trusted-contribution' ? 'cyan' : 'orange'}>
              {v2.attribution}
            </Tag>
          ) : null}
        </span>
      ),
      questions: qs,
      repoSummary: inner ? v2.repo_summary ?? '' : '',
      isRepo: inner != null,
    };
  });

  const pick = async (question: any) => {
    if (!resumeId || !cycleId) return;
    try {
      await pickQuestions({
        resume_id: resumeId,
        cycle_id: cycleId,
        schedule_id: scheduleId,
        questions: [{
          anchor: question.anchor,
          question: question.question,
          evidence_path: question.evidence?.path,
        }],
      });
      message.success('已加入本次面试的选题记录');
    } catch (e: any) {
      message.error(e?.message || '选题失败');
    }
  };

  return (
    <Drawer
      title={<Space><BookOutlined />AI 预设题库{resumeId ? ` · 简历 #${resumeId}` : ''}</Space>}
      open={open}
      onClose={onClose}
      width={560}
      destroyOnClose
    >
      {loading ? <Skeleton active paragraph={{ rows: 8 }} /> : groupTabs.reduce((n: number, t: any) => n + t.questions.length, 0) === 0 ? (
        <Empty description={qbank ? '暂无预设题，可能因候选人证据不足而跳过生成' : '暂无题库'} />
      ) : (
        <Tabs
          items={groupTabs.map((tab: any) => ({
            key: tab.key,
            label: tab.label,
            children: (
              <>
                {tab.isRepo && tab.repoSummary ? (
                  <Paragraph type="secondary" style={{ marginTop: 0 }}>{tab.repoSummary}</Paragraph>
                ) : null}
                {tab.questions.length === 0 ? (
                  <Empty description="该组无题目" />
                ) : tab.questions.map(({ anchor, question, evidence, time_minutes, answer_reference, sub_prompts }: any, index: number) => (
                  <Card key={`${tab.key}-${index}`} size="small" className="ai-qbank-question">
                    <Space wrap size={4}>
                      <Tag color="purple">{anchor}</Tag>
                      {evidence?.path && <Tag>{evidence.path}</Tag>}
                      <Text type="secondary">约 {time_minutes ?? 3} 分钟</Text>
                    </Space>
                    <Paragraph strong>{question}</Paragraph>
                    {sub_prompts?.length > 0 && (
                      <ul>{sub_prompts.map((item: string) => <li key={item}>{item}</li>)}</ul>
                    )}
                    {answer_reference && (
                      <Collapse ghost size="small" items={[{
                        key: 'reference',
                        label: '查看回答判断参考',
                        children: (
                          <Space direction="vertical" size={4}>
                            <Text><Text strong>优秀：</Text>{answer_reference.strong}</Text>
                            <Text><Text strong>达标：</Text>{answer_reference.acceptable}</Text>
                            <Text><Text strong>较弱：</Text>{answer_reference.weak}</Text>
                          </Space>
                        ),
                      }]} />
                    )}
                    <Button size="small" icon={<CheckOutlined />} onClick={() => pick({ anchor, question, evidence, answer_reference, sub_prompts })}>选用此题</Button>
                  </Card>
                ))}
              </>
            ),
          }))}
        />
      )}
    </Drawer>
  );
};

type ResumeAiSummaryProps = {
  resumeId: number;
  cycleId?: number | null;
};

export const ResumeAiSummary: React.FC<ResumeAiSummaryProps> = ({ resumeId, cycleId }) => {
  const [detail, setDetail] = useState<ScorecardDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [qbankOpen, setQbankOpen] = useState(false);

  useEffect(() => {
    if (!cycleId) return;
    let cancelled = false;
    setLoading(true);
    setDetail(null);
    getEvaluationScorecard(resumeId, cycleId)
      .then((res: any) => { if (!cancelled) setDetail(res?.data ?? null); })
      .catch(() => { if (!cancelled) setDetail(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [resumeId, cycleId]);

  if (!cycleId) return null;
  if (loading) return <Card className="resume-ai-summary"><Skeleton active paragraph={{ rows: 2 }} /></Card>;
  if (!detail) {
    return <Alert className="resume-ai-summary" type="info" showIcon message="这份简历还没有 AI 初筛结果" />;
  }

  const recommendation = aiRecommendation(detail);
  return (
    <>
      <Card
        className="resume-ai-summary"
        title={<Space><RobotOutlined />AI 初筛参考<Tag color={recommendation.color}>{recommendation.text}</Tag></Space>}
        extra={<Button icon={<BookOutlined />} onClick={() => setQbankOpen(true)}>预设题库</Button>}
      >
        <Space wrap className="resume-ai-summary__headline">
          <span className="resume-ai-summary__score">{detail.total ?? '—'}<small>/ 100</small></span>
          {detail.hard_zero && <Tag color="red">命中重点复核项</Tag>}
          <Text type="secondary">AI 结果仅作为人工判断参考</Text>
        </Space>
        <Collapse
          ghost
          items={[{
            key: 'reasoning',
            label: `查看 AI 理由与 ${detail.card?.dimensions?.length ?? 0} 项维度评分`,
            children: (
              <div className="resume-ai-summary__dimensions">
                {(detail.card?.dimensions ?? []).map((dimension) => (
                  <div key={dimension.field_key} className="resume-ai-summary__dimension">
                    <Space><Text strong>{dimension.field_key}</Text><Tag color="blue">{dimension.score} 分</Tag></Space>
                    <Paragraph>{dimension.rationale}</Paragraph>
                    <Text type="secondary">简历依据：{dimension.evidence || '未提供'}</Text>
                  </div>
                ))}
                {detail.card?.attitude && (
                  <Alert
                    type="info"
                    message={`表达态度：${ATTITUDE_TEXT[detail.card.attitude.verdict] ?? detail.card.attitude.verdict ?? '未判断'}`}
                    description={detail.card.attitude.reason}
                  />
                )}
              </div>
            ),
          }]}
        />
      </Card>
      <EvaluationQbankDrawer
        open={qbankOpen}
        onClose={() => setQbankOpen(false)}
        resumeId={resumeId}
        cycleId={cycleId}
      />
    </>
  );
};
