// src/pages/components/UserToolbar.tsx
import React, { useState } from 'react';
import {
  Space, Input, Select, Button, Badge, Dropdown,
  Modal, message,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  SearchOutlined, CheckOutlined, DownOutlined,
  LockOutlined, UnlockOutlined, DeleteOutlined,
  TeamOutlined, ApartmentOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons';

import {
  batchAdmitAsMember, assignRoleToUsers,
  batchFreezeUsers, batchUnfreezeUsers,
  batchUpdateUserDept, deleteUser,
  batchDismissMember
} from '@/api/manage/userApis';

import { User } from './UserTable';

const { Option } = Select;
const { confirm } = Modal;

// ─── Props ────────────────────────────────────────────────────────────────────

interface RoleOption {
  value: string;
  label: string;
}

export interface ToolbarProps {
  // 搜索
  searchText: string;
  onSearchChange: (value: string) => void;

  // 状态筛选
  selectedStatus: string;
  onStatusChange: (value: string) => void;
  statusOptions: { value: string; label: string }[];

  // 角色筛选
  selectedRole: string;
  onRoleChange: (value: string) => void;

  // 部门筛选
  selectedDept: string;
  onDeptChange: (value: string) => void;

  // 批量操作
  selectedRowIds: number[];
  selectedRowsCount: number;
  selectedRows: User[];         // 完整行数据，用于批量录取时过滤社员
  roleOptions: RoleOption[];
  onClearSelection: () => void;
  refreshUsers: () => void;
}

// ─── 组件 ────────────────────────────────────────────────────────────────────

const Toolbar: React.FC<ToolbarProps> = ({
  searchText, onSearchChange,
  selectedStatus, onStatusChange, statusOptions,
  selectedRole, onRoleChange,
  selectedDept, onDeptChange,
  selectedRowIds, selectedRowsCount, selectedRows,
  roleOptions, onClearSelection, refreshUsers,
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

  // ── 批量录取社员（在此处过滤已是社员的行） ──────────────────────────────
  const handleBatchAdmit = () => {
    const targets = selectedRows.filter((u) => !u.isMember);

    if (targets.length === 0) {
      message.warning('所选用户均已是社员，无需重复操作');
      return;
    }

    // 有部分已是社员，给出提示
    const skipped = selectedRowsCount - targets.length;

    confirm({
      title: '确认批量录取为社员？',
      icon: <ExclamationCircleOutlined />,
      content: (
        <span>
          将 <b>{targets.length}</b> 名用户录取为社员，此操作不可撤销。
          {skipped > 0 && (
            <span style={{ color: '#faad14', display: 'block', marginTop: 4 }}>
              （已自动跳过 {skipped} 名已是社员的用户）
            </span>
          )}
        </span>
      ),
      okText: '确认录取',
      cancelText: '取消',
      async onOk() {
        try {
          await batchAdmitAsMember(true,targets.map((u) => u.userId));
          message.success(`成功录取 ${targets.length} 名社员`);
          onClearSelection();
          refreshUsers();
        } catch (e) {
          console.error(e);
          message.error('批量录取失败');
        }
      },
    });
  };

  // ── 批量开除社员（在此处过滤已不是社员的行） ──────────────────────────────
   const handleBatchDismiss = () => {
    const targets = selectedRows.filter((u) => u.isMember);
 
    if (targets.length === 0) {
      message.warning('所选用户中没有社员，无需操作');
      return;
    }
 
    const skipped = selectedRowsCount - targets.length;
 
    confirm({
      title: '确认批量开除社员？',
      icon: <ExclamationCircleOutlined />,
      content: (
        <span>
          将 <b>{targets.length}</b> 名社员开除，此操作不可撤销。
          {skipped > 0 && (
            <span style={{ color: '#faad14', display: 'block', marginTop: 4 }}>
              （已自动跳过 {skipped} 名非社员）
            </span>
          )}
        </span>
      ),
      okText: '确认开除',
      okType: 'danger',
      cancelText: '取消',
      async onOk() {
        try {
          await batchDismissMember(false, targets.map((u) => u.userId));
          message.success(`已开除 ${targets.length} 名社员`);
          onClearSelection();
          refreshUsers();
        } catch (e) {
          console.error(e);
          message.error('批量开除失败');
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
      okText: '确认冻结', okType: 'danger', cancelText: '取消',
      async onOk() {
        try {
          await batchFreezeUsers(selectedRowIds);
          message.success(`已冻结 ${selectedRowsCount} 名用户`);
          onClearSelection(); refreshUsers();
        } catch (e) { console.error(e); message.error('批量冻结失败'); }
      },
    });
  };

  // ── 批量解冻 ────────────────────────────────────────────────────────────
  const handleBatchUnfreeze = () => {
    confirm({
      title: '确认批量解冻所选用户？',
      icon: <ExclamationCircleOutlined />,
      content: <span>将解冻 <b>{selectedRowsCount}</b> 名用户账户。</span>,
      okText: '确认解冻', cancelText: '取消',
      async onOk() {
        try {
          await batchUnfreezeUsers(selectedRowIds);
          message.success(`已解冻 ${selectedRowsCount} 名用户`);
          onClearSelection(); refreshUsers();
        } catch (e) { console.error(e); message.error('批量解冻失败'); }
      },
    });
  };

  

  // ── 批量删除 ────────────────────────────────────────────────────────────
  const handleBatchDelete = () => {
    confirm({
      title: '确认批量删除所选用户？',
      icon: <ExclamationCircleOutlined />,
      content: <span>此操作不可恢复，将删除 <b>{selectedRowsCount}</b> 名用户。</span>,
      okText: '确认删除', okType: 'danger', cancelText: '取消',
      async onOk() {
        try {
          await Promise.all(selectedRowIds.map((id) => deleteUser(id)));
          message.success(`已删除 ${selectedRowsCount} 名用户`);
          onClearSelection(); refreshUsers();
        } catch (e) { console.error(e); message.error('批量删除失败'); }
      },
    });
  };

  // ── 下拉菜单项 ──────────────────────────────────────────────────────────
  const batchMenuItems: MenuProps['items'] = [
    { key: 'admit',    icon: <CheckOutlined />,     label: '录取为社员', onClick: handleBatchAdmit },
    { key: 'role',     icon: <TeamOutlined />,      label: '分配角色',   onClick: () => setRoleModalOpen(true) },
    { key: 'dept',     icon: <ApartmentOutlined />, label: '修改部门',   onClick: () => setDeptModalOpen(true) },
    {
      key: 'dismiss',
      icon: <DeleteOutlined />,
      label: <span style={{ color: '#ff4d4f' }}>开除社员</span>,
      onClick: handleBatchDismiss,
    },
    { type: 'divider' },
    { key: 'freeze',   icon: <LockOutlined />,      label: '冻结账户',   onClick: handleBatchFreeze },
    { key: 'unfreeze', icon: <UnlockOutlined />,    label: '解冻账户',   onClick: handleBatchUnfreeze },
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        {/* 左侧：搜索 + 多维筛选 */}
        <Space size="small" wrap>
          <Input
            placeholder="姓名或学号"
            prefix={<SearchOutlined />}
            style={{ width: 200 }}
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            allowClear
          />
          <Select
            placeholder="账号状态"
            style={{ width: 100 }}
            value={selectedStatus || undefined}
            onChange={(v) => onStatusChange(v ?? '')}
            allowClear
            onClear={() => onStatusChange('')}
          >
            {statusOptions
              .filter((o) => o.value !== '')
              .map((opt) => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
          </Select>
          <Select
            placeholder="角色"
            style={{ width: 100 }}
            value={selectedRole || undefined}
            onChange={(v) => onRoleChange(v ?? '')}
            allowClear
            onClear={() => onRoleChange('')}
          >
            {roleOptions.map((r) => (
              <Option key={r.value} value={r.value}>{r.label}</Option>
            ))}
          </Select>
          <Input
            placeholder="部门"
            style={{ width: 110 }}
            value={selectedDept}
            onChange={(e) => onDeptChange(e.target.value)}
            allowClear
          />
        </Space>

        {/* 右侧：批量操作 */}
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
        okText="确认分配" cancelText="取消"
      >
        <p>为已选 <b>{selectedRowsCount}</b> 名用户分配角色：</p>
        <Select style={{ width: '100%' }} placeholder="请选择角色" value={selectedRoleId} onChange={setSelectedRoleId}>
          {roleOptions.map((r) => <Option key={r.value} value={r.value}>{r.label}</Option>)}
        </Select>
      </Modal>

      {/* 批量修改部门弹窗 */}
      <Modal
        title="批量修改部门"
        open={deptModalOpen}
        onOk={handleBatchUpdateDept}
        onCancel={() => { setDeptModalOpen(false); setDeptValue(''); }}
        okText="确认修改" cancelText="取消"
      >
        <p>为已选 <b>{selectedRowsCount}</b> 名用户设置部门：</p>
        <Input placeholder="请输入部门名称" value={deptValue} onChange={(e) => setDeptValue(e.target.value)} />
      </Modal>
    </>
  );
};

export default Toolbar;