import React, { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  message,
  Modal,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EditOutlined, PlusOutlined, TrophyOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { userActions } from '@/store/modules/user';
import type { RootState, AppDispatch } from '@/store';
import type { Award, AwardFormValues, UpdateAwardPayload, AddAwardPayload, Id } from '@/api/user';

const { Text } = Typography;
const { TextArea } = Input;

interface AwardPanelProps {
  userId?: Id;
}

const AwardPanel: React.FC<AwardPanelProps> = ({ userId }) => {
  const [awardForm] = Form.useForm<AwardFormValues>();
  const [isAwardModalVisible, setIsAwardModalVisible] = useState(false);

  const dispatch = useDispatch<AppDispatch>();

  const { token, awards = [], loading } = useSelector((state: RootState) => state.user as {
    token?: string;
    awards?: Award[];
    loading: boolean;
  });

  // 只有本组件渲染时才拉取获奖记录，解决"打开主页就调用"的问题
  useEffect(() => {
    if (token && userId != null) {
      void dispatch(userActions.fetchUserAwards(userId));
    }
  }, [token, userId, dispatch]);

  const handleAwardSubmit = async (): Promise<void> => {
    try {
      const values = await awardForm.validateFields();
      const rawAwardId = values.awardId;

      if (rawAwardId != null && rawAwardId !== '') {
        const payload: UpdateAwardPayload = { ...values, awardId: rawAwardId as Id };
        await dispatch(userActions.updateAward(payload)).unwrap();
        message.success('获奖经历更新成功');
      } else {
        const payload: AddAwardPayload = {
          awardName: values.awardName,
          awardTime: values.awardTime,
          description: values.description,
        };
        await dispatch(userActions.addAward(payload)).unwrap();
        message.success('获奖经历添加成功');
        if (userId != null) {
          void dispatch(userActions.fetchUserAwards(userId));
        }
      }

      setIsAwardModalVisible(false);
      awardForm.resetFields();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : '操作失败，请重试');
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
          if (userId != null) {
            void dispatch(userActions.fetchUserAwards(userId));
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
    let awardTime = record.awardTime;
    if (awardTime) {
      const date = new Date(awardTime);
      if (!Number.isNaN(date.getTime())) {
        awardTime = date.toISOString().split('T')[0];
      }
    }
    awardForm.setFieldsValue({ ...record, awardTime });
    setIsAwardModalVisible(true);
  };

  const awardColumns: ColumnsType<Award> = [
    {
      title: '奖项名称',
      dataIndex: 'awardName',
      key: 'awardName',
      width: '25%',
      render: (text: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrophyOutlined style={{ color: '#ffc53d', fontSize: 16 }} />
          <Text strong style={{ color: '#1f1f1f', fontSize: 14 }}>{text}</Text>
        </div>
      ),
    },
    {
      title: '获奖时间',
      dataIndex: 'awardTime',
      key: 'awardTime',
      width: '20%',
      render: (text?: string) => {
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
      render: (text?: string) => (
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
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEditAward(record)} style={{ color: '#1890ff' }}>
            编辑
          </Button>
          <Button type="link" icon={<DeleteOutlined />} onClick={() => handleDeleteAward(record.awardId)} style={{ color: '#ff4d4f' }}>
            删除
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
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
            onClick={() => { awardForm.resetFields(); setIsAwardModalVisible(true); }}
            style={{ backgroundColor: '#1890ff', borderColor: '#1890ff', borderRadius: 6 }}
          >
            添加获奖经历
          </Button>
        }
        headStyle={{ borderBottom: '1px solid #f0f0f0', padding: '16px 24px' }}
        bodyStyle={{ padding: 0 }}
      >
        <Table<Award>
          columns={awardColumns}
          dataSource={Array.isArray(awards) ? awards : []}
          rowKey="awardId"
          pagination={{ pageSize: 5, showSizeChanger: false, showTotal: (total) => `共 ${total} 条记录` }}
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
          <Form.Item name="awardId" hidden><Input /></Form.Item>
          <Form.Item name="awardName" label="奖项名称" rules={[{ required: true, message: '请输入奖项名称' }]}>
            <Input placeholder="例如：ACM国际大学生程序设计竞赛" />
          </Form.Item>
          <Form.Item name="awardTime" label="获奖时间" rules={[{ required: true, message: '请选择获奖时间' }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="description" label="奖项描述" rules={[{ required: true, message: '请输入奖项描述' }]}>
            <TextArea rows={4} placeholder="详细描述比赛级别、个人贡献等信息..." />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default AwardPanel;