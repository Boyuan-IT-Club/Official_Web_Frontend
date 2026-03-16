// 用户列表上方搜索/筛选/批量操作栏
import React, { useState } from 'react';
import {
  Space, Input, Select, Button, Badge, Dropdown,
  Modal, message,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  SearchOutlined,
  CheckOutlined,
  DownOutlined,
  LockOutlined,
  UnlockOutlined,
  DeleteOutlined,
  TeamOutlined,
  ApartmentOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';

import {
  batchAdmitAsMember,
  assignRoleToUsers,
  batchFreezeUsers,
  batchUnfreezeUsers,
  batchUpdateUserDept,
  deleteUser,
} from '@/api/manage/userApis';

const { Option } = Select;
const { confirm } = Modal;

// ─── Props ────────────────────────────────────────────────────────────────────

interface RoleOption {
  value: string;
  label: string;
}

export interface ToolbarProps {
  searchText: string;
  onSearchChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (value: string) => void;
  statusOptions: { value: string; label: string }[];
  selectedRowIds: number[];     // 选中行的 userId 列表
  selectedRowsCount: number;
  roleOptions: RoleOption[];    // 用于批量分配角色的下拉选项
  onClearSelection: () => void;
  refreshUsers: () => void;
}

// ─── 组件 ────────────────────────────────────────────────────────────────────

const Toolbar: React.FC<ToolbarProps> = ({
  searchText,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  statusOptions,
  selectedRowIds,
  selectedRowsCount,
  roleOptions,
  onClearSelection,
  refreshUsers,
}) => {

  // ── 批量分配角色弹窗 ────────────────────────────────────────────────────
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string>();

  const handleBatchAssignRole = async () => {
    if (!selectedRoleId) { message.warning('请先选择角色'); return; }
    try {
      await assignRoleToUsers([Number(selectedRoleId)], selectedRowIds);
      message.success(`已为 ${selectedRowsCount} 名用户分配角色`);
      setRoleModalOpen(false);
      setSelectedRoleId(undefined);
      onClearSelection();
      refreshUsers();
    } catch (e) {
      console.error(e);
      message.error('批量分配角色失败');
    }
  };

  // ── 批量修改部门弹窗 ────────────────────────────────────────────────────
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [deptValue, setDeptValue] = useState('');

  const handleBatchUpdateDept = async () => {
    if (!deptValue.trim()) { message.warning('请输入部门名称'); return; }
    try {
      await batchUpdateUserDept(selectedRowIds, deptValue.trim());
      message.success(`已更新 ${selectedRowsCount} 名用户的部门`);
      setDeptModalOpen(false);
      setDeptValue('');
      onClearSelection();
      refreshUsers();
    } catch (e) {
      console.error(e);
      message.error('批量修改部门失败');
    }
  };

  // ── 批量录取社员 ────────────────────────────────────────────────────────
  const handleBatchAdmit = () => {
    confirm({
      title: '确认批量录取为社员？',
      icon: <ExclamationCircleOutlined />,
      content: <span>将 <b>{selectedRowsCount}</b> 名用户录取为社员，此操作不可撤销。</span>,
      okText: '确认录取',
      cancelText: '取消',
      async onOk() {
        try {
          await batchAdmitAsMember(selectedRowIds);
          message.success(`成功录取 ${selectedRowsCount} 名社员`);
          onClearSelection();
          refreshUsers();
        } catch (e) {
          console.error(e);
          message.error('批量录取失败');
        }
      },
    });
  };

  // ── 批量冻结 ────────────────────────────────────────────────────────────
  const handleBatchFreeze = () => {
    confirm({
      title: '确认批量冻结所选用户？',
      icon: <ExclamationCircleOutlined />,
      content: <span>将冻结 <b>{selectedRowsCount}</b> 名用户账户。</span>,
      okText: '确认冻结',
      okType: 'danger',
      cancelText: '取消',
      async onOk() {
        try {
          await batchFreezeUsers(selectedRowIds);
          message.success(`已冻结 ${selectedRowsCount} 名用户`);
          onClearSelection();
          refreshUsers();
        } catch (e) {
          console.error(e);
          message.error('批量冻结失败');
        }
      },
    });
  };

  // ── 批量解冻 ────────────────────────────────────────────────────────────
  const handleBatchUnfreeze = () => {
    confirm({
      title: '确认批量解冻所选用户？',
      icon: <ExclamationCircleOutlined />,
      content: <span>将解冻 <b>{selectedRowsCount}</b> 名用户账户。</span>,
      okText: '确认解冻',
      cancelText: '取消',
      async onOk() {
        try {
          await batchUnfreezeUsers(selectedRowIds);
          message.success(`已解冻 ${selectedRowsCount} 名用户`);
          onClearSelection();
          refreshUsers();
        } catch (e) {
          console.error(e);
          message.error('批量解冻失败');
        }
      },
    });
  };

  // ── 批量删除 ────────────────────────────────────────────────────────────
  const handleBatchDelete = () => {
    confirm({
      title: '确认批量删除所选用户？',
      icon: <ExclamationCircleOutlined />,
      content: <span>此操作不可恢复，将删除 <b>{selectedRowsCount}</b> 名用户。</span>,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      async onOk() {
        try {
          // 逐个删除（后端若有批量删除接口可替换）
          await Promise.all(selectedRowIds.map((id) => deleteUser(id)));
          message.success(`已删除 ${selectedRowsCount} 名用户`);
          onClearSelection();
          refreshUsers();
        } catch (e) {
          console.error(e);
          message.error('批量删除失败');
        }
      },
    });
  };

  // ── 下拉菜单项 ──────────────────────────────────────────────────────────
  const batchMenuItems: MenuProps['items'] = [
    {
      key: 'admit',
      icon: <CheckOutlined />,
      label: '录取为社员',
      onClick: handleBatchAdmit,
    },
    {
      key: 'role',
      icon: <TeamOutlined />,
      label: '分配角色',
      onClick: () => setRoleModalOpen(true),
    },
    {
      key: 'dept',
      icon: <ApartmentOutlined />,
      label: '修改部门',
      onClick: () => setDeptModalOpen(true),
    },
    { type: 'divider' },
    {
      key: 'freeze',
      icon: <LockOutlined />,
      label: '冻结账户',
      onClick: handleBatchFreeze,
    },
    {
      key: 'unfreeze',
      icon: <UnlockOutlined />,
      label: '解冻账户',
      onClick: handleBatchUnfreeze,
    },
    { type: 'divider' },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: <span style={{ color: '#ff4d4f' }}>删除用户</span>,
      onClick: handleBatchDelete,
    },
  ];

  // ─── 渲染 ─────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* 左侧：搜索 + 状态筛选 */}
        <Space size="middle">
          <Input
            placeholder="请输入姓名或学号进行搜索"
            prefix={<SearchOutlined />}
            style={{ width: 220 }}
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            allowClear
          />
          <Select
            placeholder="用户状态"
            style={{ width: 120 }}
            value={selectedStatus}
            onChange={onStatusChange}
          >
            {statusOptions.map((opt) => (
              <Option key={opt.value} value={opt.value}>{opt.label}</Option>
            ))}
          </Select>
        </Space>

        {/* 右侧：批量操作（仅选中时显示） */}
        {selectedRowsCount > 0 && (
          <Space>
            <Badge count={selectedRowsCount} size="small">
              <Dropdown menu={{ items: batchMenuItems }} trigger={['click']}>
                <Button type="primary" icon={<DownOutlined />} iconPosition="end">
                  批量操作
                </Button>
              </Dropdown>
            </Badge>
            <Button onClick={onClearSelection}>清除选择</Button>
          </Space>
        )}
      </div>

      {/* 批量分配角色弹窗 */}
      <Modal
        title="批量分配角色"
        open={roleModalOpen}
        onOk={handleBatchAssignRole}
        onCancel={() => { setRoleModalOpen(false); setSelectedRoleId(undefined); }}
        okText="确认分配"
        cancelText="取消"
      >
        <p>为已选 <b>{selectedRowsCount}</b> 名用户分配角色：</p>
        <Select
          style={{ width: '100%' }}
          placeholder="请选择角色"
          value={selectedRoleId}
          onChange={setSelectedRoleId}
        >
          {roleOptions.map((r) => (
            <Option key={r.value} value={r.value}>{r.label}</Option>
          ))}
        </Select>
      </Modal>

      {/* 批量修改部门弹窗 */}
      <Modal
        title="批量修改部门"
        open={deptModalOpen}
        onOk={handleBatchUpdateDept}
        onCancel={() => { setDeptModalOpen(false); setDeptValue(''); }}
        okText="确认修改"
        cancelText="取消"
      >
        <p>为已选 <b>{selectedRowsCount}</b> 名用户设置部门：</p>
        <Input
          placeholder="请输入部门名称"
          value={deptValue}
          onChange={(e) => setDeptValue(e.target.value)}
        />
      </Modal>
    </>
  );
};

export default Toolbar;