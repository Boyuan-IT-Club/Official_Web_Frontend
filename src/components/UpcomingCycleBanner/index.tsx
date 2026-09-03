// 首页的下一届招新预告条。
//
// 未开始的周期以前在用户端完全不可见（周期切换器只列开放中的），
// 「下一届什么时候开始」只能靠群里问。这里把最近要开的那一届摆出来，
// 可见、可期待、但点不进去投——它还没开始。
//
// 刻意做成一条横幅而不是又一张卡片：首页上方已经有周期切换器和进度卡，
// 再加一张同等分量的卡片会把真正要操作的东西挤下去。

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
  // 后端按 start_date 升序返回，第一条就是最快开始的那届
  const next = cycles?.[0];
  if (!next) return null;

  const days = daysUntil(next.startDate, today ?? new Date());

  return (
    <div className="upcoming-banner">
      <span className="upcoming-banner__icon"><RocketOutlined /></span>

      <div className="upcoming-banner__body">
        <div className="upcoming-banner__title">
          {next.cycleName}
          <span className="upcoming-banner__pill">即将开放</span>
        </div>
        <div className="upcoming-banner__meta">
          {/* 没有倒计时（日期缺失）时不硬凑一句，只报开始日期 */}
          {days != null
            ? <>还有 <b>{days}</b> 天开始投递 · {next.startDate} 起</>
            : <>开始日期：{next.startDate || '待定'}</>}
        </div>
      </div>
    </div>
  );
};

export default UpcomingCycleBanner;
