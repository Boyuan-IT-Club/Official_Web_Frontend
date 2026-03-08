//用户列表上方搜索/筛选/批量操作栏

import React from 'react';
import { Space, Input, Select, Button, Badge } from 'antd';
import { SearchOutlined, CheckOutlined } from '@ant-design/icons';

const { Option } = Select;

interface ToolbarProps {
  searchText: string;
  onSearchChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (value: string) => void;
  statusOptions: { value: string; label: string }[];
  selectedRowsCount: number;
  onBatchAdmit: () => void;
  onClearSelection: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  searchText,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  statusOptions,
  selectedRowsCount,
  onBatchAdmit,
  onClearSelection
}) => (
  <div className="toolbar">
    <Space size="middle">
      <Input
        placeholder="请输入姓名或学号进行搜索"
        prefix={<SearchOutlined />}
        style={{ width: 200 }}
        value={searchText}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <Select
        placeholder="用户状态"
        style={{ width: 120 }}
        value={selectedStatus}
        onChange={onStatusChange}
      >
        {statusOptions.map(option => (
          <Option key={option.value} value={option.value}>{option.label}</Option>
        ))}
      </Select>
    </Space>
    <Space>
      {selectedRowsCount > 0 && (
        <>
          <Badge count={selectedRowsCount} offset={[10, 0]}>
            <Button type="primary" icon={<CheckOutlined />} onClick={onBatchAdmit}>
              批量录取为社员
            </Button>
          </Badge>
          <Button onClick={onClearSelection}>清除选择</Button>
        </>
      )}
    </Space>
  </div>
);

export default Toolbar;
