import React, { useCallback, useEffect, useState } from "react";
import ResumeFieldsDrawer from "./ResumeFieldsDrawer";
import {
  Button,
  Card,
  DatePicker,
  Dropdown,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  message,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  MoreOutlined,
  PlusOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  RecruitmentCycle,
  createCycle,
  deleteCycle,
  getAllCycles,
  refreshCycleStatuses,
  updateCycle,
} from "@/api/manage/cycleApis";

const STATUS_TAG: Record<number, { color: string; text: string }> = {
  1: { color: "default", text: "未开始" },
  2: { color: "processing", text: "进行中" },
  3: { color: "success", text: "已结束" },
};

const CycleManage: React.FC = () => {
  const [list, setList] = useState<RecruitmentCycle[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RecruitmentCycle | null>(null);
  const [saving, setSaving] = useState(false);
  // 简历字段按周期配置，入口挂在每一行上（原先在「用户与角色」里且写死了周期）
  const [fieldsFor, setFieldsFor] = useState<RecruitmentCycle | null>(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await getAllCycles();
      setList(res?.data ?? []);
    } catch (e: any) {
      message.error(e?.message || "加载招募周期失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record: RecruitmentCycle) => {
    setEditing(record);
    form.setFieldsValue({
      cycleName: record.cycleName,
      description: record.description,
      academicYear: record.academicYear,
      range: [dayjs(record.startDate), dayjs(record.endDate)],
      isActive: record.isActive,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    const [start, end] = values.range;
    const payload = {
      cycleId: editing?.cycleId,
      cycleName: values.cycleName,
      description: values.description,
      academicYear: values.academicYear,
      startDate: start.format("YYYY-MM-DD"),
      endDate: end.format("YYYY-MM-DD"),
      isActive: values.isActive,
    };
    setSaving(true);
    try {
      if (editing) {
        await updateCycle(payload);
        message.success("周期已更新");
      } else {
        await createCycle(payload);
        message.success("周期已创建");
      }
      setModalOpen(false);
      load();
    } catch (e: any) {
      message.error(e?.message || "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cycleId: number) => {
    try {
      await deleteCycle(cycleId);
      message.success("已删除");
      load();
    } catch (e: any) {
      message.error(e?.message || "删除失败（周期可能已有关联数据）");
    }
  };

  const handleRefreshStatuses = async () => {
    try {
      await refreshCycleStatuses();
      message.success("已按起止日期刷新周期状态");
      load();
    } catch (e: any) {
      message.error(e?.message || "刷新失败");
    }
  };

  // 停止/开放投递。后端在「新建简历」「提交简历」上都有守卫：周期不活跃或
  // 不在起止日期内直接返回 3010，所以这个开关是真闸门，不只是隐藏入口。
  // 此前只能进「编辑周期」把「是否活跃」改掉 —— 管理员根本找不到。
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const toggleIntake = async (record: RecruitmentCycle) => {
    const open = record.isActive === 1;
    setTogglingId(record.cycleId);
    try {
      await updateCycle({
        cycleId: record.cycleId,
        cycleName: record.cycleName,
        academicYear: record.academicYear,
        description: record.description,
        startDate: record.startDate,
        endDate: record.endDate,
        status: record.status,
        isActive: open ? 0 : 1,
      } as any);
      message.success(open ? "已停止投递：学生端不再显示该周期，也无法提交" : "已开放投递");
      load();
    } catch (e: any) {
      message.error(e?.message || "操作失败");
    } finally {
      setTogglingId(null);
    }
  };

  const columns = [
    { title: "ID", dataIndex: "cycleId", width: 64 },
    { title: "名称", dataIndex: "cycleName" },
    { title: "学年", dataIndex: "academicYear", width: 110 },
    { title: "开始", dataIndex: "startDate", width: 112 },
    { title: "结束", dataIndex: "endDate", width: 112 },
    {
      title: "状态",
      dataIndex: "status",
      width: 90,
      render: (s: number) => {
        const t = STATUS_TAG[s] || { color: "default", text: `状态${s}` };
        return <Tag color={t.color}>{t.text}</Tag>;
      },
    },
    {
      title: "投递",
      dataIndex: "isActive",
      width: 80,
      render: (v: number) =>
        v === 1 ? <Tag color="green">投递开放</Tag> : <Tag>已停止</Tag>,
    },
    {
      title: "操作",
      width: 220,
      render: (_: unknown, record: RecruitmentCycle) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEdit(record)}
          >
            编辑
          </Button>
          <Button type="link" size="small" onClick={() => setFieldsFor(record)}>
            简历字段
          </Button>
          <Button
            type="link"
            size="small"
            danger={record.isActive === 1}
            loading={togglingId === record.cycleId}
            onClick={() => {
              const open = record.isActive === 1;
              Modal.confirm({
                title: open ? "停止该周期的简历投递？" : "重新开放该周期的投递？",
                content: open
                  ? "学生端将不再显示该周期，已填的草稿保留但无法再提交或修改；随时可以再开放。"
                  : "学生端将重新显示该周期，可以提交与修改简历（还需在起止日期内）。",
                okText: open ? "停止投递" : "开放投递",
                okButtonProps: { danger: open },
                cancelText: "取消",
                onOk: () => toggleIntake(record),
              });
            }}
          >
            {record.isActive === 1 ? "停止投递" : "开放投递"}
          </Button>
          <Dropdown
            trigger={["click"]}
            menu={{
              items: [
                { key: "del", icon: <DeleteOutlined />, label: "删除周期", danger: true },
              ],
              onClick: () => {
                Modal.confirm({
                  title: "确认删除该周期？",
                  // 后端已改软删除：带简历/面试数据的周期也能删，历史数据保留
                  content: "删除后该周期从列表与投递入口消失；已有的简历、面试数据会保留，可联系管理员恢复。",
                  okText: "删除",
                  okType: "danger",
                  cancelText: "取消",
                  async onOk() {
                    await handleDelete(record.cycleId);
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
  ];

  return (
    <Card
      title="招募周期管理"
      extra={
        <Space>
          <Button icon={<SyncOutlined />} onClick={handleRefreshStatuses}>
            刷新状态
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新建周期
          </Button>
        </Space>
      }
    >
      <Table
        rowKey="cycleId"
        loading={loading}
        columns={columns as any}
        dataSource={list}
        pagination={false}
        size="middle"
      />

      <Modal
        title={editing ? `编辑周期 #${editing.cycleId}` : "新建招募周期"}
        open={modalOpen}
        onOk={handleSave}
        confirmLoading={saving}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            name="cycleName"
            label="周期名称"
            rules={[{ required: true, message: "请输入周期名称" }]}
          >
            <Input placeholder="如：2026 秋季招新" maxLength={50} />
          </Form.Item>
          <Form.Item
            name="academicYear"
            label="学年"
            rules={[{ required: true, message: "请输入学年" }]}
          >
            <Input placeholder="如：2026-2027" maxLength={20} />
          </Form.Item>
          <Form.Item
            name="range"
            label="起止日期"
            rules={[{ required: true, message: "请选择起止日期" }]}
          >
            <DatePicker.RangePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="isActive" label="投递开关" initialValue={1}>
            <Select
              options={[
                { value: 1, label: "开放投递（学生端可见，可提交/修改简历）" },
                { value: 0, label: "停止投递（学生端不可见，无法提交）" },
              ]}
            />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} maxLength={200} />
          </Form.Item>
        </Form>
      </Modal>
      <ResumeFieldsDrawer
        open={!!fieldsFor}
        cycleId={fieldsFor?.cycleId ?? null}
        cycleName={fieldsFor?.cycleName}
        onClose={() => setFieldsFor(null)}
      />

    </Card>
  );
};

export default CycleManage;
