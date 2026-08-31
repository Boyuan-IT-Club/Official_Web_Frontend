import React, { useEffect, useState } from 'react';
import { Card, Tag, Space, Spin, Alert, Descriptions, Typography } from 'antd';
import { CalendarOutlined, CheckCircleTwoTone, ClockCircleOutlined } from '@ant-design/icons';
import {
  MyPreference,
  MySchedule,
  getMyPreference,
  getMySchedule,
} from '@/api/interviewPreference';

const { Text } = Typography;

const fmtSlot = (s: { slotName?: string; interviewDate?: string; startTime?: string; endTime?: string }) =>
  `${s.slotName ?? ''} ${s.interviewDate ?? ''} ${(s.startTime ?? '').slice(0, 5)}-${(s.endTime ?? '').slice(0, 5)}`;

/**
 * 面试状态卡：展示本人已提交的志愿与分配结果（真实接口，替代旧 mock 预约面板）。
 */
const InterviewStatusCard: React.FC<{ cycleId: number }> = ({ cycleId }) => {
  const [loading, setLoading] = useState(true);
  const [preference, setPreference] = useState<MyPreference | null>(null);
  const [schedule, setSchedule] = useState<MySchedule | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [p, s]: any[] = await Promise.all([
          getMyPreference(cycleId).catch(() => null),
          getMySchedule(cycleId).catch(() => null),
        ]);
        if (!cancelled) {
          setPreference(p?.data ?? null);
          setSchedule(s?.data ?? null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [cycleId]);

  if (loading) {
    return (
      <Card size="small" title={<><CalendarOutlined /> 面试安排</>}>
        <div style={{ textAlign: 'center', padding: 16 }}><Spin /></div>
      </Card>
    );
  }

  // 面试时间已过就别再喊「请准时参加」——按时间切换文案
  const interviewPassed = schedule?.interviewTime
    ? new Date(String(schedule.interviewTime).replace(' ', 'T')).getTime() < Date.now()
    : false;

  return (
    <Card size="small" title={<><CalendarOutlined /> 面试安排</>}>
      {schedule?.interviewTime ? (
        <>
          {interviewPassed ? (
            <Alert
              type="info"
              showIcon
              icon={<ClockCircleOutlined />}
              message="本场面试已结束，结果将通过邮件通知，也可在首页查看进度"
              style={{ marginBottom: 12 }}
            />
          ) : (
            <Alert
              type="success"
              showIcon
              icon={<CheckCircleTwoTone twoToneColor="#52c41a" />}
              message="面试已安排，请准时参加"
              style={{ marginBottom: 12 }}
            />
          )}
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="面试时间">
              {String(schedule.interviewTime).replace('T', ' ').slice(0, 16)}
            </Descriptions.Item>
            <Descriptions.Item label="面试部门">{schedule.deptName || '-'}</Descriptions.Item>
            <Descriptions.Item label="面试地点">{schedule.location || '以通知为准'}</Descriptions.Item>
          </Descriptions>
        </>
      ) : preference ? (
        <>
          <Alert
            type="info"
            showIcon
            icon={<ClockCircleOutlined />}
            message="志愿已提交，等待管理员安排面试（结果将通过邮件通知，也可回到本页查看）"
            style={{ marginBottom: 12 }}
          />
          <Descriptions column={1} size="small">
            <Descriptions.Item label="志愿部门">
              <Space size={4}>
                {preference.firstDeptName && <Tag color="blue">第一志愿：{preference.firstDeptName}</Tag>}
                {preference.secondDeptName && <Tag>第二志愿：{preference.secondDeptName}</Tag>}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="可面试时间">
              <Space size={4} wrap>
                {(preference.acceptedTimeSlots ?? []).map((s) => (
                  <Tag key={s.timeSlotId}>{fmtSlot(s)}</Tag>
                ))}
              </Space>
            </Descriptions.Item>
          </Descriptions>
        </>
      ) : (
        <Text type="secondary">
          尚未提交面试意向——请在简历表单的「面试意向」区选择志愿部门与可面试时间后提交。
        </Text>
      )}
    </Card>
  );
};

export default InterviewStatusCard;
