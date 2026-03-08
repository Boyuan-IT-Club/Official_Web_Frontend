// src/pages/index.tsx
import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Tabs, message } from 'antd';
import {
  TeamOutlined,
  LockOutlined,
  CheckOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import StatsCard from './components/StatsCard';
import Toolbar from './components/Toolbar';
import UserTable, { User } from './components/UserTable';
import ResumeFieldPanel from './components/ResumeFieldPanel';
import RoleManager from './components/RoleManager';
import PromptPanel from './components/PromptPanel';

import {
  getAllUsers,
  getActiveRoles,
} from '@/api/manage/userRole';

// 角色选项类型
export interface RoleOption {
  value: string;
  label: string;
  color?: string;
}

const Management: React.FC = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [activeConfigTab, setActiveConfigTab] = useState('resume');

  const [users, setUsers] = useState<User[]>([]);
  const [selectedRows, setSelectedRows] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(false); // 统一管理 loading 状态

  const [resumeFields, setResumeFields] = useState<any[]>([]);
  const [formPrompts, setFormPrompts] = useState<any[]>([]);
  const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]);

  /** 拉取用户列表 */
  const fetchUsers = async () => {
    setLoading(true);
    try {
      
      const res: any = await getAllUsers();
      console.log('【1. 后端返回的用户原始数据】:', res);
      const list = res?.data?.content || (Array.isArray(res?.data) ? res.data : []);

      setUsers(list);
    } catch (e) {
      console.error(e);
      message.error('获取用户列表失败');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  /** 拉取可分配角色列表 */
  const fetchRoleOptions = async () => {
    try {
      const res: any = await getActiveRoles();
      const serverRoles = res?.data || res || [];
      const options: RoleOption[] = (Array.isArray(serverRoles) ? serverRoles : []).map(
        (r: any): RoleOption => ({
          value: String(r.id), // 根据你的后端实际字段可能是 r.roleId
          label: r.name,
        }),
      );
      setRoleOptions(options);
    } catch (e) {
      console.error(e);
      message.error('获取角色列表失败');
      setRoleOptions([]);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoleOptions();
  }, []);

  /** 查看用户详情 */
  const handleViewUser = (user: User) => {
    console.log('查看用户详情', user);
  };

  return (
    <div className="management-page">
      {/* 统计卡片：修复了判定逻辑，完全基于你的 User 接口 */}
      <Row gutter={[24, 24]} className="stats-row">
        <Col xs={24} sm={12} md={6}>
          <StatsCard
            icon={<TeamOutlined style={{ fontSize: 24 }} />}
            value={users.length}
            title="总用户数"
            bgColor="rgba(77,166,255,0.1)"
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatsCard
            icon={<LockOutlined style={{ fontSize: 24 }} />}
            value={users.filter((u) => u.status === false).length} // 修正：false 代表冻结
            title="冻结账户"
            bgColor="rgba(255,77,79,0.1)"
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatsCard
            icon={<CheckOutlined style={{ fontSize: 24 }} />}
            value={users.filter((u) => u.isMember === false).length} // 修正：假设 isMember 为 false 是待审核/非社员
            title="非社员/待审核"
            bgColor="rgba(82,196,26,0.1)"
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatsCard
            icon={<AppstoreOutlined style={{ fontSize: 24 }} />}
            value={users.filter((u) => u.isMember === true).length} // 修正：基于 isMember 统计社员
            title="社员人数"
            bgColor="rgba(250,140,22,0.1)"
          />
        </Col>
      </Row>

      <Card className="main-card">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'users',
              label: '用户管理',
              children: (
                <>
                  <Toolbar
                    searchText=""
                    onSearchChange={() => {}}
                    selectedStatus="all"
                    onStatusChange={() => {}}
                    statusOptions={[]}
                    selectedRowsCount={selectedRows.length}
                    onBatchAdmit={() => {}}
                    onClearSelection={() => setSelectedRows([])}
                  />
                  {/* 将数据和刷新方法直接传给子组件 */}
                  <UserTable
                    users={users}
                    loading={loading}
                    roleOptions={roleOptions}
                    selectedRows={selectedRows}
                    onSelectionChange={setSelectedRows}
                    onView={handleViewUser}
                    refreshUsers={fetchUsers} 
                  />
                </>
              ),
            },
            {
              key: 'roles',
              label: '角色管理',
              children: <RoleManager />,
            },
            {
              key: 'resume',
              label: '简历设置',
              children: (

                <Tabs

                  activeKey={activeConfigTab}
                  onChange={setActiveConfigTab}
                  items={[
                    {
                      key: 'resume',
                      label: '简历字段',
                      children: (
                        <ResumeFieldPanel
                          fields={resumeFields}
                          onSave={setResumeFields}
                          fieldTypeOptions={[
                            { value: 'input', label: '文本框' },
                            { value: 'textarea', label: '多行文本' },
                            { value: 'radio', label: '单选' },
                            { value: 'checkbox', label: '多选' },
                            { value: 'select', label: '下拉选择' },
                            { value: 'custom', label: '照片' },
                          ]}
                        />
                      ),
                    },
                    {
                      key: 'prompt',
                      label: '报名提示',
                      children: (
                        <PromptPanel
                          prompts={formPrompts}
                          onSave={setFormPrompts}
                        />
                      ),
                    },
                  ]}
                />
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default Management;