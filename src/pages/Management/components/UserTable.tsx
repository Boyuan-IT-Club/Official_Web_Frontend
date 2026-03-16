// src/pages/components/UserTable.tsx
import React from 'react';
import {
  Table, Space, Button, Tooltip, Tag, Avatar, Modal, Select, message,
} from 'antd';
import {
  EyeOutlined, LockOutlined, UnlockOutlined,
  UserOutlined, ExclamationCircleOutlined, DeleteOutlined,
} from '@ant-design/icons';

import {
  assignRoleToUser, freezeUser, unfreezeUser, deleteUser,
} from '@/api/manage/userApis';

const { Option } = Select;
const { confirm } = Modal;

// ─── 类型 ────────────────────────────────────────────────────────────────────

export interface User {
  createTime: string;
  dept: null | string;
  email: string;
  isMember: boolean;
  name: null | string;
  password: string;
  phone: null | string;
  role: string;
  status: boolean;   // true = 正常，false = 冻结
  userId: number;
  username: string;
  [property: string]: any;
}

interface RoleOption {
  value: string;
  label: string;
  color?: string;
}

interface UserTableProps {
  users: User[];
  loading: boolean;
  roleOptions: RoleOption[];
  selectedRows: User[];
  onSelectionChange: (selected: User[]) => void;
  onView: (user: User) => void;
  refreshUsers: () => void;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
}

// ─── 组件 ────────────────────────────────────────────────────────────────────

const UserTable: React.FC<UserTableProps> = ({
  users, loading, roleOptions,
  selectedRows, onSelectionChange,
  onView, refreshUsers, pagination,
}) => {

  /** 修改角色 */
  const handleChangeRole = (user: User, newRole: string) => {
    if (newRole === user.role) return;
    const newRoleLabel = roleOptions.find((r) => r.value === newRole)?.label ?? newRole;

    confirm({
      title: '确认修改角色？',
      icon: <ExclamationCircleOutlined />,
      content: (
        <span>
          确认将 <b>{user.name || user.username}</b> 的角色修改为 <b>{newRoleLabel}</b> 吗？
        </span>
      ),
      okText: '确认', cancelText: '取消',
      async onOk() {
        try {
          await assignRoleToUser(user.userId, [Number(newRole)]);
          message.success(`${user.name || user.username} 的角色已更新`);
          refreshUsers();
        } catch (e) {
          console.error(e);
          message.error('分配角色失败');
        }
      },
    });
  };

  /** 冻结 / 解冻 */
  const handleToggleFreeze = (user: User) => {
    const isFrozen = user.status === false;
    confirm({
      title: isFrozen ? '确认解冻该用户？' : '确认冻结该用户？',
      icon: <ExclamationCircleOutlined />,
      content: <span>用户：<b>{user.name || user.username}</b>（{user.username}）</span>,
      okText: isFrozen ? '解冻' : '冻结',
      okType: isFrozen ? 'primary' : 'danger',
      cancelText: '取消',
      async onOk() {
        try {
          isFrozen ? await unfreezeUser(user.userId) : await freezeUser(user.userId);
          message.success(`${user.name || user.username} 操作成功`);
          refreshUsers();
        } catch (e) {
          console.error(e);
          message.error('操作失败，请稍后重试');
        }
      },
    });
  };

  /** 删除用户 */
  const handleDelete = (user: User) => {
    confirm({
      title: '确认删除该用户？',
      icon: <ExclamationCircleOutlined />,
      content: <span>此操作不可恢复，确认删除 <b>{user.name || user.username}</b> 吗？</span>,
      okText: '删除', okType: 'danger', cancelText: '取消',
      async onOk() {
        try {
          await deleteUser(user.userId);
          message.success('删除成功');
          refreshUsers();
        } catch (e) {
          console.error(e);
          message.error('删除失败，请稍后重试');
        }
      },
    });
  };

  // ─── 列定义 ───────────────────────────────────────────────────────────────

  const columns = [
    {
      title: '用户信息',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: User) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#4da6ff', flexShrink: 0 }} />
          <div style={{ marginLeft: 12 }}>
            <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center' }}>
              {text || record.username || '未知昵称'}
              {record.status === false && (
                <Tooltip title="账户已冻结">
                  <LockOutlined style={{ color: '#ff4d4f', marginLeft: 4, fontSize: 12 }} />
                </Tooltip>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>{record.username}</div>
          </div>
        </div>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string, record: User) => (
        <Select
          size="small"
          style={{ minWidth: 120 }}
          value={role ? String(role) : undefined}
          onChange={(value: string) => handleChangeRole(record, value)}
          placeholder="暂无角色"
        >
          {roleOptions.map((r) => (
            <Option key={r.value} value={r.value}>{r.label}</Option>
          ))}
        </Select>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: boolean) => (
        <Tag color={status ? 'green' : 'red'}>{status ? '正常' : '冻结'}</Tag>
      ),
    },
    {
      title: '部门',
      key: 'memberDept',
      render: (_: any, record: User) => {
        if (!record.isMember) {
          return <Tag color="default">非社员</Tag>;
        }
        return record.dept
          ? <Tag color="blue" style={{ borderRadius: 4 }}>{record.dept}</Tag>
          : <Tag color="blue">社员</Tag>;
      },
    },
    {
      title: '联系方式',
      key: 'contact',
      render: (_: any, record: User) => (
        <div>
          <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 2 }}>
            {record.phone || '暂无手机'}
          </div>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>
            {record.email || '暂无邮箱'}
          </div>
        </div>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: User) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button type="text" icon={<EyeOutlined />} size="small" onClick={() => onView(record)} />
          </Tooltip>
          <Tooltip title={record.status === false ? '解冻账户' : '冻结账户'}>
            <Button
              type="text"
              danger={record.status !== false}
              icon={record.status === false ? <UnlockOutlined /> : <LockOutlined />}
              size="small"
              onClick={() => handleToggleFreeze(record)}
            />
          </Tooltip>
          <Tooltip title="删除用户">
            <Button type="text" danger icon={<DeleteOutlined />} size="small" onClick={() => handleDelete(record)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // ─── 渲染 ─────────────────────────────────────────────────────────────────

  return (
    <Table<User>
      rowSelection={{
        selectedRowKeys: selectedRows.map((u) => u.userId),
        onChange: (_: React.Key[], rows: User[]) => onSelectionChange(rows),
      }}
      columns={columns}
      dataSource={users}
      rowKey="userId"
      loading={loading}
      pagination={{
        current:         pagination.current,
        pageSize:        pagination.pageSize,
        total:           pagination.total,
        onChange:        pagination.onChange,
        showSizeChanger: true,
        pageSizeOptions: ['10', '20', '50'],
        showTotal:       (t) => `共 ${t} 条数据`,
      }}
      locale={{ emptyText: '暂无用户数据' }}
      scroll={{ x: 'max-content' }}
    />
  );
};

export default UserTable;