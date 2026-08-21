// 页面说明条。
//
// 替代满屏的 <Alert type="info" showIcon>：那个组件是「提醒用户注意」用的，
// 整块饱和蓝底 + 大图标，而这些文字其实只是常驻的操作说明 —— 每个页面顶上
// 压一条蓝色横幅，重要性被夸大，页面也显得很吵。
//
// 这里改成低对比度的说明样式：细左边框 + 极淡底色 + 小字号，
// 信息还在，但不再抢主内容的注意力。长说明可以折叠起来（defaultCollapsed）。
import React, { useState } from 'react';
import { InfoCircleOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import './index.scss';

export interface PageHintProps {
  /** 标题（原 Alert 的 message）。给了它则 children 作为正文，字号更小 */
  title?: React.ReactNode;
  children?: React.ReactNode;
  /** 折叠时显示的一行摘要；给了它才会出现展开/收起 */
  summary?: React.ReactNode;
  /** 右侧操作区（比如「去绑定」按钮） */
  extra?: React.ReactNode;
  defaultCollapsed?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const PageHint: React.FC<PageHintProps> = ({
  title, children, summary, extra, defaultCollapsed = false, className, style,
}) => {
  const collapsible = summary != null;
  const [collapsed, setCollapsed] = useState(collapsible && defaultCollapsed);

  return (
    <div className={`page-hint${className ? ` ${className}` : ''}`} style={style}>
      <InfoCircleOutlined className="page-hint__icon" />
      <div className="page-hint__body">
        {title && <div className="page-hint__title">{title}</div>}
        {collapsed ? summary : children}
        {collapsible && (
          <button
            type="button"
            className="page-hint__toggle"
            onClick={() => setCollapsed((v) => !v)}
          >
            {collapsed ? <>展开 <DownOutlined /></> : <>收起 <UpOutlined /></>}
          </button>
        )}
      </div>
      {extra && <div className="page-hint__extra">{extra}</div>}
    </div>
  );
};

export default PageHint;
