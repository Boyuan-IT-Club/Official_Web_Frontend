import React from "react";
import { Tabs, Typography } from "antd";
import { FileTextOutlined, FundOutlined } from "@ant-design/icons";
import ReportTab from "./ReportTab";
import SnapshotTab from "./SnapshotTab";

/**
 * 周期复盘(Agent 仓 docs/proposals/cycle-retrospective.md)。
 *
 * 两个分区:「指标快照」是代码算出来的数,是一切的依据;「复盘报告」是模型对着快照写的
 * 解读,要由人审阅后发布。各分区自己选周期,互不影响。
 * 权限:查看 resume:audit 或 evaluation:run;采集、生成、看草稿、发布要 evaluation:run。
 */
const Retrospective: React.FC = () => (
  <div>
    <Typography.Title level={4} style={{ marginTop: 0 }}>
      周期复盘
    </Typography.Title>
    <Tabs
      defaultActiveKey="snapshot"
      items={[
        {
          key: "snapshot",
          label: (
            <span>
              <FundOutlined /> 指标快照
            </span>
          ),
          children: <SnapshotTab />,
        },
        {
          key: "report",
          label: (
            <span>
              <FileTextOutlined /> 复盘报告
            </span>
          ),
          children: <ReportTab />,
        },
      ]}
    />
  </div>
);

export default Retrospective;
