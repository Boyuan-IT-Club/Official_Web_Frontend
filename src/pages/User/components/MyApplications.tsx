import React, { useEffect, useState } from 'react';
import { Card, Empty, List, Tag, Typography } from 'antd';
import { HistoryOutlined, RightOutlined } from '@ant-design/icons';
import { request } from '@/utils';

const { Text } = Typography;

interface MyResumeItem {
  resumeId: number;
  cycleId: number;
  cycleName?: string;
  academicYear?: string;
  status: number;
  createdAt?: string;
}

const STATUS_TAG: Record<number, { color: string; text: string }> = {
  1: { color: 'default', text: '草稿' },
  2: { color: 'processing', text: '已提交' },
  3: { color: 'processing', text: '审核中' },
  4: { color: 'success', text: '审核通过' },
  5: { color: 'error', text: '未通过' },
};

/** 我的申请（跨周期）：历届投递列表，点击查看该届完整申请进度 */
const MyApplications: React.FC = () => {
  const [list, setList] = useState<MyResumeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    request({ url: '/api/resumes/my', method: 'get' })
      .then((res: any) => { if (!cancelled) setList(res?.data ?? []); })
      .catch(() => { /* 静默 */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <Card
      size="small"
      title={<span style={{ fontSize: 14 }}><HistoryOutlined /> 我的申请</span>}
      loading={loading}
      style={{ marginTop: 16 }}
      bodyStyle={{ padding: '4px 12px' }}
    >
      {list.length === 0 ? (
        <Text type="secondary" style={{ fontSize: 13, display: 'block', padding: '8px 4px' }}>还没有投递记录</Text>
      ) : (
        <List
          size="small"
          dataSource={list}
          renderItem={(item) => {
            const tag = STATUS_TAG[item.status] ?? { color: 'default', text: `状态${item.status}` };
            return (
              <List.Item
                style={{ cursor: 'pointer', padding: '8px 4px' }}
                onClick={() => window.open(`/main/interview-appointment?cycleId=${item.cycleId}`, '_blank')}
                actions={[<RightOutlined key="go" style={{ color: '#bbb' }} />]}
              >
                <List.Item.Meta
                  title={<span style={{ fontSize: 14 }}>{item.cycleName || `招募周期 #${item.cycleId}`}</span>}
                  description={
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {item.academicYear ? `${item.academicYear} 学年 · ` : ''}
                      投递于 {item.createdAt ? String(item.createdAt).replace('T', ' ').slice(0, 10) : '-'}
                    </Text>
                  }
                />
                <Tag color={tag.color}>{tag.text}</Tag>
              </List.Item>
            );
          }}
        />
      )}
    </Card>
  );
};

export default MyApplications;
