// 投递页的空状态：落点周期已结束，而本人在这一届没有简历。
//
// 以前这种情况会照常渲染一份全是「未填写」的空简历，顶上挂着
// 「本周期已停止投递 · 草稿（不可修改）」。那份简历从未存在过，
// 「草稿」只是 status 为空时的兜底标签——用户被一份假简历告知
// 「你的周期结束了」，而真相往往只是「现在没有招新」。
//
// 这一屏只说一件事，按 kind 分三种说法，见 resolvePublishEmptyState。

import React from 'react';
import { Button } from 'antd';
import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons';
import type { PublishEmptyState } from '../cyclePhase';
import './noOpenCycle.scss';

export interface HistoryCycle {
  cycleId: number;
  cycleName: string;
}

export interface NoOpenCycleNoticeProps {
  kind: PublishEmptyState;
  /** 当前落点周期的名字，只在 ended-no-resume 时用得上 */
  cycleName?: string | null;
  /**
   * 本人投过的历届周期。没有开放周期时切换器不一定渲染（少于两项就隐藏），
   * 这里单独列出来，否则用户唯一一份历史简历就没有入口了。
   */
  history?: HistoryCycle[];
  onPickHistory?: (cycleId: number) => void;
  onBack?: () => void;
  /** cycles-unavailable 时的重试；默认整页刷新 */
  onRetry?: () => void;
}

const COPY: Record<NonNullable<PublishEmptyState>, { pill: string; title: string; lead: string }> = {
  'no-recruitment': {
    pill: '暂无招新',
    title: '当前没有进行中的招新',
    lead: '上一轮招募已经结束。下一届开放时，这里会显示预告和报名入口。',
  },
  'ended-no-resume': {
    pill: '已结束',
    title: '这一届的招募已结束',
    lead: '你在这一届没有投递记录，没有可查看的简历。',
  },
  'paused-no-resume': {
    pill: '已停止投递',
    title: '本周期已停止投递',
    lead: '管理员已停止接收新的简历，你在这一届没有投递记录，现在无法再新建。',
  },
  'cycles-unavailable': {
    pill: '加载失败',
    title: '暂时无法获取招新信息',
    lead: '没能拿到招募周期列表，说不清现在是否有招新。请稍后刷新重试。',
  },
};

const NoOpenCycleNotice: React.FC<NoOpenCycleNoticeProps> = ({
  kind, cycleName, history, onPickHistory, onBack, onRetry,
}) => {
  const copy = COPY[kind];
  const past = history ?? [];
  const title = cycleName && kind === 'ended-no-resume'
    ? `${cycleName} 已结束`
    : cycleName && kind === 'paused-no-resume'
      ? `${cycleName} 已停止投递`
      : copy.title;

  return (
    <div className="no-open-cycle">
      <div className="no-open-cycle__card">
        <span className={`no-open-cycle__pill is-${kind}`}>{copy.pill}</span>
        <h2 className="no-open-cycle__title">{title}</h2>
        <p className="no-open-cycle__lead">{copy.lead}</p>

        {past.length > 0 && (
          <div className="no-open-cycle__history">
            <div className="no-open-cycle__history-label">查看历届投递</div>
            <div className="no-open-cycle__history-list">
              {past.map((c) => (
                <button
                  key={c.cycleId}
                  type="button"
                  className="no-open-cycle__history-item"
                  onClick={() => onPickHistory?.(Number(c.cycleId))}
                >
                  {c.cycleName}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="no-open-cycle__actions">
          {kind === 'cycles-unavailable' && (
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={onRetry ?? (() => window.location.reload())}
            >
              刷新重试
            </Button>
          )}
          {onBack && (
            <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
              返回首页
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NoOpenCycleNotice;
