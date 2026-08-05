import React, { useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  message,
} from "antd";
import { PlusOutlined, SyncOutlined } from "@ant-design/icons";
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
      title: "活跃",
      dataIndex: "isActive",
      width: 80,
      render: (v: number) =>
        v === 1 ? <Tag color="green">活跃</Tag> : <Tag>否</Tag>,
    },
    {
      title: "操作",
      width: 150,
      render: (_: unknown, record: RecruitmentCycle) => (
        <Space>
          <Button type="link" size="small" onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除该周期？"
            description="删除前请确认周期下没有简历/面试数据"
            onConfirm={() => handleDelete(record.cycleId)}
          >
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
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
          <Form.Item name="isActive" label="是否活跃" initialValue={1}>
            <Select
              options={[
                { value: 1, label: "活跃（学生端可见）" },
                { value: 0, label: "不活跃" },
              ]}
            />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} maxLength={200} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default CycleManage;
