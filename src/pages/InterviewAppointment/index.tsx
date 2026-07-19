import React, { useEffect, useState, useCallback } from 'react';
import { Alert, Button, Card, Spin, Typography, Space, message, Progress, Modal, Steps } from 'antd';
import {
  CalendarOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  SoundOutlined,
  CodeOutlined,
  ProjectOutlined,
  LeftOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  getInterviewTimeSlots,
  confirmInterviewSlot,
  cancelInterviewSlot,
  DEPARTMENTS,
  type InterviewTimeSlot,
  type Department,
} from '@/api/interview';
import { MOCK_INTERVIEW_SLOTS } from '@/api/interviewMock';
import './index.scss';

const { Title, Text } = Typography;

/** 后端未就绪时使用演示数据（设为 true 可强制使用 mock） */
const FORCE_MOCK = true;

/** 部门对应的图标和颜色 */
const DEPARTMENT_META: Record<Department, { icon: React.ReactNode; color: string; description: string }> = {
  综合部: {
    icon: <TeamOutlined />,
    color: '#1677ff',
    description: '负责行政、财务、人事等综合管理事务',
  },
  媒体部: {
    icon: <SoundOutlined />,
    color: '#fa8c16',
    description: '负责宣传、设计、新媒体运营与内容创作',
  },
  技术部: {
    icon: <CodeOutlined />,
    color: '#52c41a',
    description: '负责软件开发、技术架构与系统维护',
  },
  项目部: {
    icon: <ProjectOutlined />,
    color: '#722ed1',
    description: '负责项目策划、推进与落地执行',
  },
};

type RootStateLike = {
  resume: {
    cycleId: number;
    resume: { resume_id?: string | number; id?: string | number } | null;
  };
};

const InterviewAppointment: React.FC = () => {
  const navigate = useNavigate();
  const { cycleId } = useSelector((state: RootStateLike) => state.resume);

  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [slots, setSlots] = useState<InterviewTimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmingSlotId, setConfirmingSlotId] = useState<number | null>(null);
  const [cancelingSlotId, setCancelingSlotId] = useState<number | null>(null);
  const [bookedSlotId, setBookedSlotId] = useState<number | null>(null);
  const [usingMock, setUsingMock] = useState(false);

  const currentCycleId = cycleId || 2;

  const fetchSlots = useCallback(async (department: Department) => {
    try {
      setLoading(true);
      if (FORCE_MOCK) {
        // 前端演示模式：按部门筛选
        const deptSlots = MOCK_INTERVIEW_SLOTS[department] ?? [];
        setSlots(deptSlots);
        setUsingMock(true);
        return;
      }
      const data = await getInterviewTimeSlots(currentCycleId, department);
      setSlots(data);
      setUsingMock(false);
    } catch (err: any) {
      console.warn('后端不可用，使用前端演示数据:', err?.message || String(err));
      const deptSlots = MOCK_INTERVIEW_SLOTS[department] ?? [];
      setSlots(deptSlots);
      setUsingMock(true);
    } finally {
      setLoading(false);
    }
  }, [currentCycleId]);

  const handleSelectDepartment = (dept: Department) => {
    setSelectedDept(dept);
    fetchSlots(dept);
  };

  const handleBackToDepartments = () => {
    setSelectedDept(null);
    setSlots([]);
    setBookedSlotId(null);
  };

  const handleConfirmSlot = (slot: InterviewTimeSlot) => {
    const isFull = slot.registeredCount >= slot.quota;
    if (isFull) {
      message.warning('该时间段已约满，请选择其他时间段');
      return;
    }

    const doConfirm = async () => {
      setConfirmingSlotId(slot.slotId);
      try {
        if (usingMock) {
          // 演示模式：本地更新计数
          await new Promise((r) => setTimeout(r, 600));
          setSlots((prev) =>
            prev.map((s) =>
              s.slotId === slot.slotId
                ? { ...s, registeredCount: s.registeredCount + 1 }
                : s,
            ),
          );
        } else {
          await confirmInterviewSlot(slot.slotId, currentCycleId, slot.department);
          await fetchSlots(slot.department);
        }
        setBookedSlotId(slot.slotId);
        message.success(`已成功预约「${slot.department} - ${slot.timeLabel}」`);
      } catch (err: any) {
        const msg = err?.message || String(err);
        message.error('预约失败: ' + msg);
      } finally {
        setConfirmingSlotId(null);
      }
    };

    Modal.confirm({
      title: '确认面试时间',
      icon: <CalendarOutlined />,
      content: `确定预约「${slot.department} - ${slot.timeLabel}」(${slot.startTime} - ${slot.endTime}) 作为你的面试时间吗？`,
      okText: '确认预约',
      cancelText: '取消',
      onOk: doConfirm,
    });
  };

  const handleCancelSlot = (slot: InterviewTimeSlot) => {
    const doCancel = async () => {
      setCancelingSlotId(slot.slotId);
      try {
        if (usingMock) {
          await new Promise((r) => setTimeout(r, 600));
          setSlots((prev) =>
            prev.map((s) =>
              s.slotId === slot.slotId
                ? { ...s, registeredCount: s.registeredCount - 1 }
                : s,
            ),
          );
        } else {
          await cancelInterviewSlot(slot.slotId, currentCycleId);
          await fetchSlots(slot.department);
        }
        setBookedSlotId(null);
        message.success(`已取消预约「${slot.department} - ${slot.timeLabel}」`);
      } catch (err: any) {
        const msg = err?.message || String(err);
        message.error('取消预约失败: ' + msg);
      } finally {
        setCancelingSlotId(null);
      }
    };

    Modal.confirm({
      title: '取消预约',
      icon: <CalendarOutlined />,
      content: `确定取消「${slot.department} - ${slot.timeLabel}」(${slot.startTime} - ${slot.endTime}) 的面试预约吗？取消后需重新选择时间段。`,
      okText: '确认取消',
      cancelText: '返回',
      okButtonProps: { danger: true },
      onOk: doCancel,
    });
  };

  return (
    <div className="interview-appointment-page">
      <div className="appointment-header">
        <Title level={2}>面试时间预约</Title>
        <Text type="secondary">提交申请成功后，请先选择意向部门，再选择面试时间段完成预约。</Text>
      </div>

      <Card className="appointment-card">
        {/* 步骤指示器 */}
        <Steps
          current={selectedDept ? 1 : 0}
          size="small"
          className="appointment-steps"
          items={[
            { title: '选择意向部门', icon: <TeamOutlined /> },
            { title: '选择面试时间', icon: <CalendarOutlined /> },
          ]}
        />

        <Alert
          type="success"
          showIcon
          message="申请已提交"
          description="你的简历已经提交成功，请按步骤完成面试预约。"
          style={{ marginBottom: 20 }}
        />

        {/* 第一步：选择部门 */}
        {!selectedDept && (
          <div className="department-select">
            <Text strong className="department-select__title">
              请选择你的意向部门
            </Text>
            <div className="department-grid">
              {DEPARTMENTS.map((dept) => {
                const meta = DEPARTMENT_META[dept];
                return (
                  <Card
                    key={dept}
                    className="department-card"
                    hoverable
                    onClick={() => handleSelectDepartment(dept)}
                  >
                    <div className="department-card__icon" style={{ color: meta.color }}>
                      {meta.icon}
                    </div>
                    <Text strong className="department-card__name">
                      {dept}
                    </Text>
                    <Text type="secondary" className="department-card__desc">
                      {meta.description}
                    </Text>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* 第二步：选择时间段 */}
        {selectedDept && (
          <>
            <div className="selected-dept-bar">
              <Button
                type="text"
                icon={<LeftOutlined />}
                onClick={handleBackToDepartments}
              >
                重新选择部门
              </Button>
              <Text strong style={{ fontSize: 15 }}>
                当前选择：
                <span style={{ color: DEPARTMENT_META[selectedDept].color }}>
                  {DEPARTMENT_META[selectedDept].icon}{' '}
                  {selectedDept}
                </span>
              </Text>
            </div>

            <Spin spinning={loading}>
              <div className="slot-list">
                {slots.length === 0 && !loading && (
                  <div className="slot-empty">
                    <Text type="secondary">{selectedDept} 暂无可选面试时间段</Text>
                  </div>
                )}

                {slots.map((slot) => {
                  const percent =
                    slot.quota > 0
                      ? Math.round((slot.registeredCount / slot.quota) * 100)
                      : 0;
                  const isFull = slot.registeredCount >= slot.quota;
                  const isBooked = bookedSlotId === slot.slotId;
                  const isOtherBooked = bookedSlotId !== null && bookedSlotId !== slot.slotId;

                  return (
                    <Card
                      key={slot.slotId}
                      className={`slot-card${isFull && !isBooked ? ' slot-card--full' : ''}${isBooked ? ' slot-card--booked' : ''}`}
                      size="small"
                    >
                      <div className="slot-row">
                        <div className="slot-time">
                          <CalendarOutlined className="slot-icon" />
                          <div>
                            <Text strong className="slot-label">
                              {slot.timeLabel}
                            </Text>
                            <Text type="secondary" className="slot-range">
                              {slot.startTime} - {slot.endTime}
                            </Text>
                          </div>
                        </div>
                        <div className="slot-quota">
                          <Text>
                            已预约人数 / 名额：
                            <Text strong type={isFull ? 'danger' : undefined}>
                              {slot.registeredCount}
                            </Text>
                            {' / '}
                            <Text>{slot.quota}</Text>
                          </Text>
                          <Progress
                            percent={percent}
                            status={isFull ? 'exception' : 'active'}
                            showInfo={false}
                            size="small"
                            className="slot-progress"
                          />
                        </div>
                        {isBooked ? (
                          <Button
                            type="default"
                            loading={cancelingSlotId === slot.slotId}
                            onClick={() => handleCancelSlot(slot)}
                            size="small"
                          >
                            取消预约
                          </Button>
                        ) : (
                          <Button
                            type="primary"
                            icon={<CheckCircleOutlined />}
                            loading={confirmingSlotId === slot.slotId}
                            disabled={isFull || isOtherBooked}
                            onClick={() => handleConfirmSlot(slot)}
                            size="small"
                          >
                            {isOtherBooked ? '不可预约' : isFull ? '已约满' : '可预约'}
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </Spin>
          </>
        )}

        <div className="appointment-actions">
          <Space>
            {selectedDept && (
              <Button onClick={handleBackToDepartments}>
                返回选择部门
              </Button>
            )}
            <Button icon={<FileTextOutlined />} onClick={() => navigate('/main/publish')}>
              返回简历页
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default InterviewAppointment;
