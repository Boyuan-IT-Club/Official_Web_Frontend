import React from 'react';
import { Alert, Space, Tag, Tooltip, Typography } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import type { ScorecardPanel, ScorecardRow } from '@/api/manage/evaluationApis';

const { Text } = Typography;

/**
 * 评分卡的合议信息(card.panel):AI 对这张卡有多大把握、批判者质疑了什么、
 * 哪些判定被程序作废。它们是评审核对 AI 判断的证据,不是分数。
 *
 * 只有「带批判者」模式的卡才有这个块;单评委模式的卡与旧卡没有——没有就什么都不渲染。
 */

const CONFIDENCE_TEXT: Record<string, string> = { low: '低', medium: '中', high: '高' };
const CONFIDENCE_COLOR: Record<string, string> = { low: 'warning', medium: 'default', high: 'success' };
const CONFIDENCE_NOTE: Record<string, string> = {
  low: 'AI 对这张卡把握不大,建议逐项对照原文核对',
  medium: '评委与批判者有过分歧,或评委在答辩后改过判',
};

const DISPUTE_KIND_TEXT: Record<string, string> = {
  quote_not_supporting: '引文撑不住结论',
  missed_evidence: '可能漏判',
};
const JUDGE_DECISION_TEXT: Record<string, string> = {
  upheld: '评委维持原判',
  no_response: '评委没有完成答辩',
};

const isPanel = (panel: unknown): panel is ScorecardPanel =>
  typeof panel === 'object' && panel !== null;
const list = <T,>(v: T[] | undefined | null): T[] => (Array.isArray(v) ? v : []);
const where = (x: { checklist?: string; item?: string }) =>
  [x.checklist, x.item].filter(Boolean).join(' · ') || '未注明条目';

export interface PanelSignals {
  /** low / medium / high;没有置信度(没有 panel,或取值不认识)为 null */
  confidence: 'low' | 'medium' | 'high' | null;
  injection: boolean;
  disputes: number;
}

/** 从 panel 里提出最要紧的几个信号;panel 不存在时全是「没有」 */
export function panelSignals(panel: unknown): PanelSignals {
  if (!isPanel(panel)) return { confidence: null, injection: false, disputes: 0 };
  const c = panel.confidence;
  return {
    confidence: c === 'low' || c === 'medium' || c === 'high' ? c : null,
    injection: panel.injection?.detected === true,
    disputes: list(panel.disputes).length,
  };
}

/** 收起状态下的两个小标签:置信度低、疑似提示注入。没有这些情况就不占位 */
export const PanelTags: React.FC<{ panel?: unknown }> = ({ panel }) => {
  const { confidence, injection } = panelSignals(panel);
  if (confidence !== 'low' && !injection) return null;
  return (
    <Space size={4} wrap>
      {confidence === 'low' && <Tag color="warning">AI 置信度低</Tag>}
      {injection && <Tag color="error" icon={<WarningOutlined />}>疑似提示注入</Tag>}
    </Space>
  );
};

/**
 * 评审队列行上的同两个信号(简历列表的卡片用)。队列行没有 panel,只有投影出来的
 * confidence / dispute_count / injection_detected;旧版 Agent 不返回它们,那就什么都不显示。
 */
export const QueueSignalTags: React.FC<{
  card?: Pick<ScorecardRow, 'confidence' | 'dispute_count' | 'injection_detected'> | null;
}> = ({ card }) => {
  const lowConfidence = card?.confidence === 'low';
  const injection = card?.injection_detected === true;
  if (!lowConfidence && !injection) return null;
  const disputes = typeof card?.dispute_count === 'number' ? card.dispute_count : 0;
  return (
    <>
      {lowConfidence && (
        <Tooltip
          title={disputes > 0
            ? `AI 对这份简历的判断把握不大(批判者有 ${disputes} 处异议未被采纳),建议细看`
            : 'AI 对这份简历的判断把握不大,建议细看'}
        >
          <Tag color="warning">AI 置信度低</Tag>
        </Tooltip>
      )}
      {injection && (
        <Tooltip title="简历里有疑似写给 AI 的指令,引用到它的判定已作废;详情里可以看到片段">
          <Tag color="error">疑似提示注入</Tag>
        </Tooltip>
      )}
    </>
  );
};

export const PanelSection: React.FC<{ panel?: unknown }> = ({ panel }) => {
  if (!isPanel(panel)) return null;
  const { confidence, injection } = panelSignals(panel);
  const spans = list(panel.injection?.spans).filter((s) => typeof s === 'string' && s);
  const disputes = list(panel.disputes);
  const revised = list(panel.revised);
  const overrides = list(panel.overrides);

  return (
    <Space direction="vertical" size={8} style={{ width: '100%' }} className="resume-ai-panel">
      {confidence && (
        <div>
          <Tag color={CONFIDENCE_COLOR[confidence]}>AI 置信度 {CONFIDENCE_TEXT[confidence]}</Tag>
          {CONFIDENCE_NOTE[confidence] && <Text type="secondary">{CONFIDENCE_NOTE[confidence]}</Text>}
        </div>
      )}

      {panel.critic === 'unavailable' && (
        <Alert
          type="warning"
          showIcon
          message="批判者这次没有跑成"
          description="复核这张卡的批判者调用失败或输出不合规,这里只有评委一方的判断,所以置信度记为低。"
        />
      )}
      {panel.critic === 'skipped' && (
        <Text type="secondary">这张卡命中了重点复核规则,没有可供批判者复核的判定。</Text>
      )}

      {injection && (
        <Alert
          type="error"
          showIcon
          message="简历里检出疑似写给 AI 的指令"
          description={(
            <>
              <div>引文落在这些片段里的达成项已被作废,不计入结果。</div>
              {spans.length > 0 && (
                <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                  {/* 片段是简历原文:只当纯文本显示 */}
                  {spans.map((s, i) => <li key={i}>「{s}」</li>)}
                </ul>
              )}
            </>
          )}
        />
      )}

      {overrides.length > 0 && (
        <div>
          <Text strong>由程序改判为未达成({overrides.length} 项)</Text>
          <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
            {overrides.map((o, i) => (
              <li key={i}>
                {where(o)}
                {o.reason ? <Text type="secondary">:{o.reason}</Text> : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {disputes.length > 0 && (
        <div>
          <Text strong>批判者有异议、评委未改判({disputes.length} 项)</Text>
          <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
            {disputes.map((d, i) => (
              <li key={i}>
                <Space size={4} wrap>
                  <span>{where(d)}</span>
                  {d.kind && <Tag>{DISPUTE_KIND_TEXT[d.kind] ?? d.kind}</Tag>}
                  {d.judge_decision && (
                    <Tag>{JUDGE_DECISION_TEXT[d.judge_decision] ?? d.judge_decision}</Tag>
                  )}
                </Space>
                {d.reason ? <div><Text type="secondary">{d.reason}</Text></div> : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {revised.length > 0 && (
        <Text type="secondary">
          评委在答辩后改判了 {revised.length} 项:{revised.map(where).join('、')}
        </Text>
      )}

      {panel.attitude_dispute === true && (
        <Alert
          type="info"
          showIcon
          message="表达态度的判定有分歧"
          description="评委认为态度存在明显问题,批判者没有认同。态度这一项请人工确认。"
        />
      )}
    </Space>
  );
};
