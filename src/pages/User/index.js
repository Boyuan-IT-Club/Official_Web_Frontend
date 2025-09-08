import React, { useState, useEffect } from 'react';
import {
  Card,
  Avatar,
  Button,
  Form,
  Input,
  message,
  Upload,
  Table,
  Modal,
  Typography,
  Spin,
  Descriptions,
  Tag,
  Select,
  Row,
  Col
} from 'antd';
import {
  UserOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  TrophyOutlined
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { userActions } from '@/store/modules/user';
import './index.scss';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const PersonPage = () => {
  const [form] = Form.useForm();
  const [awardForm] = Form.useForm();
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isAwardModalVisible, setIsAwardModalVisible] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(0);

  const dispatch = useDispatch();
  const {
    token,
    userInfo,
    awards = [],
    loading,
    error,
  } = useSelector((state) => state.user);

  useEffect(() => {
    if (token) {
      dispatch(userActions.fetchUserInfo());
    }
  }, [token, dispatch]);

  useEffect(() => {
    if (token && userInfo?.userId) {
      console.log('获取用户获奖经历，用户ID:', userInfo.userId);
      dispatch(userActions.fetchUserAwards(userInfo.userId));
    }
  }, [token, userInfo?.userId, dispatch]);

  useEffect(() => {
    if (error) {
      message.error(error);
    }
  }, [error]);

  const handleEditSubmit = async () => {
  try {
    const values = await form.validateFields();
    console.log('表单提交值:', values); // 调试
    
    const updateData = {
      name: values.name,
      phone: values.phone,
      major: values.major // 确保包含
    };
    console.log('准备发送的更新数据:', updateData); // 调试
    
    const result = await dispatch(userActions.updateUserInfo(updateData));
    
    if (userActions.updateUserInfo.fulfilled.match(result)) {
      console.log('更新成功，重新获取用户信息'); // 调试
      const newUserInfo = await dispatch(userActions.fetchUserInfo()).unwrap();
      console.log('重新获取后的用户信息:', newUserInfo); // 调试
      message.success('更新成功');
      setIsEditModalVisible(false);
    }
  } catch (err) {
    console.error('更新错误:', err); // 调试
    message.error(err.message || '更新失败');
  }
};

  const handleAwardSubmit = async () => {
    try {
      const values = await awardForm.validateFields();
      
      console.log('表单原始值:', values);

      const formattedValues = {
        ...values,
        awardTime: values.awardTime
      };

      console.log('准备发送的数据:', formattedValues);

      if (values.awardId) {
        if (!values.awardId) {
          throw new Error('获奖记录ID不能为空');
        }
        await dispatch(userActions.updateAward(formattedValues)).unwrap();
        message.success('获奖经历更新成功');
      } else {
        await dispatch(
          userActions.addAward(formattedValues)
        ).unwrap();
        message.success('获奖经历添加成功');
        dispatch(userActions.fetchUserAwards(userInfo.userId));
      }
      setIsAwardModalVisible(false);
      awardForm.resetFields();
    } catch (err) {
      console.error('操作失败详情:', err);
      message.error(err.message || '操作失败，请重试');
    }
  };

  const handleDeleteAward = (awardId) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条获奖经历吗？',
      okText: '确认',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await dispatch(userActions.deleteAward(awardId)).unwrap();
          message.success('删除成功');
          dispatch(userActions.fetchUserAwards(userInfo.userId));
        } catch (err) {
          message.error('删除失败');
        }
      }
    });
  };

  const handleEditAward = (record) => {
    if (!record || !record.awardId) {
      message.error('无效的获奖记录');
      return;
    }

    let awardTime = record.awardTime;
    if (awardTime) {
      try {
        const date = new Date(awardTime);
        if (!isNaN(date.getTime())) {
          awardTime = date.toISOString().split('T')[0];
        }
      } catch (error) {
        console.error('日期转换错误:', error);
      }
    }
    
    awardForm.setFieldsValue({
      ...record,
      awardTime: awardTime
    });
    setIsAwardModalVisible(true);
  };

  const handleAvatarUpload = async (file) => {
    const MAX_FILE_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      message.error('文件大小不能超过2MB');
      return false;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      message.error('请上传JPEG、PNG、GIF或WebP格式的图片');
      return false;
    }

    setAvatarLoading(true);
    try {
      console.log('开始上传文件:', file.name, file.type, file.size);
      
      const avatarUrl = await dispatch(userActions.uploadAvatar(file)).unwrap();
      message.success('头像上传成功');
      
      // 强制重新渲染头像
      setAvatarVersion(prev => prev + 1);
      
      // 重新获取用户信息
      setTimeout(() => {
        dispatch(userActions.fetchUserInfo());
      }, 300);
      
    } catch (error) {
      console.error('上传完整错误:', error);
      message.error(`头像上传失败: ${error.message || '未知错误'}`);
    } finally {
      setAvatarLoading(false);
    }
    return false;
  };

  const uploadProps = {
    name: 'file',
    showUploadList: false,
    beforeUpload: handleAvatarUpload,
    accept: 'image/*',
    disabled: avatarLoading
  };

  // 修复头像URL处理
  const getAvatarUrl = () => {
    if (!userInfo?.avatar) return null;
    
    let avatarUrl = userInfo.avatar;
    
    // 如果已经是完整URL，直接返回
    if (avatarUrl.startsWith('http')) {
      return `${avatarUrl}?t=${Date.now()}&v=${avatarVersion}`;
    }
    
    // 处理相对路径
    if (avatarUrl.startsWith('/')) {
      avatarUrl = `https://official.boyuan.club${avatarUrl}`;
    } else {
      avatarUrl = `https://official.boyuan.club/uploads/avatars/${avatarUrl}`;
    }
    
    return `${avatarUrl}?t=${Date.now()}&v=${avatarVersion}`;
  };

  const awardColumns = [
    {
      title: '奖项名称',
      dataIndex: 'awardName',
      key: 'awardName',
      width: '25%',
      render: (text) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrophyOutlined style={{ color: '#ffc53d', fontSize: '16px' }} />
          <Text strong style={{ color: '#1f1f1f', fontSize: '14px' }}>
            {text}
          </Text>
        </div>
      )
    },
    {
      title: '获奖时间',
      dataIndex: 'awardTime',
      key: 'awardTime',
      width: '20%',
      render: (text) => {
        if (!text) return '-';
        try {
          const date = new Date(text);
          if (isNaN(date.getTime())) {
            return text;
          }
          return (
            <Tag color="blue" style={{ margin: 0, border: 'none', borderRadius: '6px' }}>
              {date.toLocaleDateString('zh-CN')}
            </Tag>
          );
        } catch (error) {
          return text;
        }
      }
    },
    {
      title: '奖项描述',
      dataIndex: 'description',
      key: 'description',
      width: '40%',
      render: (text) => (
        <Text style={{ color: '#666', lineHeight: '1.5' }}>
          {text || '暂无描述'}
        </Text>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: '15%',
      align: 'center',
      render: (_, record) => (
        <div className="award-actions">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditAward(record)}
            style={{ color: '#1890ff' }}
          >
            编辑
          </Button>
          <Button
            type="link"
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteAward(record.awardId)}
            style={{ color: '#ff4d4f' }}
          >
            删除
          </Button>
        </div>
      )
    }
  ];

  if (loading && !userInfo) {
    return (
      <div className="loading-container">
        <Spin tip="加载用户信息..." size="large" />
      </div>
    );
  }

  return (
    <div className="person-page">
      <Row justify="center">
        <Col xs={24} lg={20} xl={18}>
          <Card className="profile-card" loading={loading}>
            <div className="profile-header">
              <div className="avatar-section">
                <Upload {...uploadProps}>
                  <Avatar
                    size={120}
                    src={getAvatarUrl()}
                    icon={<UserOutlined />}
                    className="user-avatar"
                    key={`avatar-${avatarVersion}`}
                  />
                </Upload>
                {avatarLoading && (
                  <div className="avatar-loading">
                    <Spin size="small" />
                  </div>
                )}
                <div className="avatar-tip">
                  <Text type="secondary">点击头像更换</Text>
                </div>
              </div>

              <div className="profile-info">
                <Title level={3} className="profile-name">
                  {userInfo?.name || '未命名用户'}
                </Title>
                <Text type="secondary" className="profile-username">
                  @{userInfo?.username}
                </Text>

                <Descriptions column={1} className="profile-details">
                  <Descriptions.Item label="专业">
                    {userInfo?.major || '未设置'}
                  </Descriptions.Item>
                  <Descriptions.Item label="部门">
                    <Tag color={userInfo?.dept ? "blue" : "default"}>
                      {userInfo?.dept || '非社员'}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="邮箱">{userInfo?.email}</Descriptions.Item>
                  <Descriptions.Item label="电话">
                    {userInfo?.phone || '未设置'}
                  </Descriptions.Item>
                </Descriptions>

                <Button
                  type="primary"
                  onClick={() => {
                    form.setFieldsValue({
                      name: userInfo?.name,
                      major: userInfo?.major,
                      phone: userInfo?.phone
                      // 不设置部门字段，因为不能修改
                    });
                    setIsEditModalVisible(true);
                  }}
                >
                  编辑个人信息
                </Button>
              </div>
            </div>
          </Card>

          <Card
            className="awards-card"
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrophyOutlined style={{ color: '#ffc53d', fontSize: '18px' }} />
                <span style={{ color: '#1f1f1f', fontWeight: '600' }}>获奖经历</span>
              </div>
            }
            loading={loading}
            extra={
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  awardForm.resetFields();
                  setIsAwardModalVisible(true);
                }}
                style={{ 
                  backgroundColor: '#1890ff',
                  borderColor: '#1890ff',
                  borderRadius: '6px'
                }}
              >
                添加获奖经历
              </Button>
            }
            headStyle={{ 
              borderBottom: '1px solid #f0f0f0',
              padding: '16px 24px'
            }}
            bodyStyle={{ padding: '0' }}
          >
            <Table
              columns={awardColumns}
              dataSource={Array.isArray(awards) ? awards : []}
              rowKey="awardId"
              pagination={{ 
                pageSize: 5, 
                showSizeChanger: false,
                showTotal: (total) => `共 ${total} 条记录`
              }}
              loading={loading}
              locale={{ 
                emptyText: (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px 0',
                    color: '#999'
                  }}>
                    <TrophyOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                    <div>暂无获奖经历</div>
                  </div>
                ) 
              }}
              style={{ border: 'none' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 编辑个人信息模态框 */}
      <Modal
        title="编辑个人信息"
        open={isEditModalVisible}
        onOk={handleEditSubmit}
        onCancel={() => setIsEditModalVisible(false)}
        confirmLoading={loading}
        okText="保存"
        cancelText="取消"
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="major" label="专业" rules={[{ required: false }]}>
            <Input placeholder="请输入您的专业" />
          </Form.Item>
          <Form.Item
            name="phone"
            label="电话"
            rules={[
              {
                pattern: /^1[3-9]\d{9}$/,
                message: '请输入正确的手机号码'
              }
            ]}
          >
            <Input />
          </Form.Item>
          {/* 移除部门编辑字段 */}
        </Form>
      </Modal>

      {/* 编辑获奖经历模态框 */}
      <Modal
        title={awardForm.getFieldValue('awardId') ? '编辑获奖经历' : '添加获奖经历'}
        open={isAwardModalVisible}
        onOk={handleAwardSubmit}
        onCancel={() => setIsAwardModalVisible(false)}
        width={700}
        confirmLoading={loading}
        okText="确认"
        cancelText="取消"
      >
        <Form form={awardForm} layout="vertical">
          <Form.Item name="awardId" hidden>
            <Input />
          </Form.Item>
          <Form.Item
            name="awardName"
            label="奖项名称"
            rules={[{ required: true, message: '请输入奖项名称' }]}
          >
            <Input placeholder="例如：ACM国际大学生程序设计竞赛" />
          </Form.Item>
          <Form.Item
            name="awardTime"
            label="获奖时间"
            rules={[{ required: true, message: '请选择获奖时间' }]}
          >
            <Input type="date" />
          </Form.Item>
          <Form.Item
            name="description"
            label="奖项描述"
            rules={[{ required: true, message: '请输入奖项描述' }]}
          >
            <TextArea rows={4} placeholder="详细描述比赛级别、个人贡献等信息..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PersonPage;