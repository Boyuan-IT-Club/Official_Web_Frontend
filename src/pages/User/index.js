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
  Tag
} from 'antd';
import {
  UserOutlined,
  UploadOutlined,
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

const PersonPage = () => {
  const [form] = Form.useForm();
  const [awardForm] = Form.useForm();
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isAwardModalVisible, setIsAwardModalVisible] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);

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

  // 新增：获取获奖经历
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

  // 调试：检查获奖数据
  useEffect(() => {
    console.log('获奖数据:', awards);
    console.log('获奖数据类型:', Array.isArray(awards) ? '数组' : typeof awards);
    console.log('获奖数据长度:', Array.isArray(awards) ? awards.length : '非数组');
  }, [awards]);

  const handleEditSubmit = async () => {
    try {
      const values = await form.validateFields();
      const result = await dispatch(userActions.updateUserInfo(values));
      
      if (userActions.updateUserInfo.fulfilled.match(result)) {
        message.success('更新成功');
        setTimeout(() => setIsEditModalVisible(false), 300);
      }
    } catch (err) {
      message.error(err.message);
    }
  };

  const handleAwardSubmit = async () => {
    try {
      const values = await awardForm.validateFields();
      
      console.log('表单原始值:', values);

      // 如果只有日期没有时间，添加默认时间部分
      let awardTime = values.awardTime;
      

      const formattedValues = {
        ...values,
        awardTime: awardTime
      };

      console.log('准备发送的数据:', formattedValues);

      // 确保 awardId 存在（如果是编辑操作）
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
        
        // 添加成功后重新获取获奖列表
        dispatch(userActions.fetchUserAwards(userInfo.userId));
      }
      setIsAwardModalVisible(false);
      awardForm.resetFields(); // 重置表单
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
          // 删除成功后重新获取获奖列表
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

    // 转换日期格式为YYYY-MM-DD（去掉时间部分）
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

  // 处理头像上传
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
      
      await dispatch(userActions.uploadAvatar(file)).unwrap();
      message.success('头像上传成功');
      
      await new Promise(resolve => setTimeout(resolve, 100));
      await dispatch(userActions.fetchUserInfo());
      
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

  const getAvatarUrl = () => {
    if (!userInfo?.avatar) return null;
    
    if (userInfo.avatar.startsWith('http')) {
      return userInfo.avatar;
    }
    
    if (userInfo.avatar.startsWith('/')) {
      return `https://official.boyuan.club${userInfo.avatar}`;
    }
    
    return `https://official.boyuan.club/uploads/avatars/${userInfo.avatar}`;
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
          // 只显示日期，不显示时间
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
      <Card className="profile-card" loading={loading}>
        <div className="profile-header">
          <div className="avatar-section">
            <Upload {...uploadProps}>
              <Avatar
                size={120}
                src={getAvatarUrl()}
                icon={<UserOutlined />}
                className="user-avatar"
              />
            </Upload>
            <Upload {...uploadProps} className="avatar-upload-btn">
              <Button 
                icon={<UploadOutlined />} 
                loading={avatarLoading}
                disabled={avatarLoading}
              >
                更换头像
              </Button>
            </Upload>
          </div>

          <div className="profile-info">
            <Title level={3} className="profile-name">
              {userInfo?.name || '未命名用户'}
            </Title>
            <Text type="secondary" className="profile-username">
              @{userInfo?.username}
            </Text>

            <Descriptions column={1} className="profile-details">
              <Descriptions.Item label="部门">
                {userInfo?.dept || '未设置'}
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
                  dept: userInfo?.dept,
                  phone: userInfo?.phone
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

      {/* 编辑个人信息模态框 */}
      <Modal
        title="编辑个人信息"
        open={isEditModalVisible}
        onOk={handleEditSubmit}
        onCancel={() => setIsEditModalVisible(false)}
        confirmLoading={loading}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="dept" label="部门">
            <Input />
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