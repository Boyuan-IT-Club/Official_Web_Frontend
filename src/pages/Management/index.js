// src/pages/Management/index.js
import React, { useState } from 'react';
import {
  Row,
  Col,
  Card,
  Typography,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Avatar,
  Tabs,
  Tooltip,
  Popconfirm,
  Alert,
  Checkbox,
  Upload,
  message,
  Radio,
  Badge,
} from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  SettingOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  PlusOutlined,
  LockOutlined,
  UnlockOutlined,
  SafetyCertificateOutlined,
  AuditOutlined,
  SearchOutlined,
  FilterOutlined,
  MailOutlined,
  PhoneOutlined,
  DownloadOutlined,
  UploadOutlined,
  CheckOutlined,
  CloseOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import './index.scss';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;
const { TextArea } = Input;

const Management = () => {
  // 状态管理
  const [activeTab, setActiveTab] = useState('users');
  const [isUserModalVisible, setIsUserModalVisible] = useState(false);
  const [isResumeModalVisible, setIsResumeModalVisible] = useState(false);
  const [modalType, setModalType] = useState('add');
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [userForm] = Form.useForm();
  const [resumeForm] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // 角色定义
  const roleOptions = [
    { value: 'ADMIN', label: '管理员', color: 'red' },
    { value: 'MEMBER', label: '社员', color: 'blue' },
    { value: 'NON_MEMBER', label: '非社员', color: 'gray' },
  ];

  // 用户状态选项
  const statusOptions = [
    { value: 'all', label: '全部状态' },
    { value: 'active', label: '正常' },
    { value: 'frozen', label: '已冻结' },
    { value: 'pending', label: '待审核' },
  ];

  // 简历表字段配置
  const [resumeFields, setResumeFields] = useState([
    { key: 'name', label: '姓名', required: true, enabled: true },
    { key: 'studentId', label: '学号', required: true, enabled: true },
    { key: 'gender', label: '性别', required: true, enabled: true },
    { key: 'phone', label: '手机号', required: true, enabled: true },
    { key: 'email', label: '邮箱', required: true, enabled: true },
    { key: 'college', label: '学院', required: true, enabled: true },
    { key: 'major', label: '专业', required: true, enabled: true },
    { key: 'grade', label: '年级', required: true, enabled: true },
    { key: 'department', label: '意向部门', required: true, enabled: true },
    { key: 'skills', label: '技能特长', required: false, enabled: true },
    { key: 'experience', label: '项目经历', required: false, enabled: true },
    { key: 'hobbies', label: '兴趣爱好', required: false, enabled: true },
    { key: 'selfIntro', label: '自我介绍', required: false, enabled: true },
  ]);

  // 用户表格列定义
  const userColumns = [
    {
      title: '选择',
      key: 'selection',
      width: 60,
      render: (_, record) => (
        <Checkbox
          checked={selectedRows.some(row => row.id === record.id)}
          onChange={(e) => handleSelectRow(record, e.target.checked)}
        />
      ),
    },
    {
      title: '用户信息',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      render: (text, record) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Avatar
            src={record.avatar}
            icon={<UserOutlined />}
            style={{ backgroundColor: '#4da6ff' }}
          />
          <div style={{ marginLeft: 12 }}>
            <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center' }}>
              {text}
              {record.status === 'frozen' && (
                <Tooltip title="账户已冻结">
                  <LockOutlined style={{ color: '#ff4d4f', marginLeft: 4, fontSize: 12 }} />
                </Tooltip>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>
              {record.studentId}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (role) => {
        const roleConfig = roleOptions.find(r => r.value === role);
        return roleConfig ? (
          <Tag color={roleConfig.color}>{roleConfig.label}</Tag>
        ) : (
          <Tag>{role}</Tag>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status) => {
        const statusMap = {
          active: { text: '正常', color: 'green' },
          frozen: { text: '冻结', color: 'red' },
          pending: { text: '待审核', color: 'orange' },
        };
        const config = statusMap[status] || { text: status, color: 'default' };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '联系方式',
      key: 'contact',
      width: 160,
      render: (_, record) => (
        <div>
          <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 2 }}>
            {record.phone}
          </div>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>
            {record.email}
          </div>
        </div>
      ),
    },
    {
      title: '注册时间',
      dataIndex: 'registerTime',
      key: 'registerTime',
      width: 120,
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              size="small"
              onClick={() => handleViewUser(record)}
            />
          </Tooltip>
          <Tooltip title="分配权限">
            <Button
              type="text"
              icon={<SettingOutlined />}
              size="small"
              onClick={() => handleAssignRole(record)}
            />
          </Tooltip>
          <Tooltip title={record.status === 'frozen' ? "解冻账户" : "冻结账户"}>
            <Button
              type="text"
              danger={record.status !== 'frozen'}
              icon={record.status === 'frozen' ? <UnlockOutlined /> : <LockOutlined />}
              size="small"
              onClick={() => handleToggleFreeze(record)}
            />
          </Tooltip>
          <Tooltip title="录取为社员">
            <Button
              type="text"
              style={{ color: '#52c41a' }}
              icon={<CheckOutlined />}
              size="small"
              onClick={() => handleAdmitUser(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // 处理函数
  const handleSelectRow = (record, checked) => {
    if (checked) {
      setSelectedRows([...selectedRows, record]);
    } else {
      setSelectedRows(selectedRows.filter(row => row.id !== record.id));
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(mockUsers);
    } else {
      setSelectedRows([]);
    }
  };

  const handleViewUser = (user) => {
    setSelectedUser(user);
    // 可以打开详情Modal
    message.info(`查看用户: ${user.name}`);
  };

  const handleAssignRole = (user) => {
    setSelectedUser(user);
    Modal.confirm({
      title: '分配权限',
      content: (
        <Select
          defaultValue={user.role}
          style={{ width: '100%', marginTop: 16 }}
          onChange={(value) => {
            // 调用API更新角色
            message.success(`已将 ${user.name} 的角色更新为: ${value}`);
          }}
        >
          {roleOptions.map(role => (
            <Option key={role.value} value={role.value}>
              {role.label}
            </Option>
          ))}
        </Select>
      ),
      onOk() {
        message.success('角色分配成功');
      },
    });
  };

  const handleToggleFreeze = (user) => {
    const newStatus = user.status === 'frozen' ? 'active' : 'frozen';
    Modal.confirm({
      title: user.status === 'frozen' ? '解冻账户' : '冻结账户',
      content: `确定要${user.status === 'frozen' ? '解冻' : '冻结'}用户 "${user.name}" 吗？`,
      onOk() {
        // 调用API冻结/解冻账户
        message.success(`${user.status === 'frozen' ? '解冻' : '冻结'}成功`);
      },
    });
  };

  const handleAdmitUser = (user) => {
    Modal.confirm({
      title: '录取用户',
      content: `确定要录取 "${user.name}" 为社员吗？`,
      onOk() {
        // 调用API更新用户为社员
        message.success(`已录取 ${user.name} 为社员`);
      },
    });
  };

  const handleBatchAdmit = () => {
    if (selectedRows.length === 0) {
      message.warning('请先选择要录取的用户');
      return;
    }

    Modal.confirm({
      title: '批量录取',
      content: `确定要录取选中的 ${selectedRows.length} 个用户为社员吗？`,
      onOk() {
        // 调用API批量更新用户为社员
        message.success(`已成功录取 ${selectedRows.length} 个用户为社员`);
        setSelectedRows([]);
      },
    });
  };

  const handleEditResumeFields = () => {
    setIsResumeModalVisible(true);
  };

  const handleSaveResumeFields = () => {
    resumeForm.validateFields().then(values => {
      // 保存简历字段配置
      console.log('简历字段配置:', values);
      setIsResumeModalVisible(false);
      message.success('简历字段配置已保存');
    });
  };

  // 模拟数据
  const mockUsers = [
    {
      id: 1,
      name: '张三',
      studentId: '20210001',
      avatar: '',
      phone: '13800138001',
      email: 'zhangsan@boyuan.club',
      role: 'MEMBER',
      status: 'active',
      registerTime: '2023-09-01',
    },
    {
      id: 2,
      name: '李四',
      studentId: '20210002',
      avatar: '',
      phone: '13800138002',
      email: 'lisi@boyuan.club',
      role: 'ADMIN',
      status: 'active',
      registerTime: '2023-09-15',
    },
    {
      id: 3,
      name: '王五',
      studentId: '20210003',
      avatar: '',
      phone: '13800138003',
      email: 'wangwu@boyuan.club',
      role: 'NON_MEMBER',
      status: 'pending',
      registerTime: '2023-10-20',
    },
    {
      id: 4,
      name: '赵六',
      studentId: '20210004',
      avatar: '',
      phone: '13800138004',
      email: 'zhaoliu@boyuan.club',
      role: 'NON_MEMBER',
      status: 'frozen',
      registerTime: '2023-11-05',
    },
  ];

  return (
    <div className="management-page">
      {/* 页面标题 */}
      <div className="page-header">
        <Title level={2}>系统管理</Title>
        <Text type="secondary">管理用户权限和系统配置</Text>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[24, 24]} className="stats-row">
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'rgba(77, 166, 255, 0.1)' }}>
              <TeamOutlined style={{ color: '#4da6ff', fontSize: 24 }} />
            </div>
            <div className="stat-content">
              <div className="stat-value">4</div>
              <div className="stat-title">总用户数</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'rgba(255, 77, 79, 0.1)' }}>
              <LockOutlined style={{ color: '#ff4d4f', fontSize: 24 }} />
            </div>
            <div className="stat-content">
              <div className="stat-value">1</div>
              <div className="stat-title">冻结账户</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'rgba(82, 196, 26, 0.1)' }}>
              <CheckOutlined style={{ color: '#52c41a', fontSize: 24 }} />
            </div>
            <div className="stat-content">
              <div className="stat-value">1</div>
              <div className="stat-title">待审核</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'rgba(250, 140, 22, 0.1)' }}>
              <AppstoreOutlined style={{ color: '#fa8c16', fontSize: 24 }} />
            </div>
            <div className="stat-content">
              <div className="stat-value">2</div>
              <div className="stat-title">社员人数</div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 主要内容区域 */}
      <Card className="main-card">
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="用户管理" key="users">
            {/* 工具栏 */}
            <div className="toolbar">
              <Space size="middle">
                <Input
                  placeholder="搜索用户..."
                  prefix={<SearchOutlined />}
                  style={{ width: 200 }}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
                <Select
                  placeholder="用户状态"
                  style={{ width: 120 }}
                  value={selectedStatus}
                  onChange={setSelectedStatus}
                >
                  {statusOptions.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Space>
              <Space>
                {selectedRows.length > 0 && (
                  <>
                    <Badge count={selectedRows.length} offset={[10, 0]}>
                      <Button
                        type="primary"
                        icon={<CheckOutlined />}
                        onClick={handleBatchAdmit}
                      >
                        批量录取为社员
                      </Button>
                    </Badge>
                    <Button
                      onClick={() => setSelectedRows([])}
                    >
                      清除选择
                    </Button>
                  </>
                )}
                <Button icon={<DownloadOutlined />}>导出数据</Button>
              </Space>
            </div>

            {/* 用户表格 */}
            <div className="table-container">
              <Table
                columns={userColumns}
                dataSource={mockUsers}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                rowSelection={{
                  selectedRowKeys: selectedRows.map(row => row.id),
                  onSelectAll: handleSelectAll,
                  onSelect: (record, selected) => handleSelectRow(record, selected),
                }}
                locale={{ emptyText: '暂无用户数据' }}
              />
            </div>
          </TabPane>

          <TabPane tab="系统配置" key="settings">
            <div className="settings-section">
              <Card
                title="简历表字段配置"
                style={{ marginBottom: 24 }}
                extra={
                  <Button
                    type="primary"
                    icon={<EditOutlined />}
                    onClick={handleEditResumeFields}
                  >
                    编辑字段
                  </Button>
                }
              >
                <Paragraph>
                  配置社员简历投递表单的字段，可以设置哪些字段显示、是否必填。
                </Paragraph>
                <div className="fields-list">
                  {resumeFields.map(field => (
                    <div key={field.key} className="field-item">
                      <div className="field-info">
                        <Text strong>{field.label}</Text>
                        <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                          ({field.key})
                        </Text>
                      </div>
                      <div className="field-status">
                        <Tag color={field.required ? 'red' : 'blue'}>
                          {field.required ? '必填' : '选填'}
                        </Tag>
                        <Tag color={field.enabled ? 'green' : 'gray'}>
                          {field.enabled ? '启用' : '禁用'}
                        </Tag>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="系统信息" style={{ marginBottom: 24 }}>
                <Row gutter={[24, 16]}>
                  <Col span={12}>
                    <div className="system-info-item">
                      <Text strong>系统版本：</Text>
                      <Text>v2.1.0</Text>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div className="system-info-item">
                      <Text strong>最后更新时间：</Text>
                      <Text>2024-03-15</Text>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div className="system-info-item">
                      <Text strong>数据备份：</Text>
                      <Text>每日自动备份</Text>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div className="system-info-item">
                      <Text strong>系统状态：</Text>
                      <Badge status="success" text="运行正常" />
                    </div>
                  </Col>
                </Row>
              </Card>
            </div>
          </TabPane>
        </Tabs>
      </Card>

      {/* 编辑简历字段模态框 */}
      <Modal
        title="编辑简历表字段"
        open={isResumeModalVisible}
        onOk={handleSaveResumeFields}
        onCancel={() => setIsResumeModalVisible(false)}
        width={800}
        okText="保存配置"
        cancelText="取消"
      >
        <Form
          form={resumeForm}
          layout="vertical"
          name="resumeForm"
          initialValues={{ fields: resumeFields }}
        >
          <div className="fields-editor">
            {resumeFields.map((field, index) => (
              <Card
                key={field.key}
                size="small"
                style={{ marginBottom: 12 }}
                title={
                  <Space>
                    <Text strong>{field.label}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      ({field.key})
                    </Text>
                  </Space>
                }
                extra={
                  <Space>
                    <Form.Item
                      name={['fields', index, 'required']}
                      valuePropName="checked"
                      noStyle
                    >
                      <Switch
                        checkedChildren="必填"
                        unCheckedChildren="选填"
                        size="small"
                      />
                    </Form.Item>
                    <Form.Item
                      name={['fields', index, 'enabled']}
                      valuePropName="checked"
                      noStyle
                    >
                      <Switch
                        checkedChildren="启用"
                        unCheckedChildren="禁用"
                        size="small"
                      />
                    </Form.Item>
                  </Space>
                }
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name={['fields', index, 'label']}
                      label="字段名称"
                      rules={[{ required: true, message: '请输入字段名称' }]}
                    >
                      <Input placeholder="请输入字段显示名称" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name={['fields', index, 'key']}
                      label="字段标识"
                      rules={[{ required: true, message: '请输入字段标识' }]}
                    >
                      <Input placeholder="请输入字段标识" disabled />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            ))}
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default Management;