// 招募周期预告。
//
// 未开始的周期以前在用户端是不可见的（不在开放列表里就当已结束），
// 于是「下一届什么时候开始」只能靠群里问。现在它可见、可期待，但不可投。
//
// 这一屏只有一件事要说清楚：还没开始，什么时候开始。
// 所以倒计时是主角，其余信息都退到它后面。

import React from 'react';
import { Button } from 'antd';
import { ArrowLeftOutlined, CalendarOutlined } from '@ant-design/icons';
import { daysUntil } from '../cyclePhase';
import './cycleUpcoming.scss';

export interface CycleUpcomingNoticeProps {
  cycleName?: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  /** 该周期已配置的字段数；为 0 说明表单还没配好 */
  fieldCount?: number;
  onBack?: () => void;
  /**
   * 同时已排期的全部周期。管理员可以一次排好几届，
   * 只显示落点那一届的话其余的在用户端就凭空消失了。
   * 少于两届时不渲染切换器 —— 没得切，多一个控件只是噪音。
   */
  siblings?: Array<{ cycleId: number; cycleName: string; startDate?: string | null }>;
  currentCycleId?: number;
  onPick?: (cycleId: number) => void;
  /** 注入「今天」便于测试；默认取当前时间 */
  today?: Date;
}

function formatRange(start?: string | null, end?: string | null): string {
  if (!start) return '时间待定';
  const cn = (d: string) => {
    const [, m, day] = d.split('-');
    return m && day ? `${Number(m)}月${Number(day)}日` : d;
  };
  return end ? `${cn(start)} — ${cn(end)}` : `${cn(start)} 开始`;
}

const CycleUpcomingNotice: React.FC<CycleUpcomingNoticeProps> = ({
  cycleName, description, startDate, endDate, fieldCount, onBack, today,
  siblings, currentCycleId, onPick,
}) => {
  const days = daysUntil(startDate, today ?? new Date());
  const others = siblings ?? [];

  return (
    <div className="cycle-upcoming">
      <div className="cycle-upcoming__card">
        <span className="cycle-upcoming__pill">
          <span className="cycle-upcoming__dot" />
          即将开放
        </span>

        <h2 className="cycle-upcoming__title">{cycleName || '下一届招新'}</h2>
        <p className="cycle-upcoming__lead">本轮招募还未开始，暂时不能投递简历。</p>

        {days != null && (
          <div className="cycle-upcoming__count">
            <span className="cycle-upcoming__num">{days}</span>
            <span className="cycle-upcoming__unit">天后开启</span>
          </div>
        )}

        <div className="cycle-upcoming__range">
          <CalendarOutlined />
          <span>{formatRange(startDate, endDate)}</span>
        </div>

        {description && <p className="cycle-upcoming__desc">{description}</p>}

        {/*
          字段数为 0 说明报名表单还没配好。这句是给管理员自己看的：
          他多半会先用学生视角点进来确认预告长什么样，那时表单没配
          比开放当天才发现要好得多。
        */}
        {fieldCount === 0 && (
          <p className="cycle-upcoming__hint">报名表单还在准备中，开放时即可填写。</p>
        )}

        {others.length > 1 && (
          <div className="cycle-upcoming__tabs" role="tablist">
            {others.map((c) => {
              const active = Number(c.cycleId) === Number(currentCycleId);
              return (
                <button
                  key={c.cycleId}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`cycle-upcoming__tab${active ? ' is-active' : ''}`}
                  onClick={() => !active && onPick?.(Number(c.cycleId))}
                >
                  {c.cycleName}
                </button>
              );
            })}
          </div>
        )}

        {onBack && (
          <Button className="cycle-upcoming__back" icon={<ArrowLeftOutlined />} onClick={onBack}>
            返回首页
          </Button>
        )}
      </div>
    </div>
  );
};

export default CycleUpcomingNotice;
