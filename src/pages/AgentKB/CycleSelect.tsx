import React from "react";
import { Select, Tag, Tooltip, Typography } from "antd";
import { WarningOutlined } from "@ant-design/icons";
import {
  CycleDirectory,
  EVERGREEN_LABEL,
  buildCycleOptions,
  describeBinding,
} from "./cycleBinding";

const { Text } = Typography;

/** antd Select 把 null 当成「没选」,显示不出「常青」这一项;周期 id ≥ 1,用 0 占位不会撞 */
const EVERGREEN = 0;

export interface CycleSelectProps {
  /** Form.Item 注入,转给内部输入框,表单标签才能关联到它 */
  id?: string;
  /** 招新周期 id,null/undefined = 常青。由 Form.Item 注入 */
  value?: number | null;
  onChange?: (cycleId: number | null) => void;
  directory: CycleDirectory;
  loading?: boolean;
}

/**
 * 知识条目的周期选择器:「常青」+ 现有招新周期。
 *
 * 表单里存的就是要发给接口的值(周期 id 或 null),占位值不出这个组件。
 * 没用 CycleSwitcher:那是用户端「在几个开放周期之间切换」的卡片组,
 * 少于两个周期不渲染,也没有「不绑定」这一项;这里要的是全部周期里单选、可清回常青。
 */
export const CycleSelect: React.FC<CycleSelectProps> = ({
  id,
  value,
  onChange,
  directory,
  loading,
}) => {
  const current = value ?? null;
  return (
    <Select<number>
      id={id}
      value={current ?? EVERGREEN}
      onChange={(v) => onChange?.(v === EVERGREEN ? null : v)}
      loading={loading}
      showSearch
      optionFilterProp="label"
      options={[
        { value: EVERGREEN, label: EVERGREEN_LABEL },
        ...buildCycleOptions(directory, current),
      ]}
    />
  );
};

/** 列表里的绑定情况:常青 / 周期名;绑定的周期不在开放期时标红并写明「检索不到」 */
export const CycleBindingTag: React.FC<{
  cycleId: unknown;
  directory: CycleDirectory;
  /** 周期还在加载:先只显示绑定本身,别闪一下「开放状态未知」 */
  loading?: boolean;
}> = ({ cycleId, directory, loading }) => {
  const view = describeBinding(cycleId, directory);

  if (view.status === "evergreen") {
    return (
      <Tooltip title={view.hint}>
        <Tag>常青</Tag>
      </Tooltip>
    );
  }

  if (view.unsearchable) {
    return (
      <Tooltip title={view.hint}>
        <div>
          <Tag color="error" icon={<WarningOutlined />}>
            {view.label} · {view.stateText}
          </Tag>
          <div>
            <Text type="danger" style={{ fontSize: 12 }}>
              现在不会被检索到
            </Text>
          </div>
        </div>
      </Tooltip>
    );
  }

  return (
    <Tooltip title={loading ? undefined : view.hint}>
      <div>
        <Tag color={view.status === "open" ? "success" : undefined}>{view.label}</Tag>
        {view.status === "unknown" && !loading && (
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {view.stateText}
            </Text>
          </div>
        )}
      </div>
    </Tooltip>
  );
};
