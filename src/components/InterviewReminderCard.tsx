import React, { useEffect, useState } from 'react';
import { Button, Card, Space, Tag, Typography } from 'antd';
import {
  CalendarOutlined, ClockCircleOutlined, SmileTwoTone, SwapOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { MySchedule, MyResult, getMySchedule, getMyResult } from '@/api/interviewPreference';

const { Text } = Typography;

/** 面试开始后多久算「已结束」。场次一般 15~30 分钟，放宽到 2 小时防止拖堂误判 */
const INTERVIEW_OVER_MS = 2 * 60 * 60 * 1000;

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

/**
 * 面试提醒卡。按面试的生命周期切换形态，而不是永远停在「面试时间已到」：
 *   面试前  → 倒计时 + 加入日历 / 申请改期
 *   刚开始  → 「面试进行中」（改期已无意义，收起操作）
 *   已结束  → 「面试已结束」，等结果
 *   有结果  → 直接显示录取/未通过
 */
const InterviewReminderCard: React.FC<{
  cycleId: number;
  onVisibleChange?: (visible: boolean) => void;
}> = ({ cycleId, onVisibleChange }) => {
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState<MySchedule | null>(null);
  const [result, setResult] = useState<MyResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getMySchedule(cycleId).then((res: any) => res?.data ?? null).catch(() => null),
      getMyResult(cycleId).then((res: any) => res?.data ?? null).catch(() => null),
    ]).then(([mySchedule, myResult]) => {
      if (cancelled) return;
      setSchedule(mySchedule);
      setResult(myResult);
      onVisibleChange?.(!!mySchedule?.interviewTime || !!myResult);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycleId]);

  // 结果先于安排判断：出结果后即使 schedule 缺失也该展示
  if (result) {
    const passed = result.decision === 1;
    return (
      <Card size="small" title={<><ClockCircleOutlined /> 面试结果</>}>
        <div style={{ fontSize: 22, fontWeight: 600 }}>
          {passed ? <><SmileTwoTone twoToneColor="#52c41a" /> 恭喜，你已被录取！</> : '很遗憾，未能通过'}
        </div>
        <Text type="secondary">
          {passed
            ? `${result.assignedDeptName ? `录取部门：${result.assignedDeptName}。` : ''}后续安排请留意邮件与群通知。`
            : '感谢参与本次招新，期待未来再见。'}
        </Text>
        <Space style={{ marginTop: 12 }}>
          <Button size="small" onClick={() => navigate('/main/interview-appointment')}>
            查看完整进度
          </Button>
        </Space>
      </Card>
    );
  }

  if (!schedule?.interviewTime) return null;

  const start = new Date(String(schedule.interviewTime));
  const diffMs = start.getTime() - Date.now();
  const timeText = (
    <Text type="secondary">
      {String(schedule.interviewTime).replace('T', ' ').slice(0, 16)}
      {schedule.deptName ? ` · ${schedule.deptName}` : ''}
      {schedule.location ? ` · ${schedule.location}` : ''}
    </Text>
  );

  // 面试已结束，结果未出：给一句明确的「接下来会发生什么」
  if (diffMs <= -INTERVIEW_OVER_MS) {
    return (
      <Card size="small" title={<><ClockCircleOutlined /> 面试提醒</>}>
        <div style={{ fontSize: 22, fontWeight: 600 }}>
          面试已结束 <Tag style={{ verticalAlign: 'middle' }}>等待结果</Tag>
        </div>
        {timeText}
        <div style={{ marginTop: 8 }}>
          <Text type="secondary">结果公布后会在这里显示，并通过邮件通知你。</Text>
        </div>
        <Space style={{ marginTop: 12 }}>
          <Button size="small" onClick={() => navigate('/main/interview-appointment')}>
            查看完整进度
          </Button>
        </Space>
      </Card>
    );
  }

  // 面试刚开始（2 小时内）：改期与日历都已无意义
  if (diffMs <= 0) {
    return (
      <Card size="small" title={<><ClockCircleOutlined /> 面试提醒</>}>
        <div style={{ fontSize: 22, fontWeight: 600 }}>面试进行中</div>
        {timeText}
        <div style={{ marginTop: 8 }}>
          <Text type="secondary">请按时到场，祝面试顺利！</Text>
        </div>
      </Card>
    );
  }

  const days = Math.floor(diffMs / 86400000);
  const hours = Math.floor((diffMs % 86400000) / 3600000);
  const countdown = days > 0 ? `还有 ${days} 天 ${hours} 小时` : `还有 ${Math.max(hours, 1)} 小时`;

  return (
    <Card size="small" title={<><ClockCircleOutlined /> 面试提醒</>}>
      <div style={{ fontSize: 22, fontWeight: 600 }}>{countdown}</div>
      {timeText}
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
