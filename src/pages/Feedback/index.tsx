import React, { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, Empty, Form, Input, List, Pagination, Segmented, Space, Tag, Typography, Upload, message,
} from 'antd';
import type { UploadFile } from 'antd';
import { MessageOutlined, PlusOutlined, SendOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  FEEDBACK_CATEGORY, createFeedback, fetchMyFeedback, uploadFeedbackImage,
} from '@/api/feedback';
import type { FeedbackCategory, Feedback as FeedbackItem, Page } from '@/api/feedback';
import FeedbackImages from '@/components/FeedbackImages';
import './index.scss';

const { TextArea } = Input;
const { Paragraph, Text, Title } = Typography;

const Feedback: React.FC = () => {
  const [form] = Form.useForm<{ content: string }>();
  const [records, setRecords] = useState<Page<FeedbackItem> | null>(null);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [category, setCategory] = useState<FeedbackCategory>('bug');
  /** 已上传的截图：objectKey 随反馈一起提交 */
  const [images, setImages] = useState<Array<{ uid: string; key: string; url: string }>>([]);
  const [uploading, setUploading] = useState(false);

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
      await createFeedback({
        category,
        content: values.content.trim(),
        imageKeys: images.map((i) => i.key),
      });
      message.success('反馈已提交，感谢你的建议');
      form.resetFields();
      // 截图的本地预览 URL 要一并释放，否则连提几条就攒一堆没人回收的 blob
      images.forEach((i) => URL.revokeObjectURL(i.url));
      setImages([]);
      setCategory('bug');
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
          <Form.Item label="这是什么类型的反馈">
            <Segmented
              value={category}
              onChange={(v) => setCategory(v as FeedbackCategory)}
              options={(Object.keys(FEEDBACK_CATEGORY) as FeedbackCategory[]).map((k) => ({
                value: k, label: FEEDBACK_CATEGORY[k].label,
              }))}
            />
          </Form.Item>
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

          {/* 截图先传、拿到 key 再随反馈提交：用户往往先截图再慢慢描述问题，
              一次性提交意味着写到一半刷新就全丢 */}
          <Form.Item
            label="截图（选填，最多 3 张）"
            extra="一张图往往比三行字管用，尤其是页面报错的时候"
          >
            <Upload
              listType="picture-card"
              accept="image/*"
              fileList={images.map((i) => ({
                uid: i.uid, name: '截图', status: 'done', url: i.url,
              })) as UploadFile[]}
              onRemove={(file) => {
                setImages((prev) => {
                  const hit = prev.find((i) => i.uid === file.uid);
                  if (hit) URL.revokeObjectURL(hit.url);
                  return prev.filter((i) => i.uid !== file.uid);
                });
                return true;
              }}
              beforeUpload={async (file) => {
                if (images.length >= 3) {
                  message.warning('最多 3 张截图');
                  return Upload.LIST_IGNORE;
                }
                if (file.size > 5 * 1024 * 1024) {
                  message.warning('单张截图不能超过 5MB');
                  return Upload.LIST_IGNORE;
                }
                setUploading(true);
                try {
                  const res: any = await uploadFeedbackImage(file as File);
                  const key = res?.data?.imageKey;
                  if (!key) throw new Error('服务端未返回图片标识');
                  setImages((prev) => [...prev, {
                    uid: `${Date.now()}-${prev.length}`,
                    key,
                    // 本地预览直接用选中的文件，省一次下载往返
                    url: URL.createObjectURL(file),
                  }]);
                } catch (e: any) {
                  message.error(e?.message || '截图上传失败');
                } finally {
                  setUploading(false);
                }
                // 一律拦下 antd 自己的上传：传输已经在上面做完了
                return Upload.LIST_IGNORE;
              }}
            >
              {images.length < 3 && (
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 6 }}>上传</div>
                </div>
              )}
            </Upload>
          </Form.Item>

          <div className="feedback-page__composer-footer">
            <Text type="secondary">提交后可在下方查看自己的反馈记录。</Text>
            <Button type="primary" htmlType="submit" icon={<SendOutlined />}
                    loading={submitting} disabled={uploading}>
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
                  <Space direction="vertical" size={6} className="feedback-page__record-content">
                    <Space size={8}>
                      <Tag color={FEEDBACK_CATEGORY[item.category]?.color}>
                        {FEEDBACK_CATEGORY[item.category]?.label ?? item.category}
                      </Tag>
                      <Text type="secondary" className="feedback-page__record-time">
                        {dayjs(item.createdAt).format('YYYY-MM-DD HH:mm')}
                      </Text>
                    </Space>
                    <Text style={{ whiteSpace: 'pre-wrap' }}>{item.content}</Text>
                    <FeedbackImages
                      feedbackId={item.feedbackId}
                      count={item.imageKeys?.length ?? 0}
                    />
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
