import React, { useCallback, useEffect, useState } from 'react';
import { Button, Card, Empty, Form, Input, List, Pagination, Space, Typography, message } from 'antd';
import { MessageOutlined, SendOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { createFeedback, fetchMyFeedback } from '@/api/feedback';
import type { Feedback as FeedbackItem, Page } from '@/api/feedback';
import './index.scss';

const { TextArea } = Input;
const { Paragraph, Text, Title } = Typography;

const Feedback: React.FC = () => {
  const [form] = Form.useForm<{ content: string }>();
  const [records, setRecords] = useState<Page<FeedbackItem> | null>(null);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchMyFeedback(page, 10);
      setRecords((response?.data as Page<FeedbackItem>) ?? null);
    } catch (error) {
      message.error((error as { message?: string })?.message ?? '加载反馈记录失败');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (values: { content: string }) => {
    setSubmitting(true);
    try {
      await createFeedback(values.content.trim());
      message.success('反馈已提交，感谢你的建议');
      form.resetFields();
      setPage(0);
      await load();
    } catch (error) {
      message.error((error as { message?: string })?.message ?? '提交反馈失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="feedback-page">
      <div className="feedback-page__heading">
        <div>
          <Title level={3}>问题反馈</Title>
          <Paragraph type="secondary">遇到问题或有任何建议，都可以在这里告诉我们。</Paragraph>
        </div>
        <MessageOutlined className="feedback-page__heading-icon" />
      </div>

      <Card className="feedback-page__composer" title="提交反馈">
        <Form form={form} layout="vertical" onFinish={submit}>
          <Form.Item
            name="content"
            rules={[
              { required: true, whitespace: true, message: '请填写反馈内容' },
              { max: 5000, message: '反馈内容不能超过 5000 个字符' },
            ]}
          >
            <TextArea
              rows={5}
              showCount
              maxLength={5000}
              placeholder="请描述你遇到的问题或想提出的建议…"
            />
          </Form.Item>
          <div className="feedback-page__composer-footer">
            <Text type="secondary">提交后可在下方查看自己的反馈记录。</Text>
            <Button type="primary" htmlType="submit" icon={<SendOutlined />} loading={submitting}>
              提交反馈
            </Button>
          </div>
        </Form>
      </Card>

      <Card className="feedback-page__history" title="我的反馈">
        {records?.content?.length ? (
          <>
            <List
              loading={loading}
              dataSource={records.content}
              renderItem={(item) => (
                <List.Item className="feedback-page__record">
                  <Space direction="vertical" size={4} className="feedback-page__record-content">
                    <Text>{item.content}</Text>
                    <Text type="secondary" className="feedback-page__record-time">
                      {dayjs(item.createdAt).format('YYYY-MM-DD HH:mm')}
                    </Text>
                  </Space>
                </List.Item>
              )}
            />
            <div className="feedback-page__pagination">
              <Pagination
                current={page + 1}
                pageSize={10}
                total={records.totalElements}
                showSizeChanger={false}
                hideOnSinglePage
                onChange={(nextPage) => setPage(nextPage - 1)}
              />
            </div>
          </>
        ) : (
          <Empty description={loading ? '正在加载…' : '你还没有提交过反馈'} />
        )}
      </Card>
    </div>
  );
};

export default Feedback;
