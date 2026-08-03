// src/components/InterviewAppointmentPanel.tsx
// 面试预约面板 — 直接用简历中已选的意向部门展示可预约时间段
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, Button, Card, Spin, Typography, message, Progress, Modal } from 'antd';
import { CalendarOutlined, CheckCircleOutlined } from '@ant-design/icons';
import {
  getInterviewTimeSlots,
  confirmInterviewSlot,
  cancelInterviewSlot,
  type InterviewTimeSlot,
  type Department,
} from '@/api/interview';
import { MOCK_INTERVIEW_SLOTS } from '@/api/interviewMock';

const { Title, Text } = Typography;
const FORCE_MOCK = true;

const isDepartment = (s: string): s is Department =>
  ['综合部', '媒体部', '技术部', '项目部'].includes(s);

interface Props {
  cycleId: number;
  isSubmitted?: boolean;
  departments: { first: string; second: string };
}

const InterviewAppointmentPanel: React.FC<Props> = ({ cycleId, isSubmitted = false, departments }) => {
  // 从简历志愿中提取有效部门，去重
  const depts: Department[] = [...new Set(
    [departments.first, departments.second].filter((d): d is Department => !!d && d !== '无' && isDepartment(d))
  )];

  const [activeIdx, setActiveIdx] = useState(0);
  const [slots, setSlots] = useState<InterviewTimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmingSlotId, setConfirmingSlotId] = useState<number | null>(null);
  const [cancelingSlotId, setCancelingSlotId] = useState<number | null>(null);
  const [bookedSlotId, setBookedSlotId] = useState<number | null>(null);
  const prevCycleRef = useRef(cycleId);

  const activeDept = depts[activeIdx] || null;

  const fetchSlots = useCallback(async (department: Department) => {
    try {
      setLoading(true);
      if (FORCE_MOCK) { setSlots(MOCK_INTERVIEW_SLOTS[department] ?? []); return; }
      const data = await getInterviewTimeSlots(cycleId, department);
      setSlots(data);
    } catch (err: any) {
      console.warn('后端不可用，使用前端演示数据:', err?.message || String(err));
      setSlots(MOCK_INTERVIEW_SLOTS[department] ?? []);
    } finally { setLoading(false); }
  }, [cycleId]);

  // 切换部门或首次挂载时加载
  useEffect(() => {
    if (activeDept) fetchSlots(activeDept);
  }, [activeDept, fetchSlots]);

  // 志愿变更时重置
  useEffect(() => {
    if (prevCycleRef.current !== cycleId) {
      prevCycleRef.current = cycleId;
      setActiveIdx(0);
      setBookedSlotId(null);
      setSlots([]);
    }
  }, [cycleId, depts]);

  const handleConfirmSlot = useCallback((slot: InterviewTimeSlot) => {
    if (slot.registeredCount >= slot.quota) { message.warning('该时间段已约满'); return; }
    Modal.confirm({
      title: '确认面试时间', icon: <CalendarOutlined />,
      content: `确定预约「${slot.department} - ${slot.timeLabel}」(${slot.startTime} - ${slot.endTime}) 吗？`,
      okText: '确认预约', cancelText: '取消',
      onOk: async () => {
        setConfirmingSlotId(slot.slotId);
        try {
          if (FORCE_MOCK) {
            await new Promise(r => setTimeout(r, 600));
            setSlots(prev => prev.map(s => s.slotId === slot.slotId ? { ...s, registeredCount: s.registeredCount + 1 } : s));
          } else {
            await confirmInterviewSlot(slot.slotId, cycleId, slot.department);
            await fetchSlots(slot.department);
          }
          setBookedSlotId(slot.slotId);
          message.success(`已成功预约「${slot.department} - ${slot.timeLabel}」`);
        } catch (err: any) { message.error('预约失败: ' + (err?.message || String(err))); }
        finally { setConfirmingSlotId(null); }
      },
    });
  }, [cycleId, fetchSlots]);

  const handleCancelSlot = useCallback((slot: InterviewTimeSlot) => {
    Modal.confirm({
      title: '取消预约', icon: <CalendarOutlined />,
      content: `确定取消「${slot.department} - ${slot.timeLabel}」(${slot.startTime} - ${slot.endTime}) 的面试预约吗？`,
      okText: '确认取消', cancelText: '返回', okButtonProps: { danger: true },
      onOk: async () => {
        setCancelingSlotId(slot.slotId);
        try {
          if (FORCE_MOCK) {
            await new Promise(r => setTimeout(r, 600));
            setSlots(prev => prev.map(s => s.slotId === slot.slotId ? { ...s, registeredCount: s.registeredCount - 1 } : s));
          } else {
            await cancelInterviewSlot(slot.slotId, cycleId);
            await fetchSlots(slot.department);
          }
          setBookedSlotId(null);
          message.success(`已取消预约「${slot.department} - ${slot.timeLabel}」`);
        } catch (err: any) { message.error('取消预约失败: ' + (err?.message || String(err))); }
        finally { setCancelingSlotId(null); }
      },
    });
  }, [cycleId, fetchSlots]);

  // 未填志愿
  if (depts.length === 0) {
    return (
      <Card style={{ marginTop: 32, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <Title level={4}><CalendarOutlined style={{ marginRight: 8 }} />面试时间预约</Title>
        <Alert type="warning" showIcon message="请先在志愿选择中填写意向部门" />
      </Card>
    );
  }

  return (
    <Card style={{ marginTop: 32, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <Title level={4} style={{ marginBottom: 8 }}>
        <CalendarOutlined style={{ marginRight: 8 }} />
        面试时间预约
      </Title>

      {isSubmitted ? (
        <Alert type="success" showIcon message="简历已提交" description="选择面试时间段完成预约。" style={{ marginBottom: 16 }} />
      ) : (
        <Alert type="info" showIcon message="面试时间预览" description="以下为可选面试时间段，提交简历后方可预约。" style={{ marginBottom: 16 }} />
      )}

      {/* 取自简历志愿的部门切换 */}
      {depts.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {depts.map((d, i) => (
            <Button
              key={d}
              type={activeIdx === i ? 'primary' : 'default'}
              size="small"
              onClick={() => { setActiveIdx(i); setBookedSlotId(null); }}
            >
              {activeIdx === i ? `● ${d}` : d} {i === 0 ? '(第一志愿)' : '(第二志愿)'}
            </Button>
          ))}
        </div>
      )}
      {depts.length === 1 && (
        <Text strong style={{ display: 'block', marginBottom: 16 }}>意向部门：{depts[0]}</Text>
      )}

      <Spin spinning={loading}>
        {slots.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <Text type="secondary">{activeDept} 暂无可选面试时间段</Text>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {slots.map((slot) => {
            const percent = slot.quota > 0 ? Math.round((slot.registeredCount / slot.quota) * 100) : 0;
            const isFull = slot.registeredCount >= slot.quota;
            const isBooked = bookedSlotId === slot.slotId;
            const isOtherBooked = bookedSlotId !== null && bookedSlotId !== slot.slotId;
            return (
              <Card key={slot.slotId} size="small" style={{
                borderRadius: 6,
                ...(isFull && !isBooked ? { backgroundColor: '#fff7f7', borderColor: '#ffccc7' } : {}),
                ...(isBooked ? { backgroundColor: '#f6ffed', borderColor: '#b7eb8f' } : {}),
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 180 }}>
                    <CalendarOutlined style={{ fontSize: 18, color: '#1890ff', flexShrink: 0 }} />
                    <div>
                      <Text strong style={{ fontSize: 15, display: 'block' }}>{slot.timeLabel}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>{slot.startTime} - {slot.endTime}</Text>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, maxWidth: 320 }}>
                    <Text>
                      已预约/名额：<Text strong type={isFull ? 'danger' : undefined}>{slot.registeredCount}</Text>
                      /<Text>{slot.quota}</Text>
                    </Text>
                    <Progress percent={percent} status={isFull ? 'exception' : 'active'} showInfo={false} size="small" style={{ flex: 1, maxWidth: 100, marginBottom: 0 }} />
                  </div>
                  {isBooked ? (
                    <Button type="default" loading={cancelingSlotId === slot.slotId}
                      disabled={!isSubmitted} onClick={() => handleCancelSlot(slot)} size="small">
                      取消预约
                    </Button>
                  ) : (
                    <Button type="primary" icon={<CheckCircleOutlined />} loading={confirmingSlotId === slot.slotId}
                      disabled={!isSubmitted || isFull || isOtherBooked} onClick={() => handleConfirmSlot(slot)} size="small">
                      {!isSubmitted ? '请先提交简历' : isOtherBooked ? '不可预约' : isFull ? '已约满' : '可预约'}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </Spin>
    </Card>
  );
};

export default InterviewAppointmentPanel;
