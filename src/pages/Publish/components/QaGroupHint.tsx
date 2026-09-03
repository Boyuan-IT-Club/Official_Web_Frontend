// 招新答疑群二维码。
//
// 现在只出现在「填写提示」弹窗的末尾：那里正是用户看完注意事项、
// 仍有疑问的时刻，比常驻在页头挤占版面更合适。
// 页头原先那张卡还有个毛病 —— 它只写在「查看已投递简历」那一支里，
// 草稿态根本看不到；移进弹窗后两种状态自然都有了。

import React from 'react';
import { Image } from 'antd';

export interface QaGroupHintProps {
  imageUrl?: string | null;
  remark?: string | null;
}

const QaGroupHint: React.FC<QaGroupHintProps> = ({ imageUrl, remark }) => {
  if (!imageUrl) return null;

  return (
    <div className="qa-group-hint">
      {/*
        用 antd Image 而不是裸 <img>：它自带放大灯箱。
        二维码在弹窗里也只有 96px 见方，手机对着屏幕未必扫得动，
        点开放大是必要的退路。
      */}
      <Image
        className="qa-group-hint__qr"
        src={imageUrl}
        alt="招新答疑群二维码"
        preview={{ mask: <span className="qa-group-hint__mask">放大</span> }}
      />
      <div className="qa-group-hint__body">
        <div className="qa-group-hint__title">还有疑问？扫码进答疑群</div>
        <div className="qa-group-hint__desc">
          {remark || '招新答疑群'}　·　有任何问题都可以在群里直接问我们
        </div>
      </div>
    </div>
  );
};

export default QaGroupHint;
