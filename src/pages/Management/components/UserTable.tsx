import React, { useState } from 'react';
import { Table, Space, Button, Tooltip, Tag, Avatar, Modal, Select, message } from 'antd';
import { EyeOutlined, SettingOutlined, LockOutlined, UnlockOutlined, CheckOutlined, UserOutlined } from '@ant-design/icons';
import { assignRoleToUser } from '@/api/manage/userRole';

const { Option } = Select;

export interface User {
  id: number;
  name: string;
  studentId: string;
  avatar: string;
  phone: string;
  email: string;
  role: string;
  status: 'active' | 'frozen' | 'pending';
}

interface UserTableProps {
  users: User[];
  roleOptions: { value: string; label: string; color: string }[];
  selectedRows: User[];
  onSelectionChange: (selected: User[]) => void;
  onView: (user: User) => void;
  onToggleFreeze: (user: User) => void;
  onAdmit: (user: User) => void;
  refreshUsers?: () => void;
}

const UserTable: React.FC<UserTableProps> = ({ users, roleOptions, selectedRows, onSelectionChange, onView, onToggleFreeze, onAdmit, refreshUsers }) => {
  const [tempRole, setTempRole] = useState<string | null>(null);

  const handleAssignRole = (user: User) => {
    setTempRole(user.role);
    Modal.confirm({
      title: '分配权限',
      content: (
        <Select
          value={tempRole}
          style={{ width: '100%', marginTop: 16 }}
          onChange={(value: string) => setTempRole(value)}
        >
          {roleOptions.map(r => <Option key={r.value} value={r.value}>{r.label}</Option>)}
        </Select>
      ),
      async onOk() {
        if (!tempRole) return;
        try {
          await assignRoleToUser(user.id, [parseInt(tempRole)]);
          message.success(`${user.name} 的角色已更新`);
          refreshUsers?.();
        } catch (error) {
          console.error(error);
          message.error('分配失败');
        }
      },
    });
  };

  const rowSelection = {
    selectedRowKeys: selectedRows.map(r => r.id),
    onChange: (_: any, selected: User[]) => onSelectionChange(selected),
  };

  const columns = [
    {
      title: '用户信息',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: User) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Avatar src={record.avatar} icon={<UserOutlined />} style={{ backgroundColor: '#4da6ff' }} />
          <div style={{ marginLeft: 12 }}>
            <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center' }}>
              {text}
              {record.status === 'frozen' && <Tooltip title="账户已冻结"><LockOutlined style={{ color: '#ff4d4f', marginLeft: 4, fontSize: 12 }}/></Tooltip>}
            </div>
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>{record.studentId}</div>
          </div>
        </div>
      ),
    },
    {
      title: '权限',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        const roleConfig = roleOptions.find(r => r.value === role);
        return roleConfig ? <Tag color={roleConfig.color}>{roleConfig.label}</Tag> : <Tag>{role}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: User['status']) => {
        const statusMap = { active:{text:'正常',color:'green'}, frozen:{text:'冻结',color:'red'}, pending:{text:'待审核',color:'orange'} };
        return <Tag color={statusMap[status]?.color}>{statusMap[status]?.text}</Tag>;
      },
    },
    {
      title: '联系方式',
      key: 'contact',
      render: (_: any, record: User) => (
        <div>
          <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 2 }}>{record.phone}</div>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>{record.email}</div>
        </div>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: User) => (
        <Space size="small">
          <Tooltip title="查看详情"><Button type="text" icon={<EyeOutlined />} size="small" onClick={()=>onView(record)} /></Tooltip>
          <Tooltip title="分配权限"><Button type="text" icon={<SettingOutlined />} size="small" onClick={()=>handleAssignRole(record)} /></Tooltip>
          <Tooltip title={record.status==='frozen'?'解冻账户':'冻结账户'}>
            <Button type="text" danger={record.status!=='frozen'} icon={record.status==='frozen'?<UnlockOutlined/>:<LockOutlined/>} size="small" onClick={()=>onToggleFreeze(record)}/>
          </Tooltip>
          <Tooltip title="录取为社员"><Button type="text" style={{color:'#52c41a'}} icon={<CheckOutlined/>} size="small" onClick={()=>onAdmit(record)}/></Tooltip>
        </Space>
      ),
    },
  ];

  return <Table columns={columns} dataSource={users} rowKey="id" rowSelection={rowSelection} pagination={{ pageSize: 10 }} locale={{ emptyText: '暂无用户数据' }}/>;
};

export default UserTable;
