import React, { useEffect, useState } from 'react';
import { Card, Empty, List, Tag, Typography } from 'antd';
import { HistoryOutlined, RightOutlined } from '@ant-design/icons';
import { request } from '@/utils';
import { getAllCycles } from '@/api/manage/cycleApis';

const { Text } = Typography;

interface MyResumeItem {
  resumeId: number;
  cycleId: number;
  cycleName?: string;
  academicYear?: string;
  status: number;
  createdAt?: string;
}

// 学生视角只需三态：草稿 / 已提交 / 已截止未提交（评审细节由结果通知承载）
const statusTag = (status: number, cycleEnded: boolean): { color: string; text: string } => {
  if (status >= 2) return { color: 'processing', text: '已提交' };
  return cycleEnded
    ? { color: 'default', text: '已截止（未提交）' }
    : { color: 'gold', text: '草稿' };
};

/** 我的申请（跨周期）：历届投递列表，点击查看该届完整申请进度 */
const MyApplications: React.FC = () => {
  const [list, setList] = useState<MyResumeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cycleEnd, setCycleEnd] = useState<Record<number, string | undefined>>({});

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      request({ url: '/api/resumes/my', method: 'get' }).catch(() => null),
      getAllCycles().catch(() => null),
    ])
      .then(([res, cyc]: any[]) => {
        if (cancelled) return;
        setList(res?.data ?? []);
        const map: Record<number, string | undefined> = {};
        (cyc?.data ?? []).forEach((c: any) => { map[c.cycleId] = c.endDate; });
        setCycleEnd(map);
      })
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
            const end = cycleEnd[item.cycleId];
            const ended = !!end && end < new Date().toISOString().slice(0, 10);
            const tag = statusTag(item.status, ended);
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
