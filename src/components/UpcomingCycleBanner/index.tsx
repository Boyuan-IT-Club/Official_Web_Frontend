// 首页的招新预告条。
//
// 未开始的周期以前在用户端完全不可见（周期切换器只列开放中的），
// 「下一届什么时候开始」只能靠群里问。这里把已排期的都摆出来，
// 可见、可期待、但点不进去投——它们还没开始。
//
// 刻意做成横幅而不是一张张卡片：首页上方已经有周期切换器和进度卡，
// 再加同等分量的卡片会把真正要操作的东西挤下去。
//
// 第一版只显示最快开始的那一届（cycles[0]），假设「下一届」只有一个。
// 但管理员可以同时排好几届，那时其余的就凭空消失了 —— 现在全部列出，
// 最近的一条给足信息（倒计时），其余的压成一行。

import React from 'react';
import { RocketOutlined } from '@ant-design/icons';
import type { OpenCycle } from '@/api/manage/cycleApis';
import { daysUntil } from '@/pages/Publish/cyclePhase';
import './index.scss';

export interface UpcomingCycleBannerProps {
  cycles: OpenCycle[];
  /** 注入「今天」便于测试 */
  today?: Date;
}

const UpcomingCycleBanner: React.FC<UpcomingCycleBannerProps> = ({ cycles, today }) => {
  const list = cycles ?? [];
  if (list.length === 0) return null;

  const now = today ?? new Date();
  // 后端按 start_date 升序返回，第一条就是最快开始的那届
  const [next, ...rest] = list;
  const days = daysUntil(next.startDate, now);

  return (
    <div className="upcoming-banner">
      <span className="upcoming-banner__icon"><RocketOutlined /></span>

      <div className="upcoming-banner__body">
        <div className="upcoming-banner__title">
          {next.cycleName}
          <span className="upcoming-banner__pill">即将开放</span>
          {/* 有几届在排队要说出来，否则用户会以为只有这一个 */}
          {rest.length > 0 && (
            <span className="upcoming-banner__count">共 {list.length} 届已排期</span>
          )}
        </div>
        <div className="upcoming-banner__meta">
          {/* 没有倒计时（日期缺失）时不硬凑一句，只报开始日期 */}
          {days != null
            ? <>还有 <b>{days}</b> 天开始投递 · {next.startDate} 起</>
            : <>开始日期：{next.startDate || '待定'}</>}
        </div>

        {rest.length > 0 && (
          <ul className="upcoming-banner__rest">
            {rest.map((c) => {
              const d = daysUntil(c.startDate, now);
              return (
                <li key={c.cycleId}>
                  <span className="upcoming-banner__rest-name">{c.cycleName}</span>
                  <span className="upcoming-banner__rest-when">
                    {d != null ? `${d} 天后 · ${c.startDate}` : (c.startDate || '时间待定')}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default UpcomingCycleBanner;
