import React, { useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tag,
  message,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import {
  Activity,
  createActivity,
  deleteActivity,
  listActivities,
  updateActivity,
} from "@/api/manage/activityApis";

const ActivityManage: React.FC = () => {
  const [list, setList] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await listActivities();
      setList(res?.data ?? []);
    } catch (e: any) {
      message.error(e?.message || "加载活动失败");
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

  const openEdit = (r: Activity) => {
    setEditing(r);
    form.setFieldsValue({
      title: r.title,
      category: r.category,
      description: r.description,
      location: r.location,
      maxParticipants: r.maxParticipants,
      isFeatured: !!r.isFeatured,
      range: r.startTime && r.endTime ? [dayjs(r.startTime), dayjs(r.endTime)] : undefined,
      signupRange:
        r.signupStart && r.signupDeadline
          ? [dayjs(r.signupStart), dayjs(r.signupDeadline)]
          : undefined,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const v = await form.validateFields();
    const payload: Partial<Activity> = {
      title: v.title,
      category: v.category,
      description: v.description,
      location: v.location,
      maxParticipants: v.maxParticipants,
      isFeatured: v.isFeatured,
      startTime: v.range?.[0]?.format("YYYY-MM-DD"),
      endTime: v.range?.[1]?.format("YYYY-MM-DD"),
      signupStart: v.signupRange?.[0]?.format("YYYY-MM-DD"),
      signupDeadline: v.signupRange?.[1]?.format("YYYY-MM-DD"),
    };
    setSaving(true);
    try {
      if (editing) {
        await updateActivity(editing.activityId, payload);
        message.success("活动已更新");
      } else {
        await createActivity(payload);
        message.success("活动已创建");
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
    <Card
      title="活动管理"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新建活动
        </Button>
      }
    >
      <Table
        rowKey="activityId"
        size="middle"
        loading={loading}
        dataSource={list}
        pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条` }}
        columns={[
          { title: "ID", dataIndex: "activityId", width: 64 },
          {
            title: "标题",
            dataIndex: "title",
            render: (v: string, r: Activity) => (
              <Space>
                {v}
                {r.isFeatured && <Tag color="gold">精选</Tag>}
              </Space>
            ),
          },
          { title: "分类", dataIndex: "category", width: 100 },
          { title: "开始", dataIndex: "startTime", width: 112 },
          { title: "结束", dataIndex: "endTime", width: 112 },
          { title: "地点", dataIndex: "location", width: 130 },
          {
            title: "报名",
            width: 100,
            render: (_: unknown, r: Activity) =>
              `${r.currentParticipants ?? 0}${r.maxParticipants ? `/${r.maxParticipants}` : ""}`,
          },
          {
            title: "操作",
            width: 150,
            render: (_: unknown, r: Activity) => (
              <Space>
                <Button type="link" size="small" onClick={() => openEdit(r)}>
                  编辑
                </Button>
                <Popconfirm
                  title="确认删除该活动？"
                  onConfirm={async () => {
                    try {
                      await deleteActivity(r.activityId);
                      message.success("已删除");
                      load();
                    } catch (e: any) {
                      message.error(e?.message || "删除失败");
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
        title={editing ? `编辑活动 #${editing.activityId}` : "新建活动"}
        open={modalOpen}
        onOk={handleSave}
        confirmLoading={saving}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
        width={560}
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: "请输入标题" }]}>
            <Input maxLength={60} />
          </Form.Item>
          <Form.Item name="category" label="分类">
            <Input placeholder="如：讲座 / 比赛 / 团建" maxLength={20} />
          </Form.Item>
          <Form.Item name="range" label="活动起止日期">
            <DatePicker.RangePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="signupRange" label="报名起止日期">
            <DatePicker.RangePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="location" label="地点">
            <Input maxLength={50} />
          </Form.Item>
          <Form.Item name="maxParticipants" label="人数上限">
            <InputNumber min={1} max={2000} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="isFeatured" label="设为精选" valuePropName="checked" initialValue={false}>
            <Switch />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} maxLength={500} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default ActivityManage;
