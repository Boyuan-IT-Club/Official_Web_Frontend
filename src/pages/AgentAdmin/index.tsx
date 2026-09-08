import React from "react";
import { Tabs, Typography } from "antd";
import {
  BarChartOutlined,
  BookOutlined,
  CommentOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import AgentOps from "../AgentOps";
import AgentConfig from "../AgentConfig";
import AgentUsage from "../AgentUsage";
import AgentKB from "../AgentKB";

/**
 * Agent 管理工作台(M6 #115,按用户要求三块合并为单页内 Tabs)。
 * 权限:菜单项 anyOf agent:monitor / kb:manage(AdminLayout,RAG #134);
 * 运营/用量/配置子页属 agent:monitor,知识库 Tab 属 kb:manage(独立授权,
 * #121:tab 内数据面 403 时由接口提示,不在此做权限分支)。
 */
const AgentAdmin: React.FC = () => (
  <>
    <Typography.Title level={4} style={{ marginTop: 0 }}>
      Agent 管理
    </Typography.Title>
    <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
      客服 Agent 运营监控、用量观测、配置热管理与知识库维护的工作台
      (权限码 agent:monitor / kb:manage)。
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
        {
          key: "kb",
          label: (
            <span>
              <BookOutlined /> 知识库
            </span>
          ),
          children: <AgentKB />,
        },
      ]}
    />
  </>
);

export default AgentAdmin;
