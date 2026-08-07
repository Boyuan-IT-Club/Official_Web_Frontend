import React, { useEffect, useState } from 'react';
import { Button, Card, Empty, Tag, Typography } from 'antd';
import { NotificationOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { Activity, listActivities } from '@/api/manage/activityApis';

const { Text } = Typography;

/** 最新活动卡：展示最近 3 条活动（真实数据），跳转活动页看全部 */
const ActivitiesPreviewCard: React.FC = () => {
  const navigate = useNavigate();
  const [list, setList] = useState<Activity[]>([]);

  useEffect(() => {
    let cancelled = false;
    listActivities()
      .then((res: any) => {
        if (cancelled) return;
        const all: Activity[] = res?.data ?? [];
        // 按开始时间倒序取最近 3 条
        all.sort((a, b) => String(b.startTime ?? '').localeCompare(String(a.startTime ?? '')));
        setList(all.slice(0, 3));
      })
      .catch(() => { /* 静默 */ });
    return () => { cancelled = true; };
  }, []);

  return (
    <Card
      size="small"
      title={<><NotificationOutlined /> 最新活动</>}
      extra={<Button type="link" size="small" onClick={() => navigate('/Activities')}>全部</Button>}
    >
      {list.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无活动，敬请期待" />
      ) : (
        list.map((a, i) => (
          <div
            key={a.activityId}
            style={{
              padding: '6px 0',
              borderBottom: i < list.length - 1 ? '1px solid #f0f0f0' : 'none',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <Text ellipsis style={{ maxWidth: 200 }}>{a.title}</Text>
              {a.isFeatured && <Tag color="gold">精选</Tag>}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {a.startTime ?? '时间待定'}{a.location ? ` · ${a.location}` : ''}
            </Text>
          </div>
        ))
      )}
    </Card>
  );
};

export default ActivitiesPreviewCard;
