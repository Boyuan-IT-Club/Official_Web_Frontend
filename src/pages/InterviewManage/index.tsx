import React, { useCallback, useEffect, useMemo, useState } from "react";
import PageHint from '@/components/PageHint';
import {
  Alert,
  Button,
  Dropdown,
  Progress,
  Switch,
  Tooltip,
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
  Collapse,
  Statistic,
  Table,
  Tabs,
  Tag,
  TimePicker,
  message,
  Typography,
} from "antd";
import { DeleteOutlined, EditOutlined, MoreOutlined, PlusOutlined, ThunderboltOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import {
  AdminRescheduleRequest,
  FeishuTaskStatus,
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
  InterviewResultItem,
  listResults,
  seedResultsFromSchedules,
  listSchedulesRoster,
  listOfflineUnavailable,
  OfflineUnavailableItem,
  listSessions,
  sendResultNotifications,
  batchDecision,
  listFeishuLocations,
  type LocationTableConfig,
  saveFeishuLocation,
  pullAllLocations,
  updateResult,
  pushToFeishu,
  pullFromFeishu,
  getFeishuTask,
  listTimeSlots,
  listUnassigned,
  manualAssign,
  updateSession,
  updateTimeSlot,
} from "@/api/manage/interviewAdmin";
import { getCandidateResume } from "@/api/manage/interviewEvaluation";
import { getAllCycles, RecruitmentCycle } from "@/api/manage/cycleApis";
import { getValidDept } from "@/api/manage/deptManage";
import { request } from "@/utils";
import ResumeDetail from "@/pages/Resume/ResumeDetail";
import "@/pages/Resume/index.scss";
import EvaluationSummaryTab from "./EvaluationSummaryTab";
import SessionInterviewersModal from "./SessionInterviewersModal";

const fmtTime = (t?: string) => (t ? t.slice(0, 5) : "-");

// ─── 时间段 Tab ──────────────────────────────────────────────────────────────
const TimeSlotTab: React.FC<{ cycleId: number; refreshToken?: number }> = ({ cycleId, refreshToken }) => {
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
  // refreshToken：切回本面板时重新拉一次 —— antd Tabs 会保留
    // 已挂载的面板，不加这个依赖切回来看到的是切走时的旧数据
  }, [load, refreshToken]);

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
                <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>
                  编辑
                </Button>
                <Dropdown
                  trigger={["click"]}
                  menu={{
                    items: [{ key: "del", icon: <DeleteOutlined />, label: "删除时间段", danger: true }],
                    onClick: () => {
                      Modal.confirm({
                        title: "确认删除该时间段？",
                        content: `${r.slotName}（${r.interviewDate}）`,
                        okText: "删除", okType: "danger", cancelText: "取消",
                        async onOk() {
                          try {
                            await deleteTimeSlot(r.timeSlotId);
                            message.success("已删除");
                            load();
                          } catch (e: any) {
                            message.error(e?.message || "删除失败（可能已有场次挂靠）");
                          }
                        },
                      });
                    },
                  }}
                >
                  <Button type="text" size="small" icon={<MoreOutlined />} />
                </Dropdown>
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
const SessionTab: React.FC<{ cycleId: number; depts: any[]; refreshToken?: number }> = ({ cycleId, depts, refreshToken }) => {
  const [list, setList] = useState<InterviewSession[]>([]);
  const [rosterSession, setRosterSession] = useState<InterviewSession | null>(null);
  const [roster, setRoster] = useState<ScheduleRosterItem[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [interviewerSession, setInterviewerSession] = useState<InterviewSession | null>(null);
  const [resumeDetail, setResumeDetail] = useState<any>(null);
  const [resumeDetailLoading, setResumeDetailLoading] = useState(false);
  const [resumeDetailOpen, setResumeDetailOpen] = useState(false);

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

  const openResumeDetail = async (r: ScheduleRosterItem) => {
    setResumeDetail(null);
    setResumeDetailOpen(true);
    setResumeDetailLoading(true);
    try {
      const res: any = await getCandidateResume(cycleId, r.scheduleId);
      setResumeDetail(res?.data ?? null);
    } catch (e: any) {
      message.error(e?.message || "加载简历失败");
      setResumeDetailOpen(false);
    } finally {
      setResumeDetailLoading(false);
    }
  };

  const downloadResume = async (resumeId: number) => {
    try {
      const response: any = await request.get(`/api/resumes/export/pdf/${resumeId}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      const cd = response.headers?.["content-disposition"];
      const m = String(cd || "").match(/filename="?([^"]+)"?/);
      link.setAttribute("download", m?.[1] || `resume_${resumeId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      message.error(e?.message || "下载失败");
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
  // refreshToken：切回本面板时重新拉一次 —— antd Tabs 会保留
    // 已挂载的面板，不加这个依赖切回来看到的是切走时的旧数据
  }, [load, refreshToken]);

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
                <Button type="link" size="small" onClick={() => setInterviewerSession(r)}>
                  面试官
                </Button>
                <Button type="link" size="small" onClick={() => openEdit(r)}>
                  编辑
                </Button>
                <Dropdown
                  trigger={["click"]}
                  menu={{
                    items: [{ key: "del", icon: <DeleteOutlined />, label: "删除场次", danger: true }],
                    onClick: () => {
                      Modal.confirm({
                        title: "确认删除该场次？",
                        content: `#${r.sessionId} ${r.deptName || ""} @${r.location}`,
                        okText: "删除", okType: "danger", cancelText: "取消",
                        async onOk() {
                          try {
                            await deleteSession(r.sessionId);
                            message.success("已删除");
                            load();
                          } catch (e: any) {
                            message.error(e?.message || "删除失败（场次可能已有人分配）");
                          }
                        },
                      });
                    },
                  }}
                >
                  <Button type="text" size="small" icon={<MoreOutlined />} />
                </Dropdown>
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
        width={720}
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
            { title: "简历", dataIndex: "resumeId", width: 70,
              render: (v: number, r: ScheduleRosterItem) => (
                <Button type="link" size="small" onClick={() => openResumeDetail(r)}>#{v}</Button>
              ) },
            { title: "飞书", dataIndex: "syncStatus", width: 70,
              render: (v: number) => (v === 1 ? <Tag color="green">已同步</Tag> : <Tag>未同步</Tag>) },
            { title: "备注", dataIndex: "notes",
              ellipsis: { showTitle: false },
              render: (v: string) => (
                <Tooltip title={v} placement="topLeft">
                  <span>{v || "-"}</span>
                </Tooltip>
              ) },
          ] as any}
        />
      </Modal>
      {resumeDetailOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2000,
            background: "#f5f5f5",
            overflow: "auto",
          }}
        >
          {resumeDetailLoading ? (
            <div style={{ textAlign: "center", padding: 48 }}><Spin /></div>
          ) : (
            <ResumeDetail
              resume={resumeDetail}
              backText="返回名单"
              onBack={() => setResumeDetailOpen(false)}
              onDownload={downloadResume}
            />
          )}
        </div>
      )}
      <SessionInterviewersModal
        open={!!interviewerSession}
        sessionId={interviewerSession?.sessionId}
        sessionLabel={interviewerSession
          ? `#${interviewerSession.sessionId} ${interviewerSession.deptName || ''} @${interviewerSession.location}`
          : undefined}
        onClose={() => setInterviewerSession(null)}
      />
    </>
  );
};

// ─── 分配与调剂 Tab ──────────────────────────────────────────────────────────
const AssignmentTab: React.FC<{ cycleId: number; cycle?: RecruitmentCycle; refreshToken?: number }> = ({ cycleId, cycle, refreshToken }) => {
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
    // refreshToken：切回本面板时重新拉一次 —— antd Tabs 会保留已挂载的面板，
    // 不加这个依赖，切回来看到的还是切走时的旧名单
  }, [loadUnassigned, refreshToken]);

  const doAssign = async () => {
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

  const handleAssign = () => {
    // 简历提交尚未截止时提醒：现在分配可能漏掉后续提交的同学
    const today = new Date().toISOString().slice(0, 10);
    const notEnded = cycle && (!cycle.endDate || cycle.endDate >= today);
    if (notEnded) {
      Modal.confirm({
        title: "简历提交尚未截止",
        content: `本周期${cycle?.endDate ? `将于 ${cycle.endDate} 截止` : "仍在进行中"}。现在分配只会处理已提交志愿的同学，之后新提交的需要再次点击分配或人工调剂。确定现在分配吗？`,
        okText: "确定分配", cancelText: "再等等",
        onOk: doAssign,
      });
    } else {
      doAssign();
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
      <PageHint style={{ marginBottom: 12 }}>只处理未分配的候选人，可重复执行；分不进去的进入待调剂名单。</PageHint>
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

const RescheduleTab: React.FC<{ cycleId: number; refreshToken?: number }> = ({ cycleId, refreshToken }) => {
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

  useEffect(() => { load(); // refreshToken：切回本面板时重新拉一次 —— antd Tabs 会保留
    // 已挂载的面板，不加这个依赖切回来看到的是切走时的旧数据
  }, [load, refreshToken]);

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
      <PageHint style={{ marginBottom: 12 }}>同意后需到「分配与调剂」手动改到新场次。</PageHint>
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



// ─── 结果与通知 Tab ──────────────────────────────────────────────────────────
const DECISION_TAG: Record<number, { color: string; text: string }> = {
  1: { color: "green", text: "通过" },
  2: { color: "red", text: "未通过" },
};

const ResultTab: React.FC<{ cycleId: number; depts: any[]; refreshToken?: number }> = ({ cycleId, depts, refreshToken }) => {
  const [list, setList] = useState<InterviewResultItem[]>([]);
  const [nameMap, setNameMap] = useState<Record<number, { name?: string; username?: string }>>({});
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [editing, setEditing] = useState<InterviewResultItem | null>(null);
  const [editDecision, setEditDecision] = useState<number | undefined>();
  const [editDept, setEditDept] = useState<number | undefined>();
  const [saving, setSaving] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [customMsg, setCustomMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchDept, setBatchDept] = useState<number | undefined>();
  const [batching, setBatching] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [res, roster]: any[] = await Promise.all([
        listResults({ cycleId, page: 1, size: 200 }),
        listSchedulesRoster(cycleId).catch(() => null),
      ]);
      setList(res?.data?.interviewResults ?? []);
      const map: Record<number, { name?: string; username?: string }> = {};
      (roster?.data ?? []).forEach((r: any) => {
        if (r.userId != null) map[r.userId] = { name: r.name, username: r.username };
      });
      setNameMap(map);
    } catch (e: any) {
      message.error(e?.message || "加载结果失败");
    } finally {
      setLoading(false);
    }
  }, [cycleId]);

  useEffect(() => { load(); // refreshToken：切回本面板时重新拉一次 —— antd Tabs 会保留
    // 已挂载的面板，不加这个依赖切回来看到的是切走时的旧数据
  }, [load, refreshToken]);

  const deptName = (id?: number) => depts.find((d: any) => d.deptId === id)?.deptName || (id ? `#${id}` : "-");

  const openEditResult = (r: InterviewResultItem) => {
    setEditing(r);
    setEditDecision(r.decision ?? undefined);
    setEditDept(r.assignedDeptId ?? undefined);
  };

  const saveResult = async () => {
    if (!editing) return;
    if (editDecision === 1 && !editDept) { message.warning("录取时请选择录取部门"); return; }
    setSaving(true);
    try {
      await updateResult(editing.resultId, { decision: editDecision, assignedDeptId: editDecision === 1 ? editDept : undefined });
      message.success("结果已更新");
      setEditing(null);
      load();
    } catch (e: any) {
      message.error(e?.message || "更新失败");
    } finally {
      setSaving(false);
    }
  };

  /** 批量写入决定。decision=1 需带部门；=2 由服务端清空部门。 */
  const runBatch = async (decision: 1 | 2, deptId?: number) => {
    setBatching(true);
    try {
      const res: any = await batchDecision({ cycleId, resultIds: selected, decision, assignedDeptId: deptId });
      const d = res?.data;
      const skipped = d?.skipped?.length ?? 0;
      if (skipped > 0) {
        message.warning(`已更新 ${d?.updated ?? 0} 人，跳过 ${skipped} 条（不属于本周期）`);
      } else {
        message.success(
          decision === 1
            ? `已录取 ${d?.updated ?? selected.length} 人到${deptName(deptId)}`
            : `已标记 ${d?.updated ?? selected.length} 人未通过`,
        );
      }
      setBatchOpen(false);
      setSelected([]);
      load();
    } catch (e: any) {
      message.error(e?.message || "批量操作失败");
    } finally {
      setBatching(false);
    }
  };

  const confirmBatchReject = () => {
    Modal.confirm({
      title: `标记 ${selected.length} 人未通过？`,
      content: "会清空这些人已填的录取部门。此操作可以再次修改，但会覆盖原有结果。",
      okText: "确认标记",
      okButtonProps: { danger: true },
      onOk: () => runBatch(2),
    });
  };

  const doSend = async () => {
    setSending(true);
    try {
      const res: any = await sendResultNotifications({
        resultIds: selected,
        notificationType: "email",
        customMessage: customMsg.trim() || undefined,
      });
      const d = res?.data;
      if ((d?.failedCount ?? 0) > 0) {
        message.warning(`发送完成：成功 ${d?.sentCount ?? 0}，失败 ${d?.failedCount}（失败ID：${(d?.failedId ?? []).join(",")}）`);
      } else {
        message.success(`已发送 ${d?.sentCount ?? selected.length} 封结果通知邮件`);
      }
      setNotifyOpen(false);
      setSelected([]);
      load();   // 刷新「通知状态」列
    } catch (e: any) {
      message.error(e?.message || "发送失败");
    } finally {
      setSending(false);
    }
  };

  const undecided = list.filter((r) => r.decision == null).length;
  const selectedUndecided = list.filter(
    (r) => selected.includes(r.resultId) && r.decision == null,
  ).length;

  return (
    <>
      <PageHint style={{ marginBottom: 12 }}>先「生成名单」，再勾选批量录取或标记未通过，最后发通知。</PageHint>
      <Space style={{ marginBottom: 12 }} wrap>
        <Button
          type="primary"
          disabled={selected.length === 0}
          onClick={() => { setBatchDept(undefined); setBatchOpen(true); }}
        >
          批量录取（已选 {selected.length}）
        </Button>
        <Button danger disabled={selected.length === 0} onClick={confirmBatchReject}>
          批量标记未通过
        </Button>
        {/* 名单来源：结果行此前只有飞书拉取会创建，站内闭环靠这个按钮起步 */}
        <Button
          onClick={async () => {
            try {
              const res: any = await seedResultsFromSchedules(cycleId);
              const created = res?.data?.created ?? 0;
              message.success(created > 0
                ? `已从面试安排生成 ${created} 行待定结果`
                : '没有新的安排需要生成（已有结果行的安排会跳过）');
              load();
            } catch (e: any) {
              message.error(e?.message || '生成失败');
            }
          }}
        >
          从面试安排生成名单
        </Button>
        <Tooltip title={selectedUndecided > 0 ? "所选名单里有人还没录入决定，先批量录取或标记未通过" : ""}>
          <Button
            disabled={selected.length === 0 || selectedUndecided > 0}
            onClick={() => {
              setCustomMsg("");
              // 已通知过的人再点发送是重发 —— 说清楚，别让人误以为没发出去过
              const resent = list.filter((r) => selected.includes(r.resultId) && r.notifiedAt).length;
              if (resent > 0) {
                message.info(`所选名单中 ${resent} 人此前已通知过，本次发送将向他们重发`);
              }
              setNotifyOpen(true);
            }}
          >
            发送通知（已选 {selected.length}）
          </Button>
        </Tooltip>
        {undecided > 0 && <Tag color="orange">{undecided} 人未录入决定</Tag>}
      </Space>
      <Table
        rowKey="resultId"
        size="middle"
        loading={loading}
        dataSource={list}
        pagination={false}
        locale={{ emptyText: "暂无面试结果 —— 点上方「从面试安排生成名单」生成待定列表，或从「飞书同步」拉回" }}
        rowSelection={{
          selectedRowKeys: selected,
          onChange: (keys) => setSelected(keys as number[]),
          // 不再禁用"未录入决定"的行——批量录取的目标恰恰是这些人；
          // 发送通知的按钮会自行判断所选名单里是否还有未录入的
        }}
        columns={[
          { title: "姓名", dataIndex: "userId", width: 110,
            /*
              姓名优先取结果接口自己带回来的 userName。
              原先只从「面试安排名册」里查，而没有面试安排的同学不在那份名册里
              （V34 之后他们也进结果名单了），姓名就退化成「用户#14」——
              尽管库里明明存着他的名字。名册只作兜底。
            */
            render: (uid: number, r: InterviewResultItem) =>
              r.userName || nameMap[uid]?.name || nameMap[uid]?.username || `用户#${uid}` },
          { title: "学号", dataIndex: "userId", width: 120, render: (uid: number) => nameMap[uid]?.username || "-" },
          {
            title: "面试", dataIndex: "scheduleId", width: 96,
            // 没有面试安排的人此前根本进不了这张表（结果行要求挂在一场面试上）。
            // 现在他们也在名单里，标出来免得管理员以为是数据错乱。
            render: (v: number | null) => (v == null
              ? <Tooltip title="未参加线下面试（本人选择不能参加，或未被排上场次）">
                  <Tag color="orange">无面试</Tag>
                </Tooltip>
              : <Tag>已面试</Tag>),
          },
          { title: "结果", dataIndex: "decision", width: 90,
            render: (d: number) => d != null
              ? <Tag color={DECISION_TAG[d]?.color}>{DECISION_TAG[d]?.text ?? d}</Tag>
              : <Tag color="orange">待录入</Tag> },
          { title: "录取部门", dataIndex: "assignedDeptId", width: 110, render: (v: number) => deptName(v) },
          { title: "决定时间", dataIndex: "decisionAt", width: 150,
            render: (v: string) => (v ? String(v).replace("T", " ").slice(0, 16) : "-") },
          { title: "通知状态", dataIndex: "notifiedAt", width: 130,
            render: (v: string) => v
              ? <Tooltip title={`发送于 ${String(v).replace("T", " ").slice(0, 16)}`}>
                  <Tag color="green">已通知</Tag>
                </Tooltip>
              : <Tag>未通知</Tag> },
          { title: "操作", width: 90,
            render: (_: unknown, r: InterviewResultItem) => (
              <Button type="link" size="small" onClick={() => openEditResult(r)}>录入/修改</Button>
            ) },
        ] as any}
      />

      <Modal
        title={editing
          ? `录入结果：${editing.userName || nameMap[editing.userId]?.name || `用户#${editing.userId}`}`
          : ""}
        open={!!editing}
        onOk={saveResult}
        confirmLoading={saving}
        onCancel={() => setEditing(null)}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: "100%" }} size={12}>
          <div>
            <div style={{ marginBottom: 4, color: "#888", fontSize: 13 }}>面试决定</div>
            <Select
              style={{ width: "100%" }}
              placeholder="选择结果"
              value={editDecision}
              onChange={setEditDecision}
              options={[{ value: 1, label: "通过（录取）" }, { value: 2, label: "未通过" }]}
            />
          </div>
          {editDecision === 1 && (
            <div>
              <div style={{ marginBottom: 4, color: "#888", fontSize: 13 }}>录取部门</div>
              <Select
                style={{ width: "100%" }}
                placeholder="选择部门"
                value={editDept}
                onChange={setEditDept}
                options={depts.map((d: any) => ({ value: d.deptId, label: d.deptName }))}
              />
            </div>
          )}
        </Space>
      </Modal>

      <Modal
        title={`批量录取（${selected.length} 人）`}
        open={batchOpen}
        onOk={() => {
          if (!batchDept) { message.warning("请选择录取部门"); return; }
          runBatch(1, batchDept);
        }}
        okText="确认录取"
        confirmLoading={batching}
        onCancel={() => setBatchOpen(false)}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: "100%" }} size={12}>
          <PageHint>统一标记为通过并录取进所选部门，已有决定会被覆盖。</PageHint>
          {selectedUndecided < selected.length && (
            <Alert
              type="warning"
              showIcon
              message={`所选 ${selected.length} 人中有 ${selected.length - selectedUndecided} 人已录入过结果，本次会被覆盖。`}
            />
          )}
          <div>
            <div style={{ marginBottom: 4, color: "#888", fontSize: 13 }}>录取部门</div>
            <Select
              style={{ width: "100%" }}
              placeholder="选择部门"
              value={batchDept}
              onChange={setBatchDept}
              options={depts.map((d: any) => ({ value: d.deptId, label: d.deptName }))}
            />
          </div>
        </Space>
      </Modal>

      <Modal
        title={`发送结果通知（${selected.length} 人）`}
        open={notifyOpen}
        onOk={doSend}
        okText="确认发送"
        confirmLoading={sending}
        onCancel={() => setNotifyOpen(false)}
        destroyOnClose
      >
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="将向所选同学发送邮件：通过者收到录取通知，未通过者收到感谢信。发送后无法撤回，请确认结果已核对无误。"
        />
        <Input.TextArea
          rows={3}
          maxLength={500}
          value={customMsg}
          onChange={(e) => setCustomMsg(e.target.value)}
          placeholder="自定义附加内容（可选），会附在邮件正文中"
        />
      </Modal>
    </>
  );
};

// ─── 飞书同步 Tab ────────────────────────────────────────────────────────────
/** 任务状态的人话映射：面板上原来直接显示 SUCCESS/PARTIAL_SUCCESS 这类机器词 */
const FEISHU_STATUS_TAG: Record<string, { color: string; text: string }> = {
  PENDING: { color: "default", text: "排队中" },
  RUNNING: { color: "processing", text: "执行中" },
  SUCCESS: { color: "green", text: "已完成" },
  PARTIAL_SUCCESS: { color: "orange", text: "部分成功" },
  FAILED: { color: "red", text: "失败" },
};

const FEISHU_TERMINAL = ["SUCCESS", "PARTIAL_SUCCESS", "FAILED"];

const FeishuTab: React.FC<{ cycleId: number }> = ({ cycleId }) => {
  const [pushUrl, setPushUrl] = useState("");
  const [forceUpdate, setForceUpdate] = useState(false);
  const [pullUrl, setPullUrl] = useState("");
  const [updateDept, setUpdateDept] = useState(true);
  const [task, setTask] = useState<FeishuTaskStatus | null>(null);
  const [running, setRunning] = useState(false);
  const [locations, setLocations] = useState<LocationTableConfig[]>([]);
  const [locLoading, setLocLoading] = useState(false);
  const [editLoc, setEditLoc] = useState<LocationTableConfig | null>(null);
  const [editUrl, setEditUrl] = useState("");
  const [savingLoc, setSavingLoc] = useState(false);

  const loadLocations = useCallback(async () => {
    setLocLoading(true);
    try {
      const res: any = await listFeishuLocations(cycleId);
      setLocations(res?.data ?? []);
    } catch (e: any) {
      message.error(e?.message || "加载地点配置失败");
    } finally {
      setLocLoading(false);
    }
  }, [cycleId]);

  useEffect(() => { loadLocations(); }, [loadLocations]);

  const saveLoc = async () => {
    if (!editLoc) return;
    setSavingLoc(true);
    try {
      await saveFeishuLocation(cycleId, { location: editLoc.location, feishuTableUrl: editUrl.trim() });
      message.success(editUrl.trim() ? "链接已保存" : "已清除该地点的链接");
      setEditLoc(null);
      loadLocations();
    } catch (e: any) {
      message.error(e?.message || "保存失败");
    } finally {
      setSavingLoc(false);
    }
  };

  const handlePullAll = async () => {
    try {
      const res: any = await pullAllLocations(cycleId, updateDept);
      const d = res?.data;
      const n = d?.tasks?.length ?? 0;
      if (n === 0) {
        message.warning("没有已配置链接的地点，请先在上方为地点填写表格链接");
        return;
      }
      const skipped = d?.skippedLocations ?? [];
      message.info(
        `已提交 ${n} 个拉回任务（每个地点一个）${skipped.length ? `，跳过未配链接的：${skipped.join("、")}` : ""}`,
      );
      // 逐个跟踪，避免多个轮询同时刷同一块进度区
      for (const t of d.tasks) await trackTask(t.taskId);
      loadLocations();
    } catch (e: any) {
      message.error(e?.message || "提交失败");
    }
  };

  const trackTask = useCallback(async (taskId: number) => {
    setRunning(true);
    try {
      // 轮询任务进度直至终态（最多 5 分钟）
      for (let i = 0; i < 150; i++) {
        const res: any = await getFeishuTask(taskId);
        const st: FeishuTaskStatus = res?.data;
        setTask(st);
        if (st && FEISHU_TERMINAL.includes(st.status)) {
          if (st.status === "SUCCESS") message.success("飞书同步完成");
          else if (st.status === "PARTIAL_SUCCESS") message.warning("飞书同步部分成功，详见结果统计");
          else message.error(st.errorMessage || "飞书同步失败");
          return;
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
      message.warning("任务仍在执行，可稍后回到本页查看");
    } finally {
      setRunning(false);
    }
  }, []);

  const handlePush = async () => {
    try {
      const res: any = await pushToFeishu({
        cycleId,
        feishuTableUrl: pushUrl.trim() || undefined,
        forceUpdate,
      });
      const taskId = res?.data?.taskId;
      if (taskId) {
        message.info(`任务已提交（#${taskId}），正在执行…`);
        await trackTask(taskId);
        loadLocations();
      }
    } catch (e: any) {
      message.error(e?.message || "提交失败");
    }
  };

  const handlePull = async () => {
    if (!pullUrl.trim()) { message.warning("请填写飞书多维表格链接"); return; }
    try {
      const res: any = await pullFromFeishu({ cycleId, feishuTableUrl: pullUrl.trim(), updateUserDept: updateDept });
      const taskId = res?.data?.taskId;
      if (taskId) { message.info(`任务已提交（#${taskId}），正在执行…`); trackTask(taskId); }
    } catch (e: any) {
      message.error(e?.message || "提交失败");
    }
  };

  return (
    <>
      <PageHint style={{ marginBottom: 16 }}>一个面试地点对应一张飞书表格。先配链接，再推送。</PageHint>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Card
          size="small"
          type="inner"
          title="① 各地点的飞书表格链接"
          extra={<Button size="small" onClick={loadLocations} loading={locLoading}>刷新</Button>}
        >
          <Table
            rowKey="location"
            size="small"
            loading={locLoading}
            dataSource={locations}
            pagination={false}
            locale={{ emptyText: "本周期还没有场次，先去「场次」Tab 创建（地点在场次上）" }}
            columns={[
              { title: "面试地点", dataIndex: "location", width: 160 },
              { title: "场次数", dataIndex: "sessionCount", width: 80 },
              { title: "已分配", dataIndex: "scheduleCount", width: 80 },
              {
                title: "待推送",
                dataIndex: "pendingCount",
                width: 90,
                render: (v: number) => (v > 0 ? <Tag color="orange">{v}</Tag> : <span style={{ color: "#aaa" }}>0</span>),
              },
              {
                title: "飞书表格链接",
                dataIndex: "feishuTableUrl",
                render: (v: string | null) =>
                  v ? (
                    <Tooltip title={v}>
                      <a href={v} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
                        {v.length > 48 ? `${v.slice(0, 48)}…` : v}
                      </a>
                    </Tooltip>
                  ) : (
                    <Tag color="red">未配置（推送会跳过该地点）</Tag>
                  ),
              },
              {
                title: "操作",
                width: 90,
                render: (_: unknown, r: LocationTableConfig) => (
                  <Button
                    type="link"
                    size="small"
                    onClick={() => { setEditLoc(r); setEditUrl(r.feishuTableUrl ?? ""); }}
                  >
                    {r.feishuTableUrl ? "修改" : "配置"}
                  </Button>
                ),
              },
            ] as any}
          />
        </Card>
        <Card size="small" title="② 推送面试安排到飞书" type="inner">
          <Space direction="vertical" style={{ width: "100%" }} size={10}>
            <Space wrap size={12}>
              <Button type="primary" onClick={handlePush} loading={running}>
                {pushUrl.trim() ? "合并推送到单张表" : "按地点推送到飞书"}
              </Button>
              <span style={{ fontSize: 13, color: "#8c8c8c" }}>
                按上表的地点分别推送到各自的表格
              </span>
            </Space>
            <Space wrap size={6}>
              <Switch checked={forceUpdate} onChange={setForceUpdate} size="small" />
              <span style={{ fontSize: 13, color: "#8c8c8c" }}>强制覆盖已同步记录</span>
            </Space>
            {/* 长链接输入收进折叠区：正常用法根本不需要它，摊在页面上只是占地方 */}
            <Collapse
              ghost
              size="small"
              items={[{
                key: "adv",
                label: <span style={{ fontSize: 12, color: "#8c8c8c" }}>高级：合并推到单张表</span>,
                children: (
                  <Input
                    size="small"
                    allowClear
                    placeholder="填了则忽略上表，把所有地点合并推到这一张表"
                    value={pushUrl}
                    onChange={(e) => setPushUrl(e.target.value)}
                  />
                ),
              }]}
            />
          </Space>
        </Card>
        <Card size="small" title="③ 从飞书拉回录取结果" type="inner">
          <Space direction="vertical" style={{ width: "100%" }} size={8}>
            <Space wrap>
              <Switch checked={updateDept} onChange={setUpdateDept} size="small" />
              <span style={{ fontSize: 13, color: "#666" }}>录取后同步更新用户部门</span>
              <Button type="primary" onClick={handlePullAll} loading={running}>
                拉回全部地点
              </Button>
            </Space>
            <span style={{ fontSize: 12, color: "#8c8c8c" }}>
              每个地点提交一个独立任务，逐个执行；下方进度区依次显示各任务结果。
            </span>
            <Collapse
              ghost
              size="small"
              items={[{
                key: "adv",
                label: <span style={{ fontSize: 12, color: "#8c8c8c" }}>高级：只拉某一张表</span>,
                children: (
                  <Space.Compact style={{ width: "100%" }}>
                    <Input
                      size="small"
                      allowClear
                      placeholder="粘贴该表链接"
                      value={pullUrl}
                      onChange={(e) => setPullUrl(e.target.value)}
                    />
                    <Button size="small" onClick={handlePull} disabled={!pullUrl.trim()}>
                      拉这张
                    </Button>
                  </Space.Compact>
                ),
              }]}
            />
          </Space>
        </Card>
        {task && (
          <Card
            size="small"
            type="inner"
            title={
              <Space size={8}>
                <span>同步任务 #{task.taskId}</span>
                {FEISHU_STATUS_TAG[task.status]
                  ? <Tag color={FEISHU_STATUS_TAG[task.status].color}>{FEISHU_STATUS_TAG[task.status].text}</Tag>
                  : <Tag>{task.status}</Tag>}
              </Space>
            }
          >
            {/* 细进度条 + 一行紧凑计数：原来三个 antd Statistic 占了半屏，
                而这里真正要看的只是「成/败/跳 各几条」 */}
            <Progress
              size="small"
              percent={task.progressPercent ?? (FEISHU_TERMINAL.includes(task.status) ? 100 : 30)}
              status={task.status === "FAILED" ? "exception"
                : FEISHU_TERMINAL.includes(task.status) ? "success" : "active"}
              style={{ marginBottom: 6 }}
            />
            <Space size={16} wrap style={{ fontSize: 13 }}>
              <span><span style={{ color: "#8c8c8c" }}>成功 </span>
                <b style={{ color: (task.importedCount ?? 0) > 0 ? "#52c41a" : undefined }}>
                  {task.importedCount ?? 0}
                </b></span>
              <span><span style={{ color: "#8c8c8c" }}>失败 </span>
                <b style={{ color: (task.failedCount ?? 0) > 0 ? "#ff4d4f" : undefined }}>
                  {task.failedCount ?? 0}
                </b></span>
              <span><span style={{ color: "#8c8c8c" }}>跳过 </span>
                <b>{task.skippedCount ?? 0}</b></span>
            </Space>
            {task.errorMessage && (
              <Alert
                type="error"
                showIcon
                style={{ marginTop: 8 }}
                message={<span style={{ fontSize: 13 }}>{task.errorMessage}</span>}
              />
            )}
          </Card>
        )}
      </Space>

      <Modal
        title={`配置「${editLoc?.location ?? ""}」的飞书表格`}
        open={!!editLoc}
        onOk={saveLoc}
        confirmLoading={savingLoc}
        onCancel={() => setEditLoc(null)}
        okText="保存"
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: "100%" }} size={12}>
          <PageHint>该地点的所有场次共用此链接；留空即清除配置。</PageHint>
          <Input
            placeholder="粘贴飞书多维表格链接"
            value={editUrl}
            onChange={(e) => setEditUrl(e.target.value)}
          />
        </Space>
      </Modal>
    </>
  );
};

// ─── 页面主体 ────────────────────────────────────────────────────────────────
/**
 * 无法参加线下面试的同学。
 *
 * 这批人不会被自动排进场次，管理员得单独约线上面试——在此之前他们在
 * 管理端是「看不见」的：既不在已分配名单里，也不在任何场次下，
 * 只能靠翻每一份简历才发现。
 */
const OfflineUnavailableTab: React.FC<{ cycleId: number; refreshToken?: number }> = ({ cycleId, refreshToken }) => {
  const [list, setList] = useState<OfflineUnavailableItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await listOfflineUnavailable(cycleId);
      setList(res?.data ?? []);
    } catch (e: any) {
      message.error(e?.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }, [cycleId]);

  useEffect(() => { void load(); }, [load, refreshToken]);

  return (
    <>
      <PageHint>
        这些同学选了「不能参加线下面试」，不会被自动排进场次，需要单独约线上面试。
        「说明」是他们自己填的，据此联系更省事。
      </PageHint>
      <Table
        rowKey="userId"
        size="small"
        loading={loading}
        dataSource={list}
        locale={{ emptyText: "本周期没有选择「不能参加线下面试」的同学" }}
        columns={[
          { title: "姓名", dataIndex: "name", width: 100, render: (v: string, r: OfflineUnavailableItem) => v || r.username || `用户#${r.userId}` },
          { title: "学号", dataIndex: "username", width: 130, render: (v: string) => v || "-" },
          { title: "邮箱", dataIndex: "email", width: 220, render: (v: string) => v || "-" },
          { title: "手机", dataIndex: "phone", width: 130, render: (v: string) => v || "-" },
          {
            title: "说明",
            dataIndex: "note",
            // 说明是这张表存在的意义，给它最宽的一列
            render: (v: string) => v
              ? <span style={{ whiteSpace: "pre-wrap" }}>{v}</span>
              : <Typography.Text type="secondary">未填写</Typography.Text>,
          },
        ]}
      />
    </>
  );
};

const InterviewManage: React.FC = () => {
  const [cycles, setCycles] = useState<RecruitmentCycle[]>([]);
  const [cycleId, setCycleId] = useState<number | undefined>();
  const [depts, setDepts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>("slots");
  // 每个面板一个自增令牌：切到它时 +1，面板据此重新拉数据
  const [tabTokens, setTabTokens] = useState<Record<string, number>>({});
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
        /* 受控 + 每个面板带 refreshToken：
           antd 的 Tabs 默认保留已挂载的面板，切走再切回来时子组件的 useEffect
           不会重跑。表现为「在『时间段』里新增一个时间段，切回『场次』时
           所属时间段的下拉里没有它，非刷新整页不可」（用户实际撞到的）。
           这里在每次切换时把目标面板的 token 自增，子组件据此重新拉数据；
           比 destroyInactiveTabPane 温和 —— 后者会把面板里的筛选、滚动位置
           也一并丢掉。 */
        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key);
            setTabTokens((prev) => ({ ...prev, [key]: (prev[key] ?? 0) + 1 }));
          }}
          items={[
            { key: "slots", label: "时间段", children: <TimeSlotTab cycleId={cycleId} refreshToken={tabTokens.slots ?? 0} /> },
            { key: "sessions", label: "场次", children: <SessionTab cycleId={cycleId} depts={depts} refreshToken={tabTokens.sessions ?? 0} /> },
            { key: "assign", label: "分配与调剂", children: <AssignmentTab cycleId={cycleId} cycle={cycles.find((c) => c.cycleId === cycleId)} refreshToken={tabTokens.assign ?? 0} /> },
            { key: "reschedule", label: "改期申请", children: <RescheduleTab cycleId={cycleId} refreshToken={tabTokens.reschedule ?? 0} /> },
            { key: "evaluation", label: "评价汇总", children: <EvaluationSummaryTab cycleId={cycleId} /> },
            { key: "offline", label: "无法线下", children: <OfflineUnavailableTab cycleId={cycleId} refreshToken={tabTokens.offline ?? 0} /> },
            { key: "results", label: "结果与通知", children: <ResultTab cycleId={cycleId} depts={depts} refreshToken={tabTokens.results ?? 0} /> },
            { key: "feishu", label: "飞书同步", children: <FeishuTab cycleId={cycleId} /> },
          ]}
        />
      ) : (
        <Alert type="warning" message="请先在「招募周期」页创建周期" showIcon />
      )}
    </Card>
  );
};

export default InterviewManage;
