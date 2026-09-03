// 招新答疑群二维码条。
//
// 抽成组件是因为它原先只写在「查看已投递简历」那一支里，
// 而草稿/填写中走的是另一支 —— 恰恰是最可能有疑问、最需要这个入口的时候，
// 它反而不出现。两支共用一个组件，就不会再只改一边。

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
        用 antd Image 而不是裸 <img>：它自带放大灯箱（可缩放、旋转）。
        原先是个纯 <img>，既点不开也没有指针样式，而 84px 见方的二维码
        用手机对着屏幕基本扫不出来——想扫的人没有任何办法把它放大。
      */}
      <Image
        className="qa-group-hint__qr"
        src={imageUrl}
        alt="招新答疑群二维码"
        preview={{ mask: <span className="qa-group-hint__mask">点击放大</span> }}
      />
      <div className="qa-group-hint__body">
        <div className="qa-group-hint__title">填写遇到问题？扫码进答疑群</div>
        <div className="qa-group-hint__desc">
          {remark || '招新答疑群'}　·　有任何疑问都可以在群里直接问我们
        </div>
        {/* 明说可以点开：不写的话用户只会以为这张图就这么大 */}
        <div className="qa-group-hint__tip">二维码太小？点击可放大后再扫</div>
      </div>
    </div>
  );
};

export default QaGroupHint;
