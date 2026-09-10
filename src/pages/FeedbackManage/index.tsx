import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Form, Input, Table, Typography, message } from 'antd';
import type { TableProps } from 'antd';
import { MessageOutlined, SendOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { createFeedback, fetchAllFeedback } from '@/api/feedback';
import type { FeedbackAdminView, Page } from '@/api/feedback';
import './index.scss';

const { Paragraph, Title } = Typography;
const { TextArea } = Input;

const FeedbackManage: React.FC = () => {
  const [form] = Form.useForm<{ content: string }>();
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [data, setData] = useState<Page<FeedbackAdminView> | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchAllFeedback(page, size);
      setData((response?.data as Page<FeedbackAdminView>) ?? null);
    } catch (error) {
      message.error((error as { message?: string })?.message ?? '加载问题反馈失败');
    } finally {
      setLoading(false);
    }
  }, [page, size]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (values: { content: string }) => {
    setSubmitting(true);
    try {
      await createFeedback(values.content.trim());
      message.success('反馈已提交');
      form.resetFields();
      setPage(0);
      await load();
    } catch (error) {
      message.error((error as { message?: string })?.message ?? '提交反馈失败');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = useMemo<TableProps<FeedbackAdminView>['columns']>(() => [
    {
      title: '提交人',
      key: 'user',
      width: 160,
      render: (_, record) => record.userName || record.username || `用户 #${record.userId}`,
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 180,
      render: (value) => value || '—',
    },
    {
      title: '反馈内容',
      dataIndex: 'content',
      key: 'content',
      render: (value) => <span className="feedback-manage__content">{value}</span>,
    },
    {
      title: '提交时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (value) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '—'),
    },
  ], []);

  return (
    <div className="feedback-manage">
      <div className="feedback-manage__heading">
        <div>
          <Title level={3}>问题反馈</Title>
          <Paragraph type="secondary">集中查看用户提交的问题与建议。</Paragraph>
        </div>
        <MessageOutlined className="feedback-manage__heading-icon" />
      </div>
      <Card className="feedback-manage__composer" title="提交反馈">
        <Form form={form} layout="vertical" onFinish={submit}>
          <Form.Item
            name="content"
            rules={[
              { required: true, whitespace: true, message: '请填写反馈内容' },
              { max: 5000, message: '反馈内容不能超过 5000 个字符' },
            ]}
          >
            <TextArea rows={4} maxLength={5000} showCount placeholder="请描述你遇到的问题或想提出的建议…" />
          </Form.Item>
          <div className="feedback-manage__composer-footer">
            <Typography.Text type="secondary">管理员与超管的反馈也会进入下方列表。</Typography.Text>
            <Button type="primary" htmlType="submit" icon={<SendOutlined />} loading={submitting}>
              提交反馈
            </Button>
          </div>
        </Form>
      </Card>
      <Card className="feedback-manage__card">
        <Table<FeedbackAdminView>
          rowKey="feedbackId"
          columns={columns}
          dataSource={data?.content ?? []}
          loading={loading}
          scroll={{ x: 760 }}
          pagination={{
            current: page + 1,
            pageSize: size,
            total: data?.totalElements ?? 0,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条反馈`,
            onChange: (nextPage, nextSize) => {
              setPage(nextPage - 1);
              setSize(nextSize);
            },
          }}
        />
      </Card>
    </div>
  );
};

export default FeedbackManage;
