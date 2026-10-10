// 「把我加为这场的面试官」：面试当天临时顶班用。
//
// 评价工作台与候选人抽屉两个打分面都要这一枚按钮，做成组件是为了两边长一个样
// ——否则各写各的，过两周就会长歪。请求与 loading 也收在这里，调用方只管记一笔。
import React, { useState } from 'react';
import { Button, message } from 'antd';
import { UserAddOutlined } from '@ant-design/icons';
import { joinSessionAsInterviewer } from '@/api/manage/interviewEvaluation';
import './index.scss';

export interface JoinSessionButtonProps {
  sessionId: number;
  /** 加入成功后回调，调用方据此在本地放开编辑（协同文档要等下一轮对账才刷新） */
  onJoined: (sessionId: number) => void;
}

const JoinSessionButton: React.FC<JoinSessionButtonProps> = ({ sessionId, onJoined }) => {
  const [joining, setJoining] = useState(false);

  const handleClick = async () => {
    setJoining(true);
    try {
      await joinSessionAsInterviewer(sessionId);
      onJoined(sessionId);
      message.success('已把你加进这一场，现在可以打分了');
    } catch (e: any) {
      message.error(e?.message || '加入失败');
    } finally {
      setJoining(false);
    }
  };

  return (
    <Button
      className="join-session-btn"
      size="small"
      loading={joining}
      icon={<UserAddOutlined />}
      onClick={handleClick}
    >
      把我加为这场的面试官
    </Button>
  );
};

export default JoinSessionButton;
