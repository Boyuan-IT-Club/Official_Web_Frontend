// 打分评语卡：谁、打了几分、写了什么。放在打分面板下方、简历正文之前——
// 读简历前先看到同伴的判断，打分舞台里同样显示（舞台复用 ResumeDetail）。
//
// 盲评：我还没打分时，别人的评语和别人的分数一样先藏着（评语比分数更容易带偏），
// 只露条数；点小眼睛（与分数共用同一个揭开状态）或打完分即可见。
import React from 'react';
import { Button, Tooltip } from 'antd';
import { CommentOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { ScoreEntry, scorerLabel } from './scorePanel';
import { toggleRevealOne } from './scoreReveal';

type Props = {
  resumeId: number | string;
  entries: ScoreEntry[];
  myUserId?: number | string | null;
  /** 他人打分/评语当前是否该藏（othersHidden 的结果，已考虑小眼睛） */
  blind: boolean;
  /** 「显示全部打分」开着时单份小眼睛不可用 */
  revealAll?: boolean;
};

const AVATAR_TONES = ['#e8f0fe', '#e6f6ef', '#fdf0e6', '#f1ecfd', '#fdeef3', '#e9f5f9'];
const AVATAR_TEXT = ['#1f5fc8', '#2e7d4f', '#b45309', '#5b46c4', '#b8325e', '#1b6f8a'];

const toneOf = (name: string): number => {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h % AVATAR_TONES.length;
};

/** 2026-10-01T14:20:33 → 10-01 14:20 */
const shortTime = (iso?: string | null): string => {
  if (!iso) return '';
  const m = String(iso).match(/^\d{4}-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  return m ? `${m[1]}-${m[2]} ${m[3]}:${m[4]}` : '';
};

const ScoreComments: React.FC<Props> = ({ resumeId, entries, myUserId, blind, revealAll }) => {
  const commented = entries.filter((e) => (e.comment ?? '').trim() !== '');
  if (commented.length === 0) return null;

  const isMine = (e: ScoreEntry) => myUserId != null && String(e.scorerId) === String(myUserId);

  if (blind) {
    return (
      <section className="score-comments is-blind" aria-label="打分评语">
        <CommentOutlined className="score-comments__icon" />
        <span>已有 {commented.length} 条评语，打分后可见</span>
        <Tooltip title={revealAll ? '已在列表开启「显示全部打分」' : '查看他人打分与评语'}>
          <Button
            type="link"
            size="small"
            icon={<EyeInvisibleOutlined />}
            disabled={revealAll}
            onClick={() => toggleRevealOne(resumeId)}
          >
            查看
          </Button>
        </Tooltip>
      </section>
    );
  }

  return (
    <section className="score-comments" aria-label="打分评语">
      <header className="score-comments__head">
        <CommentOutlined className="score-comments__icon" />
        打分评语
        <span className="score-comments__count">{commented.length}</span>
      </header>
      <ul className="score-comments__list">
        {commented.map((e) => {
          const name = scorerLabel(e);
          const tone = toneOf(name);
          return (
            <li key={e.scorerId} className={`score-comment${isMine(e) ? ' is-mine' : ''}`}>
              <span
                className="score-comment__avatar"
                style={{ background: AVATAR_TONES[tone], color: AVATAR_TEXT[tone] }}
                aria-hidden
              >
                {name.slice(0, 1)}
              </span>
              <div className="score-comment__body">
                <div className="score-comment__meta">
                  <b className="score-comment__name">{name}</b>
                  {isMine(e) && <span className="score-comment__me">我</span>}
                  <span className="score-comment__score">{e.score} 分</span>
                  {shortTime(e.scoredAt) && <span className="score-comment__time">{shortTime(e.scoredAt)}</span>}
                </div>
                <p className="score-comment__text">{e.comment}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default ScoreComments;
