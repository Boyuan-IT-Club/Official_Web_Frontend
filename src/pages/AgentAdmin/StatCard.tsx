import React from "react";
import { Card, Statistic, Tooltip } from "antd";

/** 统计卡:彩色图标圆片 + 数值(运营/用量两页共用;项目主色系) */
const StatCard: React.FC<{
  icon: React.ReactNode;
  tint: string;
  accent: string;
  title: React.ReactNode;
  value: string | number;
  suffix?: string;
  tooltip?: string;
}> = ({ icon, tint, accent, title, value, suffix, tooltip }) => {
  const titleEl = tooltip ? <Tooltip title={tooltip}>{title}</Tooltip> : title;
  return (
    <Card
      size="small"
      style={{ borderRadius: 12, boxShadow: "0 1px 4px rgba(0,21,41,.06)" }}
      styles={{ body: { padding: "14px 16px" } }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span
          style={{
            width: 42,
            height: 42,
            borderRadius: 10,
            background: tint,
            color: accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            flexShrink: 0,
          }}
        >
          {icon}
        </span>
        <Statistic title={titleEl} value={value} suffix={suffix} />
      </div>
    </Card>
  );
};

export default StatCard;
