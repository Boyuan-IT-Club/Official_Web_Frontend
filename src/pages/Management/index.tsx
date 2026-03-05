import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Tabs, message, Modal, Select } from 'antd';
import { TeamOutlined, LockOutlined, CheckOutlined, AppstoreOutlined } from '@ant-design/icons';
import { fetchResumeFieldsConfig, ResumeField } from '@/store/modules/resumeFields';
import { getUsersByRole, getUserRoles_me } from '@/api/manage';
import StatsCard from './components/StatsCard';
import Toolbar from './components/Toolbar';
import UserTable, { User } from './components/UserTable';
import ResumeFieldModal from './components/ResumeFieldModal';
import PromptModal from './components/PromptModal';

const { Option } = Select;

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
        // 获取当前登录用户角色（可用于页面权限控制）
        const myRoles = await getUserRoles_me();

        // 获取角色列表
        const res = await getUsersByRole(3); // 这里举例获取社员，后续可循环获取不同角色
        // res.data 是 Role[]
        const allUsers: User[] = [];
        res.data?.forEach((role: any) => {
          if(role.users) {
            role.users.forEach((u:any) => allUsers.push({
              id: u.id,
              name: u.name,
              studentId: u.studentId,
              avatar: u.avatar,
              phone: u.phone,
              email: u.email,
              role: role.roleId.toString(),
              status: u.status
            }));
          }
        });
        setUsers(allUsers);
      } catch(e) {
        console.error(e);
        message.error('获取用户列表失败');
      }
    };
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(u=>{
    if(selectedStatus!=='all' && u.status!==selectedStatus) return false;
    if(!searchText) return true;
    const key = searchText.toLowerCase();
    return u.name.toLowerCase().includes(key) || u.studentId.toLowerCase().includes(key);
  });

  const handleToggleFreeze = (user: User)=>{
    setUsers(prev=>prev.map(u=>u.id===user.id?{...u,status:u.status==='frozen'?'active':'frozen'}:u));
    message.success(`${user.status==='frozen'?'解冻':'冻结'}成功`);
  };

  const handleAdmitUser = (user: User)=>{
    message.success(`已录取 ${user.name} 为社员`);
    setUsers(prev=>prev.map(u=>u.id===user.id?{...u,role:'3'}:u));
  };

  const handleBatchAssignRole = () => {
    // 可加批量分配逻辑
  };

  return (
    <div className="management-page">
      <Row gutter={[24,24]} className="stats-row">
        <Col xs={24} sm={12} md={6}><StatsCard icon={<TeamOutlined style={{fontSize:24,color:'#4da6ff'}}/>} value={users.length} title="总用户数" bgColor="rgba(77,166,255,0.1)"/></Col>
        <Col xs={24} sm={12} md={6}><StatsCard icon={<LockOutlined style={{fontSize:24,color:'#ff4d4f'}}/>} value={users.filter(u=>u.status==='frozen').length} title="冻结账户" bgColor="rgba(255,77,79,0.1)"/></Col>
        <Col xs={24} sm={12} md={6}><StatsCard icon={<CheckOutlined style={{fontSize:24,color:'#52c41a'}}/>} value={users.filter(u=>u.status==='pending').length} title="待审核" bgColor="rgba(82,196,26,0.1)"/></Col>
        <Col xs={24} sm={12} md={6}><StatsCard icon={<AppstoreOutlined style={{fontSize:24,color:'#fa8c16'}}/>} value={users.filter(u=>u.role==='3').length} title="社员人数" bgColor="rgba(250,140,22,0.1)"/></Col>
      </Row>

      <Card className="main-card">
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
          { key:'users', label:'用户管理', children: <>
            <Toolbar
              searchText={searchText} onSearchChange={setSearchText}
              selectedStatus={selectedStatus} onStatusChange={setSelectedStatus}
              statusOptions={[]} selectedRowsCount={selectedRows.length}
              onBatchAdmit={handleBatchAssignRole} onClearSelection={()=>setSelectedRows([])}
            />
            <UserTable
              users={filteredUsers} roleOptions={roleOptions} selectedRows={selectedRows}
              onSelectionChange={setSelectedRows} onView={u=>message.info(`查看用户 ${u.name}`)}
              onToggleFreeze={handleToggleFreeze} onAdmit={handleAdmitUser}
            />
          </>},
          { key:'settings', label:'系统配置', children: <>
            <ResumeFieldModal visible={isResumeModalVisible} onCancel={()=>setIsResumeModalVisible(false)} onSave={setResumeFields} fields={resumeFields} fieldTypeOptions={[]} loading={false}/>
            <PromptModal visible={isPromptModalVisible} onCancel={()=>setIsPromptModalVisible(false)} onSave={setFormPrompts} prompts={formPrompts}/>
          </>},
        ]}/>
      </Card>
    </div>
  );
};

export default Management;
