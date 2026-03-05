import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Tabs, message, Button } from 'antd';
import { TeamOutlined, LockOutlined, CheckOutlined, AppstoreOutlined } from '@ant-design/icons';
import { fetchResumeFieldsConfig, ResumeField } from '@/store/modules/resumeFields';
import { getUsersByRole, getUserRoles_me } from '@/api/manage';
import StatsCard from './components/StatsCard';
import Toolbar from './components/Toolbar';
import UserTable, { User } from './components/UserTable';
import ResumeFieldModal from './components/ResumeFieldModal';
import PromptModal from './components/PromptModal';

const Management: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedRows, setSelectedRows] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState('users');
  const [searchText, setSearchText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [resumeFields, setResumeFields] = useState<ResumeField[]>([]);
  const [formPrompts, setFormPrompts] = useState<any[]>([]);
  const [isResumeModalVisible, setIsResumeModalVisible] = useState(false);
  const [isPromptModalVisible, setIsPromptModalVisible] = useState(false);

  const roleOptions = [
    { value: '1', label: '超级管理员', color: 'red' },
    { value: '2', label: '管理员', color: 'orange' },
    { value: '3', label: '社员', color: 'blue' },
    { value: '4', label: '申请人', color: 'gray' },
  ];

  // 初始化用户列表
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const myRoles = await getUserRoles_me();

        const res = await getUsersByRole(3); // 举例获取社员
        const allUsers: User[] = [];
        res.data?.forEach((role: any) => {
          if (role.users) {
            role.users.forEach((u: any) =>
              allUsers.push({
                id: u.id,
                name: u.name,
                studentId: u.studentId,
                avatar: u.avatar,
                phone: u.phone,
                email: u.email,
                role: role.roleId.toString(),
                status: u.status,
              })
            );
          }
        });
        setUsers(allUsers);
      } catch (e) {
        console.error(e);
        message.error('获取用户列表失败');
      }
    };
    fetchUsers();
  }, []);

  const filteredUsers = users.filter((u) => {
    if (selectedStatus !== 'all' && u.status !== selectedStatus) return false;
    if (!searchText) return true;
    const key = searchText.toLowerCase();
    return u.name.toLowerCase().includes(key) || u.studentId.toLowerCase().includes(key);
  });

  const handleToggleFreeze = (user: User) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, status: u.status === 'frozen' ? 'active' : 'frozen' } : u))
    );
    message.success(`${user.status === 'frozen' ? '解冻' : '冻结'}成功`);
  };

  const handleAdmitUser = (user: User) => {
    message.success(`已录取 ${user.name} 为社员`);
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: '3' } : u)));
  };

  const handleBatchAssignRole = () => {
    // 可加批量分配逻辑
  };

  return (
    <div className="management-page">
      {/* 统计卡片 */}
      <Row gutter={[24, 24]} className="stats-row">
        <Col xs={24} sm={12} md={6}>
          <StatsCard
            icon={<TeamOutlined style={{ fontSize: 24, color: '#4da6ff' }} />}
            value={users.length}
            title="总用户数"
            bgColor="rgba(77,166,255,0.1)"
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatsCard
            icon={<LockOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />}
            value={users.filter((u) => u.status === 'frozen').length}
            title="冻结账户"
            bgColor="rgba(255,77,79,0.1)"
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatsCard
            icon={<CheckOutlined style={{ fontSize: 24, color: '#52c41a' }} />}
            value={users.filter((u) => u.status === 'pending').length}
            title="待审核"
            bgColor="rgba(82,196,26,0.1)"
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatsCard
            icon={<AppstoreOutlined style={{ fontSize: 24, color: '#fa8c16' }} />}
            value={users.filter((u) => u.role === '3').length}
            title="社员人数"
            bgColor="rgba(250,140,22,0.1)"
          />
        </Col>
      </Row>

      {/* Tabs */}
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
                    searchText={searchText}
                    onSearchChange={setSearchText}
                    selectedStatus={selectedStatus}
                    onStatusChange={setSelectedStatus}
                    statusOptions={[]}
                    selectedRowsCount={selectedRows.length}
                    onBatchAdmit={handleBatchAssignRole}
                    onClearSelection={() => setSelectedRows([])}
                  />
                  <UserTable
                    users={filteredUsers}
                    roleOptions={roleOptions}
                    selectedRows={selectedRows}
                    onSelectionChange={setSelectedRows}
                    onView={(u) => message.info(`查看用户 ${u.name}`)}
                    onToggleFreeze={handleToggleFreeze}
                    onAdmit={handleAdmitUser}
                  />
                </>
              ),
            },
            {
              key: 'settings',
              label: '系统配置',
              children: (
                <>
                  {/* 系统配置按钮 */}
                  <Button
                    type="primary"
                    style={{ marginBottom: 16 }}
                    onClick={() => setIsResumeModalVisible(true)}
                  >
                    编辑简历字段
                  </Button>
                  <Button
                    type="default"
                    style={{ marginLeft: 16, marginBottom: 16 }}
                    onClick={() => setIsPromptModalVisible(true)}
                  >
                    编辑报名提示
                  </Button>

                  {/* Modal 放置在页面任意位置 */}
                  <ResumeFieldModal
                    visible={isResumeModalVisible}
                    onCancel={() => setIsResumeModalVisible(false)}
                    onSave={setResumeFields}
                    fields={resumeFields}
                    fieldTypeOptions={[
                      { value: 'input', label: '文本框' },
                      { value: 'textarea', label: '多行文本' },
                      { value: 'radio', label: '单选' },
                      { value: 'checkbox', label: '多选' },
                      { value: 'select', label: '下拉选择' },
                      { value: 'custom', label: '照片' },
                    ]}
                    loading={false}
                  />
                  <PromptModal
                    visible={isPromptModalVisible}
                    onCancel={() => setIsPromptModalVisible(false)}
                    onSave={setFormPrompts}
                    prompts={formPrompts}
                  />
                </>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default Management;
