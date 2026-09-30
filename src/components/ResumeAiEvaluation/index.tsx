import React, { useEffect, useState } from 'react';
import {
  Alert, Button, Card, Collapse, Drawer, Empty, Skeleton, Space, Tabs, Tag, Typography, message,
} from 'antd';
import { BookOutlined, CheckOutlined, RobotOutlined } from '@ant-design/icons';
import {
  AiGrade, AiGrades, DeptMatch, ItemVerdict, ScorecardDetail, ScorecardRow, TransferHint,
  getEvaluationQbank, getEvaluationScorecard, pickQuestions,
} from '@/api/manage/evaluationApis';
import './index.scss';

const { Paragraph, Text } = Typography;

const ATTITUDE_TEXT: Record<string, string> = {
  sincere: '态度端正',
  perfunctory: '态度较敷衍',
  bad_faith: '态度存在明显问题',
};

const GRADE_COLOR: Record<AiGrade, string> = {
  优秀: 'success',
  良好: 'processing',
  一般: 'default',
};

const transferText = (hint: TransferHint) =>
  `建议调剂:${hint.dept}${hint.is_second_choice ? '(第二志愿)' : ''}`;

type GradeTagsProps = {
  grades: AiGrades & Pick<ScorecardRow, 'hard_zero'> & { transfer_hint?: TransferHint | null };
};

/** 两维等级标签:部门匹配度 + 认真程度;另标重点复核/调剂建议/旧版结果。 */
export const AiGradeTags: React.FC<GradeTagsProps> = ({ grades }) => {
  if (grades.needs_rerun) {
    return <Tag color="warning">旧版初筛结果,请重新初筛</Tag>;
  }
  return (
    <Space size={4} wrap>
      {grades.hard_zero && <Tag color="error">需重点复核</Tag>}
      {grades.match_level ? (
        <Tag color={GRADE_COLOR[grades.match_level]}>部门匹配 {grades.match_level}</Tag>
      ) : (
        <Tag>部门匹配 未填志愿</Tag>
      )}
      {grades.effort_level && (
        <Tag color={GRADE_COLOR[grades.effort_level]}>认真程度 {grades.effort_level}</Tag>
      )}
      {grades.transfer_hint && <Tag color="purple">{transferText(grades.transfer_hint)}</Tag>}
    </Space>
  );
};

const gradeBasisText = (grades: AiGrades): string | null => {
  if (grades.grade_basis === 'pool') {
    return `等级为与同报「${grades.pool}」的 ${grades.pool_size} 名候选人相比的相对位置`;
  }
  if (grades.grade_basis === 'anchor') {
    return `同报「${grades.pool}」的候选人不足 15 名,等级按绝对标准给出`;
  }
  return null;
};

const ItemList: React.FC<{ items: ItemVerdict[] }> = ({ items }) => (
  <div className="resume-ai-summary__dimensions">
    {items.map((it) => (
      <div key={it.item} className="resume-ai-summary__dimension">
        <Space>
          <Text strong>{it.item}</Text>
          <Tag color={it.met ? 'green' : 'default'}>{it.met ? '达成' : '未达成'}</Tag>
        </Space>
        <Paragraph style={{ marginBottom: 4 }}>{it.reason}</Paragraph>
        {it.quote ? <Text type="secondary" italic>依据:「{it.quote}」</Text> : null}
      </div>
    ))}
  </div>
);

/** 维卡正文:整体理由、面试提示、两张清单(志愿部门在前,其余部门折叠)。 */
export const AiScorecardBody: React.FC<{ detail: ScorecardDetail }> = ({ detail }) => {
  const card = detail.card ?? ({} as ScorecardDetail['card']);
  const first = card.intended?.first ?? null;
  const match: DeptMatch[] = card.match ?? [];
  const firstMatch = match.find((m) => m.dept === first);
  const otherMatch = match.filter((m) => m.dept !== first);
  const basis = gradeBasisText(detail);
  const hints = card.interview_hints ?? [];

  const sections = [
    firstMatch && {
      key: 'match',
      label: `志愿部门(${firstMatch.dept})匹配清单:达成 ${firstMatch.items.filter((i) => i.met).length}/${firstMatch.items.length} 项`,
      children: <ItemList items={firstMatch.items} />,
    },
    card.effort && {
      key: 'effort',
      label: `认真程度清单:达成 ${card.effort.items.filter((i) => i.met).length}/${card.effort.items.length} 项`,
      children: <ItemList items={card.effort.items} />,
    },
    otherMatch.length > 0 && {
      key: 'others',
      label: '其他部门匹配情况(调剂参考)',
      children: (
        <Collapse
          ghost
          size="small"
          items={otherMatch.map((m) => ({
            key: m.dept,
            label: `${m.dept}:达成 ${m.items.filter((i) => i.met).length}/${m.items.length} 项`,
            children: <ItemList items={m.items} />,
          }))}
        />
      ),
    },
    card.traits && card.traits.length > 0 && {
      key: 'legacy',
      label: '旧版特质判定',
      children: (
        <ItemList
          items={card.traits.map((t) => ({ item: t.trait, met: t.met, quote: t.quote, reason: t.reason }))}
        />
      ),
    },
  ].filter(Boolean) as { key: string; label: string; children: React.ReactNode }[];

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <AiGradeTags grades={{ ...detail, transfer_hint: card.transfer_hint }} />
      {basis && <Text type="secondary">{basis}</Text>}
      {card.summary && <Paragraph style={{ marginBottom: 0 }}>{card.summary}</Paragraph>}
      {hints.length > 0 && (
        <Alert
          type="warning"
          showIcon
          message="面试提示"
          description={<ul style={{ margin: 0, paddingLeft: 18 }}>{hints.map((h) => <li key={h}>{h}</li>)}</ul>}
        />
      )}
      {sections.length > 0 && <Collapse ghost items={sections} />}
      {card.attitude && (
        <Alert
          type="info"
          message={`表达态度：${ATTITUDE_TEXT[card.attitude.verdict] ?? card.attitude.verdict ?? '未判断'}`}
          description={card.attitude.reason}
        />
      )}
    </Space>
  );
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (!open || !resumeId || !cycleId) return;
    let cancelled = false;
    setQbank(null);
    setLoadError(null);
    setGenerating(false);
    setLoading(true);
    getEvaluationQbank(resumeId, cycleId)
      .then((res: any) => {
        if (cancelled) return;
        // 后端对进行中的初筛返回 200 + generating:出题不是错,给等待态
        if (res?.data?.generating) { setGenerating(true); return; }
        setQbank(res?.data ?? null);
      })
      .catch((e: any) => {
        // 后端 404 detail 区分"尚未跑过初筛 / 生成失败(+真实原因)"——
        // 渲染进抽屉而非只弹 toast:失败要可见、可行动,不能伪装成没数据
        const msg = e?.message || '该候选人暂无 AI 预设题库';
        setLoadError(msg);
        message.error(msg);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, resumeId, cycleId, refreshTick]);

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
      // 闸门5(评审):优先用 Agent qbank.pickable 的权威题引用(含链问题
      // chain_index/layer_index 定位);缺失时回退本地规范化字段。
      const ref =
        (qbank?.pickable ?? []).find((p: any) => p.question === question.question) ??
        null;
      await pickQuestions({
        resume_id: resumeId,
        cycle_id: cycleId,
        schedule_id: scheduleId,
        questions: [
          ref ?? {
            category: question.anchor,
            question: question.question,
            evidence_path: question.evidence?.path,
          },
        ],
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
      {loading ? <Skeleton active paragraph={{ rows: 8 }} /> : generating ? (
        <Empty description="AI 正在为该候选人生成预置题库,通常需要一到两分钟">
          <Button type="primary" size="small" onClick={() => setRefreshTick((t) => t + 1)}>
            刷新查看
          </Button>
        </Empty>
      ) : loadError ? (
        <Alert
          type="warning"
          showIcon
          message="预置题库未生成"
          description={loadError}
        />
      ) : groupTabs.reduce((n: number, t: any) => n + t.questions.length, 0) === 0 ? (
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
    // 没有初筛结果时不占卡片位,只留一行浅灰小字
    return (
      <Text type="secondary" className="resume-ai-summary--empty">
        <RobotOutlined /> 暂无 AI 初筛结果
      </Text>
    );
  }

  return (
    <>
      <Card
        className="resume-ai-summary"
        title={<Space><RobotOutlined />AI 初筛参考</Space>}
        extra={<Button icon={<BookOutlined />} onClick={() => setQbankOpen(true)}>预设题库</Button>}
      >
        <AiScorecardBody detail={detail} />
        <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>AI 标注,仅供参考,终审以人工为准</Text>
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
