// src/pages/components/UserTable.tsx
import React from 'react';
import {
  Table,
  Space,
  Button,
  Tooltip,
  Tag,
  Avatar,
  Modal,
  Select,
  message,
} from 'antd';
import {
  EyeOutlined,
  LockOutlined,
  UnlockOutlined,
  UserOutlined,
  ExclamationCircleOutlined,
  DeleteOutlined,
} from '@ant-design/icons';

import {
  assignRoleToUser,
  freezeUser,
  unfreezeUser,
  deleteUser,
} from '@/api/manage/userRole';

const { Option } = Select;
const { confirm } = Modal;

// 确认这是你后端准确的结构
export interface User {
  createTime: string;
  dept: null | string;
  email: string;
  isMember: boolean;
  name: null | string;
  password: string;
  phone: null | string;
  role: string;
  status: boolean; //  冻结（false）或正常（true）
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
  users: User[];              // 父组件传来的用户列表
  loading: boolean;           // 父组件传来的加载状态
  roleOptions: RoleOption[];  // 父组件传来的角色列表
  selectedRows: User[];
  onSelectionChange: (selected: User[]) => void;
  onView: (user: User) => void;
  refreshUsers: () => void;   // 调用父组件的方法重新拉取数据
}

const UserManage: React.FC<UserTableProps> = ({
  users,
  loading,
  roleOptions,
  onView,
  refreshUsers,
}) => {

  /** 修改角色 */
  const handleChangeRole = (user: User, newRole: string) => {
    if (newRole === user.role) return;

    const newRoleConf = roleOptions.find((r) => r.value === newRole);
    const newRoleLabel = newRoleConf?.label || newRole;

    confirm({
      title: '确认修改角色？',
      icon: <ExclamationCircleOutlined />,
      content: (
        <span>
          确认将 <b>{user.name || user.username}</b> 的角色修改为 <b>{newRoleLabel}</b> 吗？
        </span>
      ),
      okText: '确认',
      cancelText: '取消',
      async onOk() {
        try {
          // 注意：如果后端报错，检查这里的参数是不是需要数字，或者数组
          await assignRoleToUser(user.userId, [Number(newRole)]); 
          message.success(`${user.name || user.username} 的角色已更新`);
          refreshUsers(); // 操作成功，通知父组件刷新表格！
        } catch (e) {
          console.error(e);
          message.error('分配角色失败，请检查后端报错');
        }
      },
    });
  };

  /** 冻结 / 解冻 */
  const handleToggleFreeze = (user: User) => {
    const isFrozen = user.status === false;  // status 为 false 表示冻结
    
    confirm({
      title: isFrozen ? '确认解冻该用户？' : '确认冻结该用户？',
      icon: <ExclamationCircleOutlined />,
      content: (
        <span>
          用户：<b>{user.name || user.username}</b>（账号：{user.username}）
        </span>
      ),
      okText: isFrozen ? '解冻' : '冻结',
      okType: isFrozen ? 'primary' : 'danger',
      cancelText: '取消',
      async onOk() {
        try {
          if (isFrozen) {
            await unfreezeUser(user.userId);
          } else {
            await freezeUser(user.userId);
          }
          message.success(`${user.name || user.username} 操作成功`);
          refreshUsers(); // 操作成功，通知父组件刷新表格！
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
      content: (
        <span>
          此操作不可恢复，确认要删除 <b>{user.name || user.username}</b> 吗？
        </span>
      ),
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      async onOk() {
        try {
          await deleteUser(user.userId); 
          message.success('删除成功');
          refreshUsers(); // 操作成功，通知父组件刷新表格！
        } catch (e) {
          console.error(e);
          message.error('删除失败，请稍后重试');
        }
      },
    });
  };

  const columns = [
    {
      title: '用户信息',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: User) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#4da6ff' }} />
          <div style={{ marginLeft: 12 }}>
            <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center' }}>
              {text || record.username || '未知昵称'}
              {record.status === false && (
                <Tooltip title="账户已冻结">
                  <LockOutlined style={{ color: '#ff4d4f', marginLeft: 4, fontSize: 12 }} />
                </Tooltip>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>
              {record.username}
            </div>
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
          value={role ? String(role) : undefined} // 确保匹配字符串类型
          onChange={(value: string) => handleChangeRole(record, value)}
          placeholder="暂无角色"
        >
          {roleOptions.map((r) => (
            <Option key={r.value} value={r.value}>
              {r.label}
            </Option>
          ))}
        </Select>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: boolean) => (
        <Tag color={status ? 'green' : 'red'}>
          {status ? '正常' : '冻结'}
        </Tag>
      ),
    },
    {
      title: '社员状态',
      dataIndex: 'isMember',
      key: 'isMember',
      render: (isMember: boolean) => (
        <Tag color={isMember ? 'blue' : 'default'}>
          {isMember ? '社员' : '非社员'}
        </Tag>
      ),
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
            <Button
              type="text"
              icon={<EyeOutlined />}
              size="small"
              onClick={() => onView(record)}
            />
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
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              size="small"
              onClick={() => handleDelete(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Table<User>
      columns={columns}
      dataSource={users}
      rowKey="userId" 
      loading={loading}
      pagination={{ 
        pageSize: 10,
        showTotal: (total) => `共 ${total} 条数据` 
      }}
      locale={{ emptyText: '暂无用户数据' }}
    />
  );
};

export default UserManage;