// 简历页顶部的状态条。
//
// 取代原来的 antd Alert。Alert 有两个问题：
//   1) 它的 message 会继承外层标题区的 text-align: center，而 description
//      是左对齐的，两行一居中一靠左，错位很难看（这条毛病此前在
//      member-notice 那里已经踩过一次，当时是单独排了张卡绕开）。
//   2) 默认配色偏白偏淡、内边距很大，一整条横在页面顶上很占地方。
//
// 这里统一成一条左对齐的窄卡：左侧一个圆角方形图标块 + 右侧标题与说明，
// 状态值单独做成 chip 用等宽字体——「已提交（不可修改）」这类是要被人
// 一眼扫到的信息，混在句子里反而找不着。

import React from 'react';
import {
  CheckCircleFilled, ClockCircleFilled, ExclamationCircleFilled, InfoCircleFilled,
} from '@ant-design/icons';
import './statusNotice.scss';

export type StatusNoticeTone = 'info' | 'warning' | 'success' | 'muted';

export interface StatusNoticeProps {
  tone?: StatusNoticeTone;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** 需要被一眼扫到的状态值，渲染成等宽 chip */
  badge?: React.ReactNode;
  className?: string;
}

const ICON: Record<StatusNoticeTone, React.ReactNode> = {
  info: <InfoCircleFilled />,
  warning: <ExclamationCircleFilled />,
  success: <CheckCircleFilled />,
  muted: <ClockCircleFilled />,
};

const StatusNotice: React.FC<StatusNoticeProps> = ({
  tone = 'info', title, description, badge, className = '',
}) => (
  <div className={`status-notice is-${tone} ${className}`.trim()}>
    <span className="status-notice__icon">{ICON[tone]}</span>
    <div className="status-notice__body">
      <div className="status-notice__title">
        {title}
        {badge && <code className="status-notice__badge">{badge}</code>}
      </div>
      {description && <div className="status-notice__desc">{description}</div>}
    </div>
  </div>
);

export default StatusNotice;
