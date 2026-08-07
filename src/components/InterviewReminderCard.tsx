import React, { useEffect, useState } from 'react';
import { Button, Card, Space, Typography } from 'antd';
import { CalendarOutlined, ClockCircleOutlined, SwapOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { MySchedule, getMySchedule } from '@/api/interviewPreference';

const { Text } = Typography;

/** 生成 .ics 日历文件并下载 */
function downloadIcs(schedule: MySchedule) {
  const start = new Date(String(schedule.interviewTime));
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const fmt = (d: Date) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}00`;
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Boyuan IT Club//Interview//CN',
    'BEGIN:VEVENT',
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:博远信息技术社面试${schedule.deptName ? `（${schedule.deptName}）` : ''}`,
    `LOCATION:${schedule.location ?? ''}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT60M',
    'ACTION:DISPLAY',
    'DESCRIPTION:面试提醒',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const blob = new Blob([ics], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '博远面试.ics';
  a.click();
  URL.revokeObjectURL(url);
}

/** 面试提醒卡：有面试安排时显示倒计时与快捷操作，无安排时不渲染 */
const InterviewReminderCard: React.FC<{ cycleId: number }> = ({ cycleId }) => {
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState<MySchedule | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMySchedule(cycleId)
      .then((res: any) => { if (!cancelled) setSchedule(res?.data ?? null); })
      .catch(() => { /* 静默 */ });
    return () => { cancelled = true; };
  }, [cycleId]);

  if (!schedule?.interviewTime) return null;

  const start = new Date(String(schedule.interviewTime));
  const diffMs = start.getTime() - Date.now();
  const days = Math.floor(diffMs / 86400000);
  const hours = Math.floor((diffMs % 86400000) / 3600000);
  const countdown = diffMs <= 0
    ? '面试时间已到'
    : days > 0 ? `还有 ${days} 天 ${hours} 小时` : `还有 ${Math.max(hours, 1)} 小时`;

  return (
    <Card size="small" title={<><ClockCircleOutlined /> 面试提醒</>}>
      <div style={{ fontSize: 22, fontWeight: 600 }}>{countdown}</div>
      <Text type="secondary">
        {String(schedule.interviewTime).replace('T', ' ').slice(0, 16)}
        {schedule.deptName ? ` · ${schedule.deptName}` : ''}
        {schedule.location ? ` · ${schedule.location}` : ''}
      </Text>
      <Space style={{ marginTop: 12 }} wrap>
        <Button size="small" icon={<CalendarOutlined />} onClick={() => downloadIcs(schedule)}>
          加入日历
        </Button>
        <Button size="small" icon={<SwapOutlined />} onClick={() => navigate('/main/interview-appointment')}>
          申请改期
        </Button>
      </Space>
    </Card>
  );
};

export default InterviewReminderCard;
