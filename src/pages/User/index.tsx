import React, { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  message,
  Modal,
  Row,
  Spin,
  Table,
  Tag,
  Typography,
  Upload,
} from 'antd';
import type { UploadProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { RcFile } from 'antd/es/upload/interface';
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  TrophyOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { userActions } from '@/store/modules/user';
import type { RootState, AppDispatch } from '@/store';
import './index.scss';

const { Title, Text } = Typography;
const { TextArea } = Input;

/** ---- Domain types (根据后端/Store 结构可再细化) ---- */
type Id = string | number;

interface UserInfo {
  userId: Id;
  name?: string;
  username?: string;
  major?: string;
  dept?: string;
  email?: string;
  phone?: string;
  avatar?: string;
}

interface Award {
  awardId: Id;
  awardName: string;
  awardTime: string; // ISO date string or date-only string
  description?: string;
}

/** ---- Form types ---- */
interface EditFormValues {
  /**
   * 兼容部分项目里 `UserInfo` 存在字符串索引签名（例如 `[key: string]: string`）的情况。
   * 这样 EditFormValues 才能直接作为 `Partial<UserInfo>` 传给 updateUserInfo。
   */
  [key: string]: string | undefined;
  name: string;
  major?: string;
  phone?: string;
}

type AwardFormValues = {
  awardId?: Id;
  awardName: string;
  awardTime: string;
  description?: string;
};

type UpdateAwardPayload = AwardFormValues & { awardId: Id };
type AddAwardPayload = Omit<AwardFormValues, 'awardId'>;

/** ---- Component ---- */
const PersonPage: React.FC = () => {
  const [form] = Form.useForm<EditFormValues>();
  const [awardForm] = Form.useForm<AwardFormValues>();

  const [isEditModalVisible, setIsEditModalVisible] = useState<boolean>(false);
  const [isAwardModalVisible, setIsAwardModalVisible] = useState<boolean>(false);
  const [avatarLoading, setAvatarLoading] = useState<boolean>(false);
  const [avatarVersion, setAvatarVersion] = useState<number>(0);

  const dispatch = useDispatch<AppDispatch>();

  const { token, userInfo, awards = [], loading, error } = useSelector((state: RootState) => state.user as {
    token?: string;
    userInfo?: UserInfo | null;
    awards?: Award[];
    loading: boolean;
    error?: string | null;
  });

  useEffect(() => {
    if (token) {
      void dispatch(userActions.fetchUserInfo());
    }
  }, [token, dispatch]);

  useEffect(() => {
    if (token && userInfo?.userId != null) {
      void dispatch(userActions.fetchUserAwards(userInfo.userId));
    }
  }, [token, userInfo?.userId, dispatch]);

  useEffect(() => {
    if (error) {
      message.error(error);
    }
  }, [error]);

  const handleEditSubmit = async (): Promise<void> => {
    try {
      const values = await form.validateFields();

      // 只提交有值的字段，避免把 undefined 传给后端 / reducer（也兼容 UserInfo 带字符串索引签名的写法）
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
      const msg = err instanceof Error ? err.message : '更新失败';
      // 表单校验错误也会走到这里；按需可区分
      message.error(msg);
    }
  };

  const handleAwardSubmit = async (): Promise<void> => {
    try {
      const values = await awardForm.validateFields();

      const formattedValues: AwardFormValues = {
        ...values,
        awardTime: values.awardTime,
      };

      const rawAwardId = values.awardId;
      if (rawAwardId != null && rawAwardId !== '') {
        const payload: UpdateAwardPayload = {
          ...formattedValues,
          awardId: rawAwardId as Id,
        };
        await dispatch(userActions.updateAward(payload)).unwrap();
        message.success('获奖经历更新成功');
      } else {
        const payload: AddAwardPayload = {
          awardName: formattedValues.awardName,
          awardTime: formattedValues.awardTime,
          description: formattedValues.description,
        };
        await dispatch(userActions.addAward(payload)).unwrap();
        message.success('获奖经历添加成功');
        if (userInfo?.userId != null) {
          void dispatch(userActions.fetchUserAwards(userInfo.userId));
        }
      }

      setIsAwardModalVisible(false);
      awardForm.resetFields();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '操作失败，请重试';
      message.error(msg);
    }
  };

  const handleDeleteAward = (awardId: Id): void => {
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
          if (userInfo?.userId != null) {
            void dispatch(userActions.fetchUserAwards(userInfo.userId));
          }
        } catch {
          message.error('删除失败');
        }
      },
    });
  };

  const handleEditAward = (record: Award): void => {
    if (!record?.awardId) {
      message.error('无效的获奖记录');
      return;
    }

    let awardTime: string = record.awardTime;
    if (awardTime) {
      const date = new Date(awardTime);
      if (!Number.isNaN(date.getTime())) {
        awardTime = date.toISOString().split('T')[0];
      }
    }

    awardForm.setFieldsValue({
      ...record,
      awardTime,
    });
    setIsAwardModalVisible(true);
  };

  const handleAvatarUpload: UploadProps['beforeUpload'] = async (file: RcFile) => {
    const MAX_FILE_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      message.error('文件大小不能超过2MB');
      return Upload.LIST_IGNORE;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      message.error('请上传JPEG、PNG、GIF或WebP格式的图片');
      return Upload.LIST_IGNORE;
    }

    setAvatarLoading(true);
    try {
      await dispatch(userActions.uploadAvatar(file)).unwrap();
      message.success('头像上传成功');

      // 强制重新渲染头像
      setAvatarVersion((prev) => prev + 1);

      // 重新获取用户信息
      setTimeout(() => {
        void dispatch(userActions.fetchUserInfo());
      }, 300);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '未知错误';
      message.error(`头像上传失败: ${msg}`);
    } finally {
      setAvatarLoading(false);
    }

    // 阻止 antd 默认上传行为
    return false;
  };

  const uploadProps: UploadProps = {
    name: 'file',
    showUploadList: false,
    beforeUpload: handleAvatarUpload,
    accept: 'image/*',
    disabled: avatarLoading,
  };

  const getAvatarUrl = (): string | null => {
    if (!userInfo?.avatar) return null;

    let avatarUrl = userInfo.avatar;

    // 已是完整 URL
    if (avatarUrl.startsWith('http')) {
      return `${avatarUrl}?t=${Date.now()}&v=${avatarVersion}`;
    }

    // 相对路径处理
    if (avatarUrl.startsWith('/')) {
      avatarUrl = `https://official.boyuan.club${avatarUrl}`;
    } else {
      avatarUrl = `https://official.boyuan.club/uploads/avatars/${avatarUrl}`;
    }

    return `${avatarUrl}?t=${Date.now()}&v=${avatarVersion}`;
  };

  const awardColumns: ColumnsType<Award> = useMemo(
    () => [
      {
        title: '奖项名称',
        dataIndex: 'awardName',
        key: 'awardName',
        width: '25%',
        render: (text: Award['awardName']) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrophyOutlined style={{ color: '#ffc53d', fontSize: 16 }} />
            <Text strong style={{ color: '#1f1f1f', fontSize: 14 }}>
              {text}
            </Text>
          </div>
        ),
      },
      {
        title: '获奖时间',
        dataIndex: 'awardTime',
        key: 'awardTime',
        width: '20%',
        render: (text?: Award['awardTime']) => {
          if (!text) return '-';
          const date = new Date(text);
          if (Number.isNaN(date.getTime())) return text;
          return (
            <Tag color="blue" style={{ margin: 0, border: 'none', borderRadius: 6 }}>
              {date.toLocaleDateString('zh-CN')}
            </Tag>
          );
        },
      },
      {
        title: '奖项描述',
        dataIndex: 'description',
        key: 'description',
        width: '40%',
        render: (text?: Award['description']) => (
          <Text style={{ color: '#666', lineHeight: '1.5' }}>{text || '暂无描述'}</Text>
        ),
      },
      {
        title: '操作',
        key: 'action',
        width: '15%',
        align: 'center',
        render: (_: unknown, record: Award) => (
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
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [avatarVersion, userInfo?.userId],
  );

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
                    src={getAvatarUrl() ?? undefined}
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
                  <Descriptions.Item label="专业">{userInfo?.major || '未设置'}</Descriptions.Item>
                  <Descriptions.Item label="部门">
                    <Tag color={userInfo?.dept ? 'blue' : 'default'}>{userInfo?.dept || '非社员'}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="邮箱">{userInfo?.email}</Descriptions.Item>
                  <Descriptions.Item label="电话">{userInfo?.phone || '未设置'}</Descriptions.Item>
                </Descriptions>

                <Button
                  type="primary"
                  onClick={() => {
                    form.setFieldsValue({
                      name: userInfo?.name ?? '',
                      major: userInfo?.major,
                      phone: userInfo?.phone,
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrophyOutlined style={{ color: '#ffc53d', fontSize: 18 }} />
                <span style={{ color: '#1f1f1f', fontWeight: 600 }}>获奖经历</span>
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
                  borderRadius: 6,
                }}
              >
                添加获奖经历
              </Button>
            }
            headStyle={{
              borderBottom: '1px solid #f0f0f0',
              padding: '16px 24px',
            }}
            bodyStyle={{ padding: 0 }}
          >
            <Table<Award>
              columns={awardColumns}
              dataSource={Array.isArray(awards) ? awards : []}
              rowKey="awardId"
              pagination={{
                pageSize: 5,
                showSizeChanger: false,
                showTotal: (total) => `共 ${total} 条记录`,
              }}
              loading={loading}
              locale={{
                emptyText: (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                    <TrophyOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                    <div>暂无获奖经历</div>
                  </div>
                ),
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
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
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
                message: '请输入正确的手机号码',
              },
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