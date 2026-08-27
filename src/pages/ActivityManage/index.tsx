import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Upload,
  message,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { UploadFile } from "antd";
import dayjs from "dayjs";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import {
  Activity,
  createActivity,
  deleteActivity,
  listActivities,
  updateActivity,
  uploadActivityImage,
} from "@/api/manage/activityApis";
import "./index.scss";

/** Quill 编辑器为空时的产出不是空串，保存前归一化，免得库里存一段"空段落" */
const EMPTY_QUILL_VALUES = new Set(["", "<p><br></p>", "<p></p>"]);
const normalizeDetail = (html?: string) =>
  html && !EMPTY_QUILL_VALUES.has(html.trim()) ? html : "";

const ActivityManage: React.FC = () => {
  const [list, setList] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  // 封面独立于 Form 管理：Upload 的 fileList 形态与表单字段对不上，硬塞进 Form 反而绕
  const [coverUrl, setCoverUrl] = useState<string | undefined>();
  const [coverUploading, setCoverUploading] = useState(false);

  const quillRef = useRef<ReactQuill>(null);

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
    setCoverUrl(undefined);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (r: Activity) => {
    setEditing(r);
    setCoverUrl(r.coverImage || undefined);
    form.setFieldsValue({
      title: r.title,
      category: r.category,
      description: r.description,
      detailContent: r.detailContent || "",
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

  // 工具栏图片按钮：上传到服务端拿 URL 再插入，替代 Quill 默认的 base64 内嵌——
  // base64 会把整张图塞进 detail_content，几张照片就是几 MB 的行
  const quillImageHandler = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const res: any = await uploadActivityImage(file);
        const url = res?.data?.url;
        const editor = quillRef.current?.getEditor();
        if (!editor || !url) return;
        const index = editor.getSelection(true)?.index ?? editor.getLength();
        editor.insertEmbed(index, "image", url);
        editor.setSelection(index + 1, 0);
      } catch (e: any) {
        message.error(e?.message || "图片上传失败");
      }
    };
    input.click();
  }, []);

  const quillModules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [2, 3, false] }],
          ["bold", "italic", "underline", "strike"],
          [{ list: "ordered" }, { list: "bullet" }],
          [{ align: [] }],
          ["blockquote", "link", "image"],
          ["clean"],
        ],
        handlers: { image: quillImageHandler },
      },
    }),
    [quillImageHandler],
  );

  const handleCoverUpload = async (file: File) => {
    setCoverUploading(true);
    try {
      const res: any = await uploadActivityImage(file);
      if (res?.data?.url) setCoverUrl(res.data.url);
    } catch (e: any) {
      message.error(e?.message || "封面上传失败");
    } finally {
      setCoverUploading(false);
    }
    return false; // 阻止 antd 默认上传，走上面的自定义请求
  };

  const coverFileList: UploadFile[] = coverUrl
    ? [{ uid: "cover", name: "封面", status: "done", url: coverUrl }]
    : [];

  const handleSave = async () => {
    const v = await form.validateFields();
    const payload: Partial<Activity> = {
      title: v.title,
      category: v.category,
      description: v.description,
      detailContent: normalizeDetail(v.detailContent),
      coverImage: coverUrl ?? "",
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
                {r.coverImage && (
                  <img
                    src={r.coverImage}
                    alt=""
                    style={{ width: 40, height: 28, objectFit: "cover", borderRadius: 4 }}
                  />
                )}
                {v}
                {r.isFeatured && <Tag color="gold">精选</Tag>}
                {r.detailContent && <Tag color="blue">图文</Tag>}
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
        width={760}
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: "请输入标题" }]}>
            <Input maxLength={60} />
          </Form.Item>
          <Space size={16} wrap style={{ display: "flex" }}>
            <Form.Item name="category" label="分类">
              <Input placeholder="如：讲座 / 比赛 / 团建" maxLength={20} style={{ width: 180 }} />
            </Form.Item>
            <Form.Item name="location" label="地点">
              <Input maxLength={50} style={{ width: 200 }} />
            </Form.Item>
            <Form.Item name="maxParticipants" label="人数上限">
              <InputNumber min={1} max={2000} style={{ width: 120 }} />
            </Form.Item>
            <Form.Item name="isFeatured" label="设为精选" valuePropName="checked" initialValue={false}>
              <Switch />
            </Form.Item>
          </Space>
          <Space size={16} wrap style={{ display: "flex" }}>
            <Form.Item name="range" label="活动起止日期">
              <DatePicker.RangePicker />
            </Form.Item>
            <Form.Item name="signupRange" label="报名起止日期">
              <DatePicker.RangePicker />
            </Form.Item>
          </Space>
          <Form.Item label="封面图" extra="展示在活动列表卡片与详情页顶部，建议横图">
            <Upload
              listType="picture-card"
              accept="image/*"
              maxCount={1}
              fileList={coverFileList}
              beforeUpload={handleCoverUpload}
              onRemove={() => setCoverUrl(undefined)}
            >
              {!coverUrl && (
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 4 }}>{coverUploading ? "上传中…" : "上传封面"}</div>
                </div>
              )}
            </Upload>
          </Form.Item>
          <Form.Item name="description" label="摘要" extra="显示在活动列表卡片上的一句话简介">
            <Input.TextArea rows={2} maxLength={500} />
          </Form.Item>
          <Form.Item
            name="detailContent"
            label="图文详情"
            extra="支持标题、加粗、列表、对齐与插图，工具栏的图片按钮会先上传再插入；保存后展示在活动详情页"
          >
            <ReactQuill
              ref={quillRef}
              theme="snow"
              modules={quillModules}
              placeholder="活动的完整介绍、日程、往期照片都可以放在这里…"
              className="activity-detail-editor"
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default ActivityManage;
