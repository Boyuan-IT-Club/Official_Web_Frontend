// 管理端问题反馈：只读。
//
// 原来这页上还有一个「提交反馈」表单，和学生端那页完全重复——管理员要提反馈
// 去用户端提就行，管理端这一屏的职责是「看别人提了什么」。两处都能写的时候，
// 同一份内容会从两个入口进来，列表里也分不出是谁在什么身份下提的。
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Popconfirm, Segmented, Space, Table, Tag, Tooltip, Typography, message } from 'antd';
import type { TableProps } from 'antd';
import { MessageOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { FEEDBACK_CATEGORY, fetchAllFeedback, markFeedbackHandled } from '@/api/feedback';
import type { FeedbackAdminView, FeedbackCategory, Page } from '@/api/feedback';
import FeedbackImages from '@/components/FeedbackImages';
import './index.scss';

const { Paragraph, Title } = Typography;

type CategoryFilter = FeedbackCategory | 'all';
/** 默认只看未处理：列表的用处是「还剩什么要办」，不是流水账 */
type HandledFilter = 'pending' | 'done' | 'all';

const FeedbackManage: React.FC = () => {
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [handledFilter, setHandledFilter] = useState<HandledFilter>('pending');
  const [marking, setMarking] = useState<number | null>(null);
  const [data, setData] = useState<Page<FeedbackAdminView> | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchAllFeedback(
        page, size,
        category === 'all' ? undefined : category,
        handledFilter === 'all' ? undefined : (handledFilter === 'done' ? 1 : 0),
      );
      setData((response?.data as Page<FeedbackAdminView>) ?? null);
    } catch (error) {
      message.error((error as { message?: string })?.message ?? '加载问题反馈失败');
    } finally {
      setLoading(false);
    }
  }, [page, size, category, handledFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleHandled = async (record: FeedbackAdminView) => {
    const next = record.handled !== 1;
    setMarking(record.feedbackId);
    try {
      await markFeedbackHandled(record.feedbackId, next);
      message.success(next ? '已标记为处理完成' : '已恢复为未处理');
      await load();
    } catch (error) {
      message.error((error as { message?: string })?.message ?? '标记失败');
    } finally {
      setMarking(null);
    }
  };

  const columns = useMemo<TableProps<FeedbackAdminView>['columns']>(() => [
    {
      title: '提交人',
      key: 'user',
      width: 150,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <span>{record.userName || `用户 #${record.userId}`}</span>
          {record.username && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {record.username}
            </Typography.Text>
          )}
        </Space>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (value: FeedbackCategory) => (
        <Tag color={FEEDBACK_CATEGORY[value]?.color}>
          {FEEDBACK_CATEGORY[value]?.label ?? value}
        </Tag>
      ),
    },
    {
      title: '反馈内容',
      dataIndex: 'content',
      key: 'content',
      // 换行要保留：用户常按「第一步…第二步…」分行描述，挤成一段就没法读了
      render: (value) => (
        <span className="feedback-manage__content" style={{ whiteSpace: 'pre-wrap' }}>{value}</span>
      ),
    },
    {
      title: '截图',
      key: 'images',
      width: 200,
      render: (_, record) => (record.imageCount
        ? <FeedbackImages feedbackId={record.feedbackId} count={record.imageCount} />
        : <Typography.Text type="secondary">—</Typography.Text>),
    },
    {
      title: '提交时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (value) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '—'),
    },
    {
      title: '处理',
      key: 'handled',
      width: 150,
      fixed: 'right',
      render: (_, record) => (record.handled === 1 ? (
        <Space direction="vertical" size={2}>
          <Tooltip
            title={record.handledAt
              ? `${record.handledByName || '某位管理员'} 于 ${dayjs(record.handledAt).format('MM-DD HH:mm')} 标记`
              : ''}
          >
            <Tag color="green">已处理</Tag>
          </Tooltip>
          {/* 标错了要能退回去，所以不是单向操作 */}
          <Button type="link" size="small" loading={marking === record.feedbackId}
                  onClick={() => toggleHandled(record)}>
            撤销
          </Button>
        </Space>
      ) : (
        <Popconfirm
          title="标记为已处理？"
          description="标记后默认视图里就不再出现这条。随时可以撤销。"
          okText="标记"
          onConfirm={() => toggleHandled(record)}
        >
          <Button type="primary" size="small" ghost loading={marking === record.feedbackId}>
            标为已处理
          </Button>
        </Popconfirm>
      )),
    },
  ], [marking]);

  return (
    <div className="feedback-manage">
      <div className="feedback-manage__heading">
        <div>
          <Title level={3}>问题反馈</Title>
          <Paragraph type="secondary">
            集中查看用户提交的问题与建议。默认只列待处理的——处理完标一下，
            列表就只剩还要办的事。
          </Paragraph>
        </div>
        <MessageOutlined className="feedback-manage__heading-icon" />
      </div>
      <Card className="feedback-manage__card">
        <Space wrap style={{ marginBottom: 12 }}>
          <Segmented
            value={handledFilter}
            onChange={(v) => { setHandledFilter(v as HandledFilter); setPage(0); }}
            options={[
              { value: 'pending', label: '待处理' },
              { value: 'done', label: '已处理' },
              { value: 'all', label: '全部' },
            ]}
          />
          <Segmented
            value={category}
            onChange={(v) => { setCategory(v as CategoryFilter); setPage(0); }}
            options={[
              { value: 'all', label: '全部分类' },
              ...(Object.keys(FEEDBACK_CATEGORY) as FeedbackCategory[]).map((k) => ({
                value: k, label: FEEDBACK_CATEGORY[k].label,
              })),
            ]}
          />
        </Space>
        <Table<FeedbackAdminView>
          rowKey="feedbackId"
          columns={columns}
          dataSource={data?.content ?? []}
          loading={loading}
          scroll={{ x: 1050 }}
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
