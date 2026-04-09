import React, { useEffect, useState } from 'react';
import {
  Avatar, Button, Card, Col, Descriptions,
  Form, Input, message, Modal, Row, Spin, Tag, Typography, Upload,
} from 'antd';
import type { UploadProps } from 'antd';
import type { RcFile } from 'antd/es/upload/interface';
import { EditOutlined, UserOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { userActions } from '@/store/modules/user';
import type { RootState, AppDispatch } from '@/store';
import type { UserInfo } from '@/api/user';
import AwardPanel from './components/AwardPanel';
import './index.scss';

const { Title, Text } = Typography;

interface EditFormValues {
  [key: string]: string | undefined;
  name: string;
  major?: string;
  phone?: string;
}

const PersonPage: React.FC = () => {
  const [form] = Form.useForm<EditFormValues>();
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(0);

  const dispatch = useDispatch<AppDispatch>();

  const { token, userInfo, loading, error } = useSelector((state: RootState) => state.user as {
    token?: string;
    userInfo?: UserInfo | null;
    loading: boolean;
    error?: string | null;
  });

  useEffect(() => {
    if (token) void dispatch(userActions.fetchUserInfo());
  }, [token, dispatch]);

  useEffect(() => {
    if (error) message.error(error);
  }, [error]);

  const handleEditSubmit = async (): Promise<void> => {
    try {
      const values = await form.validateFields();
      const updateData: Record<string, string> = { name: values.name };
      if (values.phone) updateData.phone = values.phone;
      if (values.major) updateData.major = values.major;

      const result = await dispatch(userActions.updateUserInfo(updateData));
      if (userActions.updateUserInfo.fulfilled.match(result)) {
        await dispatch(userActions.fetchUserInfo()).unwrap();
        message.success('更新成功');
        setIsEditModalVisible(false);
      }
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : '更新失败');
    }
  };

  const handleAvatarUpload: UploadProps['beforeUpload'] = async (file: RcFile) => {
    if (file.size > 2 * 1024 * 1024) { message.error('文件大小不能超过2MB'); return Upload.LIST_IGNORE; }
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      message.error('请上传JPEG、PNG、GIF或WebP格式的图片');
      return Upload.LIST_IGNORE;
    }
    setAvatarLoading(true);
    try {
      await dispatch(userActions.uploadAvatar(file)).unwrap();
      message.success('头像上传成功');
      setAvatarVersion((prev) => prev + 1);
      setTimeout(() => void dispatch(userActions.fetchUserInfo()), 300);
    } catch (e: unknown) {
      message.error(`头像上传失败: ${e instanceof Error ? e.message : '未知错误'}`);
    } finally {
      setAvatarLoading(false);
    }
    return false;
  };

  const getAvatarUrl = (): string | null => {
    if (!userInfo?.avatar) return null;
    let url = userInfo.avatar;
    if (!url.startsWith('http')) {
      url = url.startsWith('/')
        ? `https://official.boyuan.club${url}`
        : `https://official.boyuan.club/uploads/avatars/${url}`;
    }
    return `${url}?t=${Date.now()}&v=${avatarVersion}`;
  };

  if (loading && !userInfo) {
    return <div className="loading-container"><Spin tip="加载用户信息..." size="large" /></div>;
  }

  return (
    <div className="person-page">
      <Row justify="center">
        <Col xs={24} lg={20} xl={18}>
          <Card className="profile-card" loading={loading}>
            <div className="profile-header">
              <div className="avatar-section">
                <Upload name="file" showUploadList={false} beforeUpload={handleAvatarUpload} accept="image/*" disabled={avatarLoading}>
                  <Avatar size={120} src={getAvatarUrl() ?? undefined} icon={<UserOutlined />} className="user-avatar" key={`avatar-${avatarVersion}`} />
                </Upload>
                {avatarLoading && <div className="avatar-loading"><Spin size="small" /></div>}
                <div className="avatar-tip"><Text type="secondary">点击头像更换</Text></div>
              </div>

              <div className="profile-info">
                <Title level={3} className="profile-name">{userInfo?.name || '未命名用户'}</Title>
                <Text type="secondary" className="profile-username">@{userInfo?.username}</Text>
                <Descriptions column={1} className="profile-details">
                  <Descriptions.Item label="专业">{userInfo?.major || '未设置'}</Descriptions.Item>
                  <Descriptions.Item label="部门">
                    <Tag color={userInfo?.dept ? 'blue' : 'default'}>{userInfo?.dept || '非社员'}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="邮箱">{userInfo?.email}</Descriptions.Item>
                  <Descriptions.Item label="电话">{userInfo?.phone || '未设置'}</Descriptions.Item>
                </Descriptions>
                <Button type="primary" icon={<EditOutlined />} onClick={() => {
                  form.setFieldsValue({ name: userInfo?.name ?? '', major: userInfo?.major, phone: userInfo?.phone });
                  setIsEditModalVisible(true);
                }}>
                  编辑个人信息
                </Button>
              </div>
            </div>
          </Card>

          {/* 获奖经历独立组件，只在渲染时才请求数据 */}
          <AwardPanel userId={userInfo?.userId} />
        </Col>
      </Row>

      <Modal title="编辑个人信息" open={isEditModalVisible} onOk={handleEditSubmit}
        onCancel={() => setIsEditModalVisible(false)} confirmLoading={loading} okText="保存" cancelText="取消" width={500}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}><Input /></Form.Item>
          <Form.Item name="major" label="专业"><Input placeholder="请输入您的专业" /></Form.Item>
          <Form.Item name="phone" label="电话" rules={[{ pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码' }]}><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PersonPage;