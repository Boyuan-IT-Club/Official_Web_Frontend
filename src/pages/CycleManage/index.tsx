import React, { useCallback, useEffect, useState } from "react";
import ResumeFieldsDrawer from "./ResumeFieldsDrawer";
import QrCodesDrawer from "./QrCodesDrawer";
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
  PauseCircleOutlined,
  PlayCircleOutlined,
  QrcodeOutlined,
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
      waitingRoom: record.waitingRoom,
      contactInfo: record.contactInfo,
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
      // 显式传 null 而不是省略：后端据此判断「清空」还是「不动」
      waitingRoom: values.waitingRoom?.trim() || null,
      contactInfo: values.contactInfo?.trim() || null,
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
  const [qrFor, setQrFor] = useState<RecruitmentCycle | null>(null);
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
      // 阶段按起止日期推导，不再读手工维护的 status 字段——那个字段没人记得更新，
      // 会出现「已结束」和旁边按日期算的「投递开放」同框打架的怪相
      render: (_s: number, record: any) => {
        const today = dayjs().format("YYYY-MM-DD");
        if (record.startDate && today < record.startDate) {
          return <Tag color="default">未开始</Tag>;
        }
        if (record.endDate && today > record.endDate) {
          return <Tag color="success">已结束</Tag>;
        }
        return <Tag color="processing">进行中</Tag>;
      },
    },
    {
      title: "投递",
      dataIndex: "isActive",
      width: 90,
      // 真实投递状态 = 启用开关 ∧ 今天在起止日期内（与后端 findOpenForApplication /
      // requireCycleOpen 同一判定）。原先只看开关：过了结束日期仍显示「投递开放」，
      // 学生那边其实早就投不进来了，管理员据此误判"时间不统一"
      render: (v: number, record: any) => {
        if (v !== 1) return <Tag>已停止</Tag>;
        const today = dayjs().format("YYYY-MM-DD");
        if (record.startDate && today < record.startDate) return <Tag color="blue">未开始</Tag>;
        if (record.endDate && today > record.endDate) return <Tag color="orange">已截止</Tag>;
        return <Tag color="green">投递开放</Tag>;
      },
    },
    {
      title: "操作",
      width: 168,
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
          {/* 投递开关收进「···」菜单：它是偶发操作（一届只切一两次），
              摊在操作列里和「编辑」「简历字段」抢位置，还顶着个红色 danger 样式，
              比实际重要性显眼得多。当前状态在「投递」列的标签上已经看得见。 */}
          <Dropdown
            trigger={["click"]}
            menu={{
              items: [
                {
                  key: "qrcodes",
                  icon: <QrcodeOutlined />,
                  label: "二维码配置",
                },
                {
                  key: "intake",
                  icon: record.isActive === 1 ? <PauseCircleOutlined /> : <PlayCircleOutlined />,
                  label: record.isActive === 1 ? "停止投递" : "开放投递",
                },
                { type: "divider" },
                { key: "del", icon: <DeleteOutlined />, label: "删除周期", danger: true },
              ],
              onClick: ({ key }) => {
                if (key === "qrcodes") {
                  setQrFor(record);
                  return;
                }
                if (key === "intake") {
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
                  return;
                }
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
            <Button
              type="text"
              size="small"
              icon={<MoreOutlined />}
              loading={togglingId === record.cycleId}
            />
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
          {/* 招新通知用的两项配置。放在周期上而不是全局：每届都会换，
              挂全局要年年手改，历史周期发出去的内容也无从追溯。 */}
          <Form.Item
            name="waitingRoom"
            label="候场教室"
            tooltip="面试提醒邮件里会写「请提前 10 分钟抵达 XXX 候场」。留空则邮件里不出现这一行"
          >
            <Input placeholder="如：教书院202（同一周期通常只有一间）" allowClear />
          </Form.Item>
          <Form.Item
            name="contactInfo"
            label="负责人联系方式"
            tooltip="附在未录取通知邮件末尾。留空则不出现"
          >
            <Input.TextArea
              rows={2}
              placeholder="如：丁华烨　微信 dinghuaye　邮箱 xxx@stu.ecnu.edu.cn"
              allowClear
            />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} maxLength={200} />
          </Form.Item>
        </Form>
      </Modal>
      <QrCodesDrawer
        open={!!qrFor}
        cycleId={qrFor?.cycleId ?? null}
        cycleName={qrFor?.cycleName}
        onClose={() => setQrFor(null)}
      />
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
