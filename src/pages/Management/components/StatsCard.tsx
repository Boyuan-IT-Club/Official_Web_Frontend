// 社团成员类型人数统计卡片

import React from 'react';
import { Card } from 'antd';
import type { ReactNode } from 'react';

interface StatsCardProps {
  icon: ReactNode;
  value: number;
  title: string;
  bgColor?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ icon, value, title, bgColor }) => {
  return (
    <Card className="stat-card">
      <div className="stat-icon" style={{ backgroundColor: bgColor }}>{icon}</div>
      <div className="stat-content">
        <div className="stat-value">{value}</div>
        <div className="stat-title">{title}</div>
      </div>
    </Card>
  );
};

export default StatsCard;
