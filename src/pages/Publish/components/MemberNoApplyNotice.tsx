// 投递页的社员态：整页只说一件事——你已经在社里了，这页没有你要填的东西。
//
// 以前这里是一张薄薄的提示条，底下照常渲染一整份简历。问题是那份简历
// 往往不是「历届投递」，而是刚刚被自动建出来的空草稿：前端虽然对社员传了
// autoCreate=false，但 userInfo 是异步到的，首轮 initData 跑的时候
// isMember 还是 false，草稿在那一轮就已经建掉了。线上因此攒出 24 条社员
// 空草稿。服务端现在会直接拒绝（3013），这一屏则把入口本身收掉。
//
// 历史投递没有丢，只是挪了地方：个人主页的「我的申请」按周期列全部记录，
// 比在投递页里塞一个只有社员看得见的分支更好找。

import React from 'react';
import { Button } from 'antd';
import { ArrowLeftOutlined, HistoryOutlined, SafetyCertificateFilled } from '@ant-design/icons';
import './memberNoApply.scss';

export interface MemberNoApplyNoticeProps {
  /** 社员本人的名字，有就带上——这一屏是对人说话，不是系统公告 */
  name?: string | null;
  /** 本人有过投递记录的周期数，为 0 时不提「我的申请」 */
  historyCount?: number;
  onViewHistory?: () => void;
  onBack?: () => void;
}

const MemberNoApplyNotice: React.FC<MemberNoApplyNoticeProps> = ({
  name, historyCount = 0, onViewHistory, onBack,
}) => (
  <div className="member-no-apply">
    <div className="member-no-apply__card">
      <span className="member-no-apply__medal">
        <SafetyCertificateFilled />
      </span>

      <h2 className="member-no-apply__title">
        {name ? `${name}，你已经是博远的社员` : '你已经是博远的社员'}
      </h2>
      {/* 一行写完：JSX 里换行会在中文之间留下一个空格，断在逗号后很难看 */}
      <p className="member-no-apply__lead">
        简历投递是给还没加入的同学准备的，这一页没有需要你填的内容，也不会再为你建草稿。
      </p>

      <div className="member-no-apply__divider" />

      <div className="member-no-apply__hint">
        想帮忙看简历或参与面试？找管理员开通对应权限，之后从管理后台进入。
      </div>

      <div className="member-no-apply__actions">
        {historyCount > 0 && (
          <Button type="primary" icon={<HistoryOutlined />} onClick={onViewHistory}>
            看我的投递记录
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

export default MemberNoApplyNotice;
