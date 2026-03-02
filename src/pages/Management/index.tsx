// src/pages/Management/index.tsx
import React, { useState, useEffect } from 'react';
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
  Badge,
  message,
} from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  SettingOutlined,
  EditOutlined,
  LockOutlined,
  UnlockOutlined,
  EyeOutlined,
  CheckOutlined,
  SearchOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { ColumnsType } from 'antd/es/table';
import type { TabsProps } from 'antd';
import {
  fetchResumeFieldsConfig,
  saveResumeFieldsConfig,
  ResumeField
} from '@/store/modules/resumeFields';
import './index.scss';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// 类型定义
interface RoleOption {
  value: string;
  label: string;
  color: string;
}

interface StatusOption {
  value: string;
  label: string;
}

interface FieldTypeOption {
  value: string;
  label: string;
}

interface User {
  id: number;
  name: string;
  studentId: string;
  avatar: string;
  phone: string;
  email: string;
  role: string;
  status: 'active' | 'frozen' | 'pending';
}

// 新增：填写提示类型定义
interface FormPrompt {
  id: string;
  title: string;          // 提示标题（如"隐私保护"、"照片"等）
  content: string;        // 提示内容
  enabled: boolean;       // 是否启用
  order: number;          // 显示顺序
}

interface RootState {
  resumeFields: {
    fields: ResumeField[];
    loading: boolean;
    error: string | null;
  };
  resume: {
    cycleId: number;
  };
}

const Management: React.FC = () => {
  const dispatch = useDispatch<any>();

  // 从 Redux 获取字段配置
  const { fields: storeFields, loading: fieldsLoading } = useSelector(
    (state: RootState) => state.resumeFields
  );

  // 从 Redux 获取当前招新周期ID
  const cycleId = useSelector((state: RootState) => state.resume.cycleId);

  // 状态管理
  const [activeTab, setActiveTab] = useState<string>('users');
  const [isUserModalVisible, setIsUserModalVisible] = useState<boolean>(false);
  const [isResumeModalVisible, setIsResumeModalVisible] = useState<boolean>(false);
  const [modalType, setModalType] = useState<string>('add');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRows, setSelectedRows] = useState<User[]>([]);
  const [userForm] = Form.useForm();
  const [resumeForm] = Form.useForm();
  const [searchText, setSearchText] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [tempRole, setTempRole] = useState<string | null>(null);

  // 本地字段状态，用于编辑
  const [resumeFields, setResumeFields] = useState<ResumeField[]>([]);

  // 新增：填写提示相关状态 - 完全按照图片内容
  const [isPromptModalVisible, setIsPromptModalVisible] = useState<boolean>(false);
  const [promptForm] = Form.useForm();
  const [formPrompts, setFormPrompts] = useState<FormPrompt[]>([
    {
      id: 'privacy',
      title: '隐私保护',
      content: '本报名表所提供的所有信息将严格保密，我们承诺对您的个人信息采取必要的保护措施，确保其安全性。',
      enabled: true,
      order: 1,
    },
    {
      id: 'required',
      title: '必填项说明',
      content: '所有带红色星号的字段为必填项，其它为选填项。',
      enabled: true,
      order: 2,
    },
    {
      id: 'email',
      title: '邮箱',
      content: '可填写华东师范大学学生邮箱或其它常用邮箱',
      enabled: true,
      order: 3,
    },
    {
      id: 'photo',
      title: '照片',
      content: '请上传个人免冠正面照片，建议使用近期证件照，背景简洁，大小不超过5MB，以便于招新工作的审核和身份确认。',
      enabled: true,
      order: 4,
    },
    {
      id: 'github',
      title: 'GitHub主页',
      content: '有GitHub账号的同学可以填写，没有则可以不填',
      enabled: true,
      order: 5,
    },
    {
      id: 'intro',
      title: '个人简介',
      content: '请提供详细的个人介绍，可包括但不限于个人特长、兴趣爱好、学习或个人经历，以及对社团的期望和建议等内容。全面的自我介绍有利于面试官快速了解您。',
      enabled: true,
      order: 6,
    },
    {
      id: 'department',
      title: '意愿加入部门',
      content: '本社团设有综合部、项目部、技术部和媒体部四个部门。请选择1至2个意愿加入的部门，最终录取将安排到其中一个部门。',
      enabled: true,
      order: 7,
    },
    {
      id: 'interview',
      title: '面试时间',
      content: '请选择您方便的面试时间段，Day 1为9月27日（9月28日因调休暂不设为面试）。如无法参加指定时间的面试，请联系管理员进行沟通参与线上面试。',
      enabled: true,
      order: 8,
    },
    {
      id: 'tech',
      title: '技术栈',
      content: '请填写您熟悉的技术栈，如Java、Python、C、C++、Go、MySQL、Spring Boot、Vue等编程语言、技术框架或掌握的算法',
      enabled: true,
      order: 9,
    },
    {
      id: 'project',
      title: '项目经验',
      content: '有计算机相关项目经历者可详细填写，若没有可简要说明或不填',
      enabled: true,
      order: 10,
    },
  ]);

  // 角色定义
  const roleOptions: RoleOption[] = [
    { value: 'ADMIN', label: '管理员', color: 'red' },
    { value: 'MEMBER', label: '社员', color: 'blue' },
    { value: 'NON_MEMBER', label: '非社员', color: 'gray' },
  ];

  // 用户状态选项
  const statusOptions: StatusOption[] = [
    { value: 'all', label: '全部状态' },
    { value: 'active', label: '正常' },
    { value: 'frozen', label: '已冻结' },
    { value: 'pending', label: '待审核' },
  ];

  // 字段格式类型
  const fieldTypeOptions: FieldTypeOption[] = [
    { value: 'input', label: '文本框' },
    { value: 'textarea', label: '多行文本' },
    { value: 'radio', label: '单选' },
    { value: 'checkbox', label: '多选' },
    { value: 'select', label: '下拉选择' },
    { value: 'custom', label: '照片' },
  ];

  // 默认字段配置
  const defaultFields: ResumeField[] = [
    { key: 'name', label: '姓名', type: 'input', required: true, enabled: true },
    { key: 'student_id', label: '学号', type: 'input', required: true, enabled: true },
    { key: 'gender', label: '性别', type: 'radio', required: true, enabled: true },
    { key: 'grade', label: '年级', type: 'select', required: true, enabled: true },
    { key: 'major', label: '专业', type: 'input', required: true, enabled: true },
    { key: 'email', label: '邮箱', type: 'input', required: true, enabled: true },
    { key: 'phone', label: '手机号', type: 'input', required: true, enabled: true },
    { key: 'github', label: 'GitHub主页', type: 'input', required: false, enabled: true },
    { key: 'personal_photo', label: '个人照片', type: 'custom', required: true, enabled: true },
    { key: 'self_introduction', label: '自我介绍', type: 'textarea', required: false, enabled: true },
    { key: 'reason', label: '加入理由', type: 'textarea', required: true, enabled: true },
    { key: 'first_department', label: '第一志愿', type: 'select', required: true, enabled: true },
    { key: 'second_department', label: '第二志愿', type: 'select', required: false, enabled: true },
    { key: 'can_attend_interview', label: '是否能参加线下面试', type: 'radio', required: true, enabled: true },
    { key: 'first_interview_time', label: '第一面试时间', type: 'select', required: true, enabled: true },
    { key: 'second_interview_time', label: '第二面试时间', type: 'select', required: false, enabled: true },
    { key: 'tech_stack', label: '技术栈', type: 'input', required: false, enabled: true },
    { key: 'project_experience', label: '项目经验', type: 'textarea', required: false, enabled: true },
  ];

  const emptyField: ResumeField = {
    key: '',
    label: '',
    type: 'input',
    required: false,
    enabled: true,
    placeholder: '',
    options: [],
  };

  // 初始化加载字段配置
  useEffect(() => {
    if (cycleId) {
      dispatch(fetchResumeFieldsConfig(cycleId));
    }
  }, [cycleId, dispatch]);

  // 当 store 中的字段更新时，同步到本地状态
  useEffect(() => {
    if (storeFields && storeFields.length > 0) {
      setResumeFields(storeFields);
    } else {
      setResumeFields(defaultFields);
    }
  }, [storeFields]);

  // 用户表格列定义
  const userColumns: ColumnsType<User> = [
    {
      title: '用户信息',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      render: (text: string, record: User) => (
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
      title: '权限',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (role: string) => {
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
      render: (status: User['status']) => {
        const statusMap = {
          active: { text: '正常', color: 'green' as const },
          frozen: { text: '冻结', color: 'red' as const },
          pending: { text: '待审核', color: 'orange' as const },
        };
        const config = statusMap[status] || { text: status, color: 'default' as const };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '联系方式',
      key: 'contact',
      width: 160,
      render: (_, record: User) => (
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
      title: '操作',
      key: 'action',
      width: 220,
      render: (_, record: User) => (
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
  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    message.info(`查看用户: ${user.name}`);
  };

  const handleAssignRole = (user: User) => {
    setTempRole(user.role);
    Modal.confirm({
      title: '分配权限',
      content: (
        <Select
          value={tempRole}
          style={{ width: '100%', marginTop: 16 }}
          onChange={(value: string) => {
            setTempRole(value);
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
        setUsers(prev =>
          prev.map(u =>
            u.id === user.id
              ? { ...u, role: tempRole || u.role }
              : u
          )
        );
        message.success(`已将 ${user.name} 的权限更新`);
      },
    });
  };

  const handleToggleFreeze = (user: User) => {
    Modal.confirm({
      title: user.status === 'frozen' ? '解冻账户' : '冻结账户',
      content: `确定要${user.status === 'frozen' ? '解冻' : '冻结'}用户 "${user.name}" 吗？`,
      onOk() {
        message.success(`${user.status === 'frozen' ? '解冻' : '冻结'}成功`);
      },
    });
  };

  const handleAdmitUser = (user: User) => {
    Modal.confirm({
      title: '录取用户',
      content: `确定要录取 "${user.name}" 为社员吗？`,
      onOk() {
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
        message.success(`已成功录取 ${selectedRows.length} 个用户为社员`);
        setSelectedRows([]);
      },
    });
  };

  const handleInsertFieldAfter = (index: number) => {
    const newField = {
      ...emptyField,
      key: `field_${Date.now()}`,
    };
    const newFields = [...resumeFields];
    newFields.splice(index + 1, 0, newField);
    setResumeFields(newFields);
    resumeForm.setFieldsValue({ fields: newFields });
  };

  const handleAddField = () => {
    const newFields = [
      ...resumeFields,
      {
        ...emptyField,
        key: `field_${Date.now()}`,
      },
    ];
    setResumeFields(newFields);
    resumeForm.setFieldsValue({ fields: newFields });
  };

  const handleDeleteField = (index: number) => {
    const newFields = [...resumeFields];
    newFields.splice(index, 1);
    setResumeFields(newFields);
    resumeForm.setFieldsValue({ fields: newFields });
    message.success('字段已删除');
  };

  const handleEditResumeFields = () => {
    resumeForm.setFieldsValue({ fields: resumeFields });
    setIsResumeModalVisible(true);
  };

  const handleSaveResumeFields = async () => {
    try {
      await resumeForm.validateFields();
      const formFields = resumeForm.getFieldValue('fields');
      const fieldsToSave = formFields.map((field: ResumeField, index: number) => ({
        ...field,
        order: index,
        key: field.key || `field_${Date.now()}_${index}`,
      }));

      await dispatch(saveResumeFieldsConfig({
        cycleId,
        fields: fieldsToSave
      })).unwrap();

      setResumeFields(fieldsToSave);
      setIsResumeModalVisible(false);
      message.success('简历字段配置已保存');
    } catch (error) {
      console.error('保存字段配置失败:', error);
      message.error('保存失败，请检查表单填写');
    }
  };

  // 新增：处理编辑填写提示
  const handleEditPrompts = () => {
    promptForm.setFieldsValue({ prompts: formPrompts });
    setIsPromptModalVisible(true);
  };

  // 新增：添加新提示
  const handleAddPrompt = () => {
    const newPrompts = [
      ...formPrompts,
      {
        id: `prompt_${Date.now()}`,
        title: '新提示',
        content: '',
        type: 'other' as const,
        enabled: true,
        order: formPrompts.length + 1,
      },
    ];
    setFormPrompts(newPrompts);
    promptForm.setFieldsValue({ prompts: newPrompts });
  };

  // 新增：删除提示
  const handleDeletePrompt = (index: number) => {
    const newPrompts = [...formPrompts];
    newPrompts.splice(index, 1);
    newPrompts.forEach((prompt, idx) => {
      prompt.order = idx + 1;
    });
    setFormPrompts(newPrompts);
    promptForm.setFieldsValue({ prompts: newPrompts });
    message.success('提示已删除');
  };

  // 新增：插入提示
  const handleInsertPromptAfter = (index: number) => {
    const newPrompt = {
      id: `prompt_${Date.now()}`,
      title: '新提示',
      content: '',
      type: 'other' as const,
      enabled: true,
      order: index + 2,
    };
    const newPrompts = [...formPrompts];
    newPrompts.splice(index + 1, 0, newPrompt);
    newPrompts.forEach((prompt, idx) => {
      prompt.order = idx + 1;
    });
    setFormPrompts(newPrompts);
    promptForm.setFieldsValue({ prompts: newPrompts });
  };

  // 新增：保存填写提示
  const handleSavePrompts = async () => {
    try {
      await promptForm.validateFields();
      const formPromptsData = promptForm.getFieldValue('prompts');

      // 这里可以调用 API 保存到后端
      // await dispatch(saveFormPrompts({ cycleId, prompts: formPromptsData })).unwrap();

      setFormPrompts(formPromptsData);
      setIsPromptModalVisible(false);
      message.success('填写提示配置已保存');
    } catch (error) {
      console.error('保存填写提示失败:', error);
      message.error('保存失败，请检查表单填写');
    }
  };

  const rowSelection = {
    selectedRowKeys: selectedRows.map(row => row.id),
    onChange: (selectedRowKeys: React.Key[], selectedRows: User[]) => {
      setSelectedRows(selectedRows);
    },
  };

  // 模拟数据
  const [users, setUsers] = useState<User[]>([
    {
      id: 1,
      name: '张三',
      studentId: '20210001',
      avatar: '',
      phone: '13800138001',
      email: 'zhangsan@boyuan.club',
      role: 'MEMBER',
      status: 'active',
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
    },
  ]);

  // 筛选用户列表
  const filteredUsers = users.filter(user => {
    if (selectedStatus !== 'all' && user.status !== selectedStatus) {
      return false;
    }
    if (searchText) {
      const keyword = searchText.trim().toLowerCase();
      const matchName = user.name?.toLowerCase().includes(keyword);
      const matchStudentId = user.studentId?.toLowerCase().includes(keyword);
      return matchName || matchStudentId;
    }
    return true;
  });

  // 标签页配置
  const tabItems: TabsProps['items'] = [
    {
      key: 'users',
      label: '用户管理',
      children: (
        <>
          <div className="toolbar">
            <Space size="middle">
              <Input
                placeholder="请输入姓名或学号进行搜索"
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
                  <Button onClick={() => setSelectedRows([])}>
                    清除选择
                  </Button>
                </>
              )}
            </Space>
          </div>
          <div className="table-container">
            <Table
              columns={userColumns}
              dataSource={filteredUsers}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              rowSelection={rowSelection}
              locale={{ emptyText: '暂无用户数据' }}
            />
          </div>
        </>
      ),
    },
    {
      key: 'settings',
      label: '系统配置',
      children: (
        <div className="settings-section">
          <Card
            title="简历表字段配置"
            style={{ marginBottom: 24 }}
            extra={
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={handleEditResumeFields}
                loading={fieldsLoading}
              >
                编辑字段
              </Button>
            }
          >
            <div className="fields-list">
              {resumeFields.filter(field => field.enabled !== false).map(field => (
                <div key={field.key} className="field-item">
                  <div className="field-info">
                    <Tag color="purple" style={{ marginRight: 8 }}>
                      {fieldTypeOptions.find(t => t.value === field.type)?.label || field.type}
                    </Tag>
                    <Text strong>{field.label}</Text>
                  </div>
                  <div className="field-status">
                    <Tag color={field.required ? 'red' : 'blue'}>
                      {field.required ? '必填' : '选填'}
                    </Tag>
                    <Tag color={field.enabled ? 'green' : 'gray'}>
                      {field.enabled ? '启用' : '停用'}
                    </Tag>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* 新增：填写提示配置卡片 */}
          <Card
            title="报名表填写提示配置"
            extra={
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={handleEditPrompts}
              >
                编辑提示
              </Button>
            }
          >
            <div className="prompts-list">
              {formPrompts.filter(prompt => prompt.enabled).sort((a, b) => a.order - b.order).map(prompt => {
                return (
                  <div key={prompt.id} className="prompt-item">
                    <div className="prompt-header">
                      <Space>
                        <Text strong>{prompt.title}</Text>
                      </Space>
                      <Tag color={prompt.enabled ? 'green' : 'gray'}>
                        {prompt.enabled ? '启用' : '停用'}
                      </Tag>
                    </div>
                    <div className="prompt-content">
                      {prompt.content.split('\n').map((line, i) => (
                        <div key={i}>{line || <br />}</div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {formPrompts.filter(p => p.enabled).length === 0 && (
                <div className="empty-prompt">暂无启用的填写提示</div>
              )}
            </div>
          </Card>
        </div>
      ),
    },
  ];

  return (
    <div className="management-page">
      {/* 统计卡片 */}
      <Row gutter={[24, 24]} className="stats-row">
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'rgba(77, 166, 255, 0.1)' }}>
              <TeamOutlined style={{ color: '#4da6ff', fontSize: 24 }} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{users.length}</div>
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
              <div className="stat-value">{users.filter(u => u.status === 'frozen').length}</div>
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
              <div className="stat-value">{users.filter(u => u.status === 'pending').length}</div>
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
              <div className="stat-value">{users.filter(u => u.role === 'MEMBER').length}</div>
              <div className="stat-title">社员人数</div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 主要内容区域 */}
      <Card className="main-card">
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
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
        confirmLoading={fieldsLoading}
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
                key={field.key || index}
                size="small"
                style={{ marginBottom: 12 }}
                title={
                  <Form.Item
                    name={['fields', index, 'label']}
                    noStyle
                  >
                    <Text strong>{field.label || '新字段'}</Text>
                  </Form.Item>
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
                        unCheckedChildren="停用"
                        size="small"
                      />
                    </Form.Item>
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => handleInsertFieldAfter(index)}
                    >
                      ＋
                    </Button>
                    <Button
                      danger
                      size="small"
                      onClick={() => handleDeleteField(index)}
                    >
                      删除
                    </Button>
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
                      name={['fields', index, 'type']}
                      label="字段格式"
                      rules={[{ required: true, message: '请选择字段格式' }]}
                    >
                      <Select placeholder="请选择字段格式">
                        {fieldTypeOptions.map(option => (
                          <Option key={option.value} value={option.value}>
                            {option.label}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                {/* 根据类型显示不同配置 */}
                <Form.Item
                  noStyle
                  shouldUpdate={(prev, cur) =>
                    prev.fields?.[index]?.type !== cur.fields?.[index]?.type
                  }
                >
                  {({ getFieldValue }) => {
                    const type = getFieldValue(['fields', index, 'type']);

                    if (type === 'input' || type === 'textarea') {
                      return (
                        <Form.Item
                          name={['fields', index, 'placeholder']}
                          label="提示信息"
                        >
                          <Input placeholder="请输入提示内容" />
                        </Form.Item>
                      );
                    }

                    if (type === 'radio' || type === 'checkbox' || type === 'select') {
                      return (
                        <Form.List name={['fields', index, 'options']}>
                          {(optionFields, { add, remove }) => (
                            <Form.Item label="选项内容">
                              {optionFields.map((opt, optIndex) => (
                                <Space
                                  key={opt.key}
                                  style={{ display: 'flex', marginBottom: 8 }}
                                >
                                  <Form.Item
                                    {...opt}
                                    noStyle
                                    rules={[{ required: true, message: '请输入选项内容' }]}
                                  >
                                    <Input placeholder={`选项 ${optIndex + 1}`} />
                                  </Form.Item>
                                  <Button
                                    type="primary"
                                    danger
                                    onClick={() => remove(optIndex)}
                                  >
                                    删除
                                  </Button>
                                </Space>
                              ))}
                              <Button
                                type="dashed"
                                block
                                onClick={() => add()}
                              >
                                + 添加选项
                              </Button>
                            </Form.Item>
                          )}
                        </Form.List>
                      );
                    }

                    return null;
                  }}
                </Form.Item>

                {/* 隐藏的 key 字段 */}
                <Form.Item
                  name={['fields', index, 'key']}
                  hidden
                >
                  <Input />
                </Form.Item>
              </Card>
            ))}
          </div>
          <div style={{ marginTop: 16 }}>
            <Button
              type="primary"
              block
              onClick={handleAddField}
            >
              + 添加字段
            </Button>
          </div>
        </Form>
      </Modal>

      {/* 新增：编辑填写提示模态框 */}
      <Modal
        title="编辑报名表填写提示"
        open={isPromptModalVisible}
        onOk={handleSavePrompts}
        onCancel={() => setIsPromptModalVisible(false)}
        width={900}
        okText="保存配置"
        cancelText="取消"
      >
        <Form
          form={promptForm}
          layout="vertical"
          name="promptForm"
          initialValues={{ prompts: formPrompts }}
        >
          <div className="prompts-editor">
            {formPrompts.map((prompt, index) => (
              <Card
                key={prompt.id || index}
                size="small"
                style={{ marginBottom: 16 }}
                title={
                  <Form.Item
                    name={['prompts', index, 'title']}
                    noStyle
                  >
                    <Text strong>{prompt.title}</Text>
                  </Form.Item>
                }
                extra={
                  <Space>
                    <Form.Item
                      name={['prompts', index, 'enabled']}
                      valuePropName="checked"
                      noStyle
                    >
                      <Switch
                        checkedChildren="启用"
                        unCheckedChildren="停用"
                        size="small"
                      />
                    </Form.Item>
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => handleInsertPromptAfter(index)}
                    >
                      ＋
                    </Button>
                    <Button
                      danger
                      size="small"
                      onClick={() => handleDeletePrompt(index)}
                    >
                      删除
                    </Button>
                  </Space>
                }
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name={['prompts', index, 'title']}
                      label="提示标题"
                      rules={[{ required: true, message: '请输入提示标题' }]}
                    >
                      <Input placeholder="例如：隐私保护、照片等" />
                    </Form.Item>
                  </Col>
                </Row>
                <Col span={12}>
                  <Form.Item
                    name={['prompts', index, 'order']}
                    label="显示顺序"
                    rules={[{ required: true, message: '请输入显示顺序' }]}
                  >
                    <Input type="number" min={1} placeholder="请输入数字" />
                  </Form.Item>
                </Col>
                <Form.Item
                  name={['prompts', index, 'content']}
                  label="提示内容"
                  rules={[{ required: true, message: '请输入提示内容' }]}
                >
                  <TextArea
                    rows={4}
                    placeholder="请输入详细的提示内容，支持换行"
                  />
                </Form.Item>
              </Card>
            ))}
          </div>
          <div style={{ marginTop: 16 }}>
            <Button
              type="primary"
              block
              onClick={handleAddPrompt}
            >
              + 添加提示
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default Management;