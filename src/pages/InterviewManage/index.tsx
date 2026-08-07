import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tabs,
  Tag,
  TimePicker,
  message,
} from "antd";
import { PlusOutlined, ThunderboltOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import {
  AdminRescheduleRequest,
  ScheduleRosterItem,
  InterviewSession,
  InterviewTimeSlot,
  SessionAssignmentResult,
  UnassignedItem,
  assignSessions,
  createSession,
  createTimeSlot,
  deleteSession,
  deleteTimeSlot,
  handleReschedule,
  listAvailableSessions,
  listReschedules,
  listSchedulesRoster,
  listSessions,
  listTimeSlots,
  listUnassigned,
  manualAssign,
  updateSession,
  updateTimeSlot,
} from "@/api/manage/interviewAdmin";
import { getAllCycles, RecruitmentCycle } from "@/api/manage/cycleApis";
import { getValidDept } from "@/api/manage/deptManage";

const fmtTime = (t?: string) => (t ? t.slice(0, 5) : "-");

// ─── 时间段 Tab ──────────────────────────────────────────────────────────────
const TimeSlotTab: React.FC<{ cycleId: number }> = ({ cycleId }) => {
  const [list, setList] = useState<InterviewTimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<InterviewTimeSlot | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await listTimeSlots(cycleId);
      setList(res?.data ?? []);
    } catch (e: any) {
      message.error(e?.message || "加载时间段失败");
    } finally {
      setLoading(false);
    }
  }, [cycleId]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (r: InterviewTimeSlot) => {
    setEditing(r);
    form.setFieldsValue({
      slotName: r.slotName,
      interviewDate: dayjs(r.interviewDate),
      timeRange: [dayjs(r.startTime, "HH:mm:ss"), dayjs(r.endTime, "HH:mm:ss")],
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const v = await form.validateFields();
    const payload = {
      cycleId,
      slotName: v.slotName,
      interviewDate: v.interviewDate.format("YYYY-MM-DD"),
      startTime: v.timeRange[0].format("HH:mm:ss"),
      endTime: v.timeRange[1].format("HH:mm:ss"),
    };
    setSaving(true);
    try {
      if (editing) {
        await updateTimeSlot(editing.timeSlotId, payload);
        message.success("时间段已更新");
      } else {
        await createTimeSlot(payload);
        message.success("时间段已创建");
      }
      setModalOpen(false);
      load();
    } catch (e: any) {
      message.error(e?.message || "保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Space style={{ marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新建时间段
        </Button>
      </Space>
      <Table
        rowKey="timeSlotId"
        size="middle"
        loading={loading}
        dataSource={list}
        pagination={false}
        columns={[
          { title: "ID", dataIndex: "timeSlotId", width: 64 },
          { title: "名称", dataIndex: "slotName" },
          { title: "日期", dataIndex: "interviewDate", width: 120 },
          { title: "开始", dataIndex: "startTime", width: 90, render: fmtTime },
          { title: "结束", dataIndex: "endTime", width: 90, render: fmtTime },
          {
            title: "操作",
            width: 150,
            render: (_: unknown, r: InterviewTimeSlot) => (
              <Space>
                <Button type="link" size="small" onClick={() => openEdit(r)}>
                  编辑
                </Button>
                <Popconfirm
                  title="确认删除该时间段？"
                  onConfirm={async () => {
                    try {
                      await deleteTimeSlot(r.timeSlotId);
                      message.success("已删除");
                      load();
                    } catch (e: any) {
                      message.error(e?.message || "删除失败（可能已有场次挂靠）");
                    }
                  }}
                >
                  <Button type="link" size="small" danger>
                    删除
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ] as any}
      />
      <Modal
        title={editing ? `编辑时间段 #${editing.timeSlotId}` : "新建时间段"}
        open={modalOpen}
        onOk={handleSave}
        confirmLoading={saving}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="slotName" label="名称" rules={[{ required: true, message: "请输入名称" }]}>
            <Input placeholder="如：周六上午场" maxLength={30} />
          </Form.Item>
          <Form.Item name="interviewDate" label="面试日期" rules={[{ required: true, message: "请选择日期" }]}>
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="timeRange" label="起止时间" rules={[{ required: true, message: "请选择起止时间" }]}>
            <TimePicker.RangePicker format="HH:mm" style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

// ─── 场次 Tab ────────────────────────────────────────────────────────────────
const SessionTab: React.FC<{ cycleId: number; depts: any[] }> = ({ cycleId, depts }) => {
  const [list, setList] = useState<InterviewSession[]>([]);
  const [rosterSession, setRosterSession] = useState<InterviewSession | null>(null);
  const [roster, setRoster] = useState<ScheduleRosterItem[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);

  const openRoster = async (sess: InterviewSession) => {
    setRosterSession(sess);
    setRosterLoading(true);
    try {
      const res: any = await listSchedulesRoster(cycleId, sess.sessionId);
      setRoster(res?.data ?? []);
    } catch (e: any) {
      message.error(e?.message || "加载名单失败");
    } finally {
      setRosterLoading(false);
    }
  };
  const [slots, setSlots] = useState<InterviewTimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<InterviewSession | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, t]: any[] = await Promise.all([listSessions(cycleId), listTimeSlots(cycleId)]);
      setList(s?.data ?? []);
      setSlots(t?.data ?? []);
    } catch (e: any) {
      message.error(e?.message || "加载场次失败");
    } finally {
      setLoading(false);
    }
  }, [cycleId]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (r: InterviewSession) => {
    setEditing(r);
    form.setFieldsValue({
      timeSlotId: r.timeSlotId,
      deptId: r.deptId,
      location: r.location,
      capacity: r.capacity,
      interviewDurationMinutes: r.interviewDurationMinutes,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const v = await form.validateFields();
    const payload = { cycleId, ...v };
    setSaving(true);
    try {
      if (editing) {
        await updateSession(editing.sessionId, payload);
        message.success("场次已更新");
      } else {
        await createSession(payload);
        message.success("场次已创建");
      }
      setModalOpen(false);
      load();
    } catch (e: any) {
      message.error(e?.message || "保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Space style={{ marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新建场次
        </Button>
      </Space>
      <Table
        rowKey="sessionId"
        size="middle"
        loading={loading}
        dataSource={list}
        pagination={false}
        columns={[
          { title: "ID", dataIndex: "sessionId", width: 64 },
          { title: "时间段", dataIndex: "slotName", render: (v: string, r: InterviewSession) => `${v || r.timeSlotId}（${r.interviewDate || ""} ${fmtTime(r.startTime)}-${fmtTime(r.endTime)}）` },
          { title: "部门", dataIndex: "deptName", width: 110 },
          { title: "地点", dataIndex: "location", width: 140 },
          {
            title: "容量",
            width: 110,
            render: (_: unknown, r: InterviewSession) => (
              <span>
                {r.currentOccupied ?? 0}/{r.capacity}
                {(r.remaining ?? 1) <= 0 && <Tag color="red" style={{ marginLeft: 6 }}>满</Tag>}
              </span>
            ),
          },
          {
            title: "操作",
            width: 150,
            render: (_: unknown, r: InterviewSession) => (
              <Space>
                <Button type="link" size="small" onClick={() => openRoster(r)}>
                  名单
                </Button>
                <Button type="link" size="small" onClick={() => openEdit(r)}>
                  编辑
                </Button>
                <Popconfirm
                  title="确认删除该场次？"
                  onConfirm={async () => {
                    try {
                      await deleteSession(r.sessionId);
                      message.success("已删除");
                      load();
                    } catch (e: any) {
                      message.error(e?.message || "删除失败（场次可能已有人分配）");
                    }
                  }}
                >
                  <Button type="link" size="small" danger>
                    删除
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ] as any}
      />
      <Modal
        title={editing ? `编辑场次 #${editing.sessionId}` : "新建场次"}
        open={modalOpen}
        onOk={handleSave}
        confirmLoading={saving}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="timeSlotId" label="所属时间段" rules={[{ required: true, message: "请选择时间段" }]}>
            <Select
              options={slots.map((s) => ({
                value: s.timeSlotId,
                label: `${s.slotName}（${s.interviewDate} ${fmtTime(s.startTime)}-${fmtTime(s.endTime)}）`,
              }))}
            />
          </Form.Item>
          <Form.Item name="deptId" label="面试部门" rules={[{ required: true, message: "请选择部门" }]}>
            <Select
              options={depts.map((d: any) => ({ value: d.deptId, label: d.deptName }))}
            />
          </Form.Item>
          <Form.Item name="location" label="地点" rules={[{ required: true, message: "请输入地点" }]}>
            <Input placeholder="如：理科大楼 B226" maxLength={50} />
          </Form.Item>
          <Form.Item name="capacity" label="容量（人数）" rules={[{ required: true, message: "请输入容量" }]}>
            <InputNumber min={1} max={200} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="interviewDurationMinutes" label="单人面试时长（分钟）" initialValue={15}>
            <InputNumber min={5} max={120} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={rosterSession ? `场次 #${rosterSession.sessionId} 分配名单（${rosterSession.deptName || ''} @${rosterSession.location}）` : ''}
        open={!!rosterSession}
        footer={null}
        width={640}
        onCancel={() => setRosterSession(null)}
      >
        <Table
          rowKey="scheduleId"
          size="small"
          loading={rosterLoading}
          dataSource={roster}
          pagination={false}
          locale={{ emptyText: "该场次还没有分配任何候选人" }}
          columns={[
            { title: "面试时间", dataIndex: "interviewTime", width: 130,
              render: (v: string) => (v ? String(v).replace("T", " ").slice(5, 16) : "-") },
            { title: "姓名", dataIndex: "name", width: 100, render: (v: string, r: ScheduleRosterItem) => v || r.username || `用户#${r.userId}` },
            { title: "学号", dataIndex: "username", width: 120 },
            { title: "简历", dataIndex: "resumeId", width: 70, render: (v: number) => `#${v}` },
            { title: "备注", dataIndex: "notes", ellipsis: true },
          ] as any}
        />
      </Modal>
    </>
  );
};

// ─── 分配与调剂 Tab ──────────────────────────────────────────────────────────
const AssignmentTab: React.FC<{ cycleId: number }> = ({ cycleId }) => {
  const [unassigned, setUnassigned] = useState<UnassignedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [lastResult, setLastResult] = useState<SessionAssignmentResult | null>(null);
  const [manualTarget, setManualTarget] = useState<UnassignedItem | null>(null);
  const [availableSessions, setAvailableSessions] = useState<InterviewSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<number | undefined>();
  const [manualSaving, setManualSaving] = useState(false);

  const loadUnassigned = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await listUnassigned(cycleId);
      setUnassigned(res?.data ?? []);
    } catch (e: any) {
      message.error(e?.message || "加载待调剂名单失败");
    } finally {
      setLoading(false);
    }
  }, [cycleId]);

  useEffect(() => {
    loadUnassigned();
  }, [loadUnassigned]);

  const handleAssign = async () => {
    setAssigning(true);
    try {
      const res: any = await assignSessions(cycleId);
      const data: SessionAssignmentResult = res?.data;
      setLastResult(data);
      message.success(`分配完成：成功 ${data?.assignedCount ?? 0} 人，待调剂 ${data?.unassignedCount ?? 0} 人`);
      loadUnassigned();
    } catch (e: any) {
      message.error(e?.message || "一键分配失败");
    } finally {
      setAssigning(false);
    }
  };

  const openManual = async (item: UnassignedItem) => {
    setManualTarget(item);
    setSelectedSession(undefined);
    try {
      const res: any = await listAvailableSessions(cycleId);
      setAvailableSessions(res?.data ?? []);
    } catch (e: any) {
      message.error(e?.message || "加载可用场次失败");
    }
  };

  const handleManualAssign = async () => {
    if (!manualTarget || !selectedSession) return;
    setManualSaving(true);
    try {
      await manualAssign(manualTarget.resumeId, selectedSession);
      message.success(`已将 ${manualTarget.name} 分配到场次 #${selectedSession}`);
      setManualTarget(null);
      loadUnassigned();
    } catch (e: any) {
      message.error(e?.message || "调剂失败");
    } finally {
      setManualSaving(false);
    }
  };

  return (
    <>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        message="一键分配为幂等操作：只处理已填志愿但尚未分配的候选人，可放心重复执行。分不进任何场次的候选人会进入下方待调剂名单。"
      />
      <Space style={{ marginBottom: 16 }} size="large">
        <Button type="primary" icon={<ThunderboltOutlined />} loading={assigning} onClick={handleAssign}>
          一键分配本周期
        </Button>
        {lastResult && (
          <Space size="large">
            <Statistic title="本次成功" value={lastResult.assignedCount} valueStyle={{ fontSize: 20 }} />
            <Statistic title="待调剂" value={lastResult.unassignedCount} valueStyle={{ fontSize: 20 }} />
          </Space>
        )}
      </Space>
      <Table
        rowKey="resumeId"
        size="middle"
        loading={loading}
        dataSource={unassigned}
        pagination={false}
        locale={{ emptyText: "没有待调剂的候选人 🎉" }}
        columns={[
          { title: "简历ID", dataIndex: "resumeId", width: 90 },
          { title: "姓名", dataIndex: "name", width: 120 },
          { title: "原因", dataIndex: "reason", render: (v: string) => v || "志愿场次均无余量" },
          {
            title: "操作",
            width: 120,
            render: (_: unknown, r: UnassignedItem) => (
              <Button type="link" size="small" onClick={() => openManual(r)}>
                人工调剂
              </Button>
            ),
          },
        ] as any}
      />
      <Modal
        title={manualTarget ? `人工调剂：${manualTarget.name}（简历 #${manualTarget.resumeId}）` : ""}
        open={!!manualTarget}
        onOk={handleManualAssign}
        okButtonProps={{ disabled: !selectedSession }}
        confirmLoading={manualSaving}
        onCancel={() => setManualTarget(null)}
        destroyOnClose
      >
        <Select
          style={{ width: "100%" }}
          placeholder="选择有余量的目标场次"
          value={selectedSession}
          onChange={setSelectedSession}
          options={availableSessions.map((s) => ({
            value: s.sessionId,
            label: `#${s.sessionId} ${s.deptName || ""} ${s.interviewDate || ""} ${fmtTime(s.startTime)}-${fmtTime(s.endTime)} @${s.location}（余 ${s.remaining}）`,
          }))}
        />
      </Modal>
    </>
  );
};

// ─── 改期申请 Tab ────────────────────────────────────────────────────────────
const STATUS_TAG: Record<number, { color: string; text: string }> = {
  0: { color: "orange", text: "待处理" },
  1: { color: "green", text: "已同意" },
  2: { color: "red", text: "已拒绝" },
};

const RescheduleTab: React.FC<{ cycleId: number }> = ({ cycleId }) => {
  const [list, setList] = useState<AdminRescheduleRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [handling, setHandling] = useState<AdminRescheduleRequest | null>(null);
  const [handleStatus, setHandleStatus] = useState<1 | 2>(1);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await listReschedules(cycleId);
      setList(res?.data ?? []);
    } catch (e: any) {
      message.error(e?.message || "加载改期申请失败");
    } finally {
      setLoading(false);
    }
  }, [cycleId]);

  useEffect(() => { load(); }, [load]);

  const openHandle = (r: AdminRescheduleRequest, s: 1 | 2) => {
    setHandling(r);
    setHandleStatus(s);
    setNote("");
  };

  const doHandle = async () => {
    if (!handling) return;
    setSaving(true);
    try {
      await handleReschedule(handling.requestId, handleStatus, note.trim() || undefined);
      message.success(handleStatus === 1
        ? "已同意——请到「分配与调剂」用人工调剂为该候选人重排场次"
        : "已拒绝");
      setHandling(null);
      load();
    } catch (e: any) {
      message.error(e?.message || "处理失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        message="同意改期后，请在「分配与调剂」Tab 用人工调剂把该候选人改到新场次（按其期望时间窗）。"
      />
      <Table
        rowKey="requestId"
        size="middle"
        loading={loading}
        dataSource={list}
        pagination={false}
        locale={{ emptyText: "暂无改期申请" }}
        columns={[
          { title: "ID", dataIndex: "requestId", width: 60 },
          { title: "简历ID", dataIndex: "resumeId", width: 80 },
          { title: "原因", dataIndex: "reason", ellipsis: true },
          {
            title: "期望时间窗",
            dataIndex: "preferredTimeSlotIds",
            width: 120,
            render: (v: string) => v || <span style={{ color: "#bbb" }}>未指定</span>,
          },
          { title: "提交时间", dataIndex: "createdAt", width: 150, render: (v: string) => (v ? String(v).replace("T", " ").slice(0, 16) : "-") },
          {
            title: "状态",
            dataIndex: "status",
            width: 90,
            render: (s: number, r: AdminRescheduleRequest) => (
              <Tag color={STATUS_TAG[s]?.color}>{STATUS_TAG[s]?.text ?? s}{r.adminNote ? `（${r.adminNote}）` : ""}</Tag>
            ),
          },
          {
            title: "操作",
            width: 140,
            render: (_: unknown, r: AdminRescheduleRequest) => r.status === 0 ? (
              <Space>
                <Button type="link" size="small" onClick={() => openHandle(r, 1)}>同意</Button>
                <Button type="link" size="small" danger onClick={() => openHandle(r, 2)}>拒绝</Button>
              </Space>
            ) : null,
          },
        ] as any}
      />
      <Modal
        title={handling ? `${handleStatus === 1 ? "同意" : "拒绝"}改期申请 #${handling.requestId}` : ""}
        open={!!handling}
        onOk={doHandle}
        confirmLoading={saving}
        onCancel={() => setHandling(null)}
        destroyOnClose
      >
        <div style={{ marginBottom: 8 }}>原因：{handling?.reason}</div>
        <Input.TextArea
          rows={2}
          maxLength={500}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={handleStatus === 1 ? "备注（可选），如：已改至周日上午场" : "拒绝原因（可选），会展示给学生"}
        />
      </Modal>
    </>
  );
};

// ─── 页面主体 ────────────────────────────────────────────────────────────────
const InterviewManage: React.FC = () => {
  const [cycles, setCycles] = useState<RecruitmentCycle[]>([]);
  const [cycleId, setCycleId] = useState<number | undefined>();
  const [depts, setDepts] = useState<any[]>([]);
  // 初始化完成前渲染 loading，避免先闪现「请先创建周期」提示再切换到正文
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [c, d]: any[] = await Promise.all([getAllCycles(), getValidDept()]);
        const list: RecruitmentCycle[] = c?.data ?? [];
        setCycles(list);
        setDepts(d?.data ?? []);
        // 默认选中活跃周期，否则选最新
        const active = list.find((x) => x.isActive === 1);
        setCycleId(active?.cycleId ?? list[list.length - 1]?.cycleId);
      } catch (e: any) {
        message.error(e?.message || "初始化失败");
      } finally {
        setInitializing(false);
      }
    })();
  }, []);

  const cycleOptions = useMemo(
    () => cycles.map((c) => ({ value: c.cycleId, label: `${c.cycleName}（#${c.cycleId}）` })),
    [cycles]
  );

  return (
    <Card
      title="面试管理"
      extra={
        <Space>
          <span>招募周期：</span>
          <Select
            style={{ minWidth: 220 }}
            value={cycleId}
            onChange={setCycleId}
            options={cycleOptions}
            placeholder="选择周期"
          />
        </Space>
      }
    >
      {initializing ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
          <Spin size="large" />
        </div>
      ) : cycleId ? (
        <Tabs
          items={[
            { key: "slots", label: "时间段", children: <TimeSlotTab cycleId={cycleId} /> },
            { key: "sessions", label: "场次", children: <SessionTab cycleId={cycleId} depts={depts} /> },
            { key: "assign", label: "分配与调剂", children: <AssignmentTab cycleId={cycleId} /> },
            { key: "reschedule", label: "改期申请", children: <RescheduleTab cycleId={cycleId} /> },
          ]}
        />
      ) : (
        <Alert type="warning" message="请先在「招募周期」页创建周期" showIcon />
      )}
    </Card>
  );
};

export default InterviewManage;
