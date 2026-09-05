import React from "react";
import { Tabs, Typography } from "antd";
import {
  BarChartOutlined,
  CommentOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import AgentOps from "../AgentOps";
import AgentConfig from "../AgentConfig";
import AgentUsage from "../AgentUsage";

/**
 * Agent 管理工作台(M6 #115,按用户要求三块合并为单页内 Tabs)。
 * 权限:菜单项 anyOf agent:monitor(AdminLayout);三个子页各自复用。
 */
const AgentAdmin: React.FC = () => (
  <>
    <Typography.Title level={4} style={{ marginTop: 0 }}>
      Agent 管理
    </Typography.Title>
    <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
      客服 Agent 运营监控、配置热管理与用量观测的工作台(权限码 agent:monitor)。
    </Typography.Paragraph>
    <Tabs
      defaultActiveKey="ops"
      size="large"
      items={[
        {
          key: "ops",
          label: (
            <span>
              <CommentOutlined /> 运营监控
            </span>
          ),
          children: <AgentOps />,
        },
        {
          key: "usage",
          label: (
            <span>
              <BarChartOutlined /> 用量仪表盘
            </span>
          ),
          children: <AgentUsage />,
        },
        {
          key: "config",
          label: (
            <span>
              <SettingOutlined /> 配置管理
            </span>
          ),
          children: <AgentConfig />,
        },
      ]}
    />
  </>
);

export default AgentAdmin;
