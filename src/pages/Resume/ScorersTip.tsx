// 列表卡片分数标签的悬停内容：列出全部打分人。
//
// 原来只显示 scoredByName（最近一次打分的那个人），多人打分后
// 看到的是「丁华烨 评分」，像是只有他一个人打过。
import React from 'react';
import { ScoreEntry, scorerLabel } from './scorePanel';
import './scorersTip.scss';

export function scorersTip(
  entries: ScoreEntry[] | null | undefined,
  avg: number | null | undefined,
  /** 没有明细的历史数据（V38 之前的单人打分）退回署名 */
  fallbackName?: string | null,
  /** 末行补充说明，如「点击收起」 */
  footer?: string,
): React.ReactNode {
  const list = entries ?? [];
  if (list.length === 0) {
    const base = fallbackName ? `${fallbackName} 评分` : '已评分';
    return footer ? `${base} · ${footer}` : base;
  }
  return (
    <div className="scorers-tip">
      <div className="scorers-tip__head">
        {list.length} 人打分{avg != null ? ` · 平均 ${avg}` : ''}
      </div>
      {list.map((e) => (
        <div key={e.scorerId} className="scorers-tip__row">
          <span>{scorerLabel(e)}</span>
          <b>{e.score}</b>
        </div>
      ))}
      {footer && <div className="scorers-tip__foot">{footer}</div>}
    </div>
  );
}
