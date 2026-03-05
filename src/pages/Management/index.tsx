import React, { useState } from 'react';
import { Row, Col, Card, Tabs } from 'antd';
import { TeamOutlined, LockOutlined, CheckOutlined, AppstoreOutlined } from '@ant-design/icons';
import StatsCard from './components/StatsCard';
import Toolbar from './components/Toolbar';
import UserTable, { User } from './components/UserTable';
import ResumeFieldPanel from './components/ResumeFieldPanel';
import PromptPanel from './components/PromptPanel';

const Management: React.FC = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [activeConfigTab, setActiveConfigTab] = useState('resume');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedRows, setSelectedRows] = useState<User[]>([]);
  const [resumeFields, setResumeFields] = useState<any[]>([]);
  const [formPrompts, setFormPrompts] = useState<any[]>([]);

  const roleOptions = [
    { value: '1', label: '超级管理员', color: 'red' },
    { value: '2', label: '管理员', color: 'orange' },
    { value: '3', label: '社员', color: 'blue' },
    { value: '4', label: '申请人', color: 'gray' },
  ];

  return (
    <div className="management-page">
      {/* 统计卡片 */}
      <Row gutter={[24, 24]} className="stats-row">
        <Col xs={24} sm={12} md={6}>
          <StatsCard icon={<TeamOutlined style={{ fontSize: 24 }} />} value={users.length} title="总用户数" bgColor="rgba(77,166,255,0.1)" />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatsCard icon={<LockOutlined style={{ fontSize: 24 }} />} value={users.filter(u => u.status === 'frozen').length} title="冻结账户" bgColor="rgba(255,77,79,0.1)" />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatsCard icon={<CheckOutlined style={{ fontSize: 24 }} />} value={users.filter(u => u.status === 'pending').length} title="待审核" bgColor="rgba(82,196,26,0.1)" />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatsCard icon={<AppstoreOutlined style={{ fontSize: 24 }} />} value={users.filter(u => u.role === '3').length} title="社员人数" bgColor="rgba(250,140,22,0.1)" />
        </Col>
      </Row>

      <Card className="main-card">
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
          {
            key: 'users',
            label: '用户管理',
            children: (
              <>
                <Toolbar searchText="" onSearchChange={() => {}} selectedStatus="all" onStatusChange={() => {}} statusOptions={[]} selectedRowsCount={selectedRows.length} onBatchAdmit={() => {}} onClearSelection={() => setSelectedRows([])} />
                <UserTable users={users} roleOptions={roleOptions} selectedRows={selectedRows} onSelectionChange={setSelectedRows} onView={() => {}} onToggleFreeze={() => {}} onAdmit={() => {}} />
              </>
            ),
          },
          {
            key: 'settings',
            label: '系统配置',
            children: (
              <Tabs activeKey={activeConfigTab} onChange={setActiveConfigTab} items={[
                {
                  key: 'resume',
                  label: '简历字段',
                  children: <ResumeFieldPanel fields={resumeFields} onSave={setResumeFields} fieldTypeOptions={[
                    { value: 'input', label: '文本框' },
                    { value: 'textarea', label: '多行文本' },
                    { value: 'radio', label: '单选' },
                    { value: 'checkbox', label: '多选' },
                    { value: 'select', label: '下拉选择' },
                    { value: 'custom', label: '照片' },
                  ]} />,
                },
                {
                  key: 'prompt',
                  label: '报名提示',
                  children: <PromptPanel prompts={formPrompts} onSave={setFormPrompts} />,
                }
              ]} />
            ),
          }
        ]} />
      </Card>
    </div>
  );
};

export default Management;
