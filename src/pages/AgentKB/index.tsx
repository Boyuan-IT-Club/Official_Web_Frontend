import React, { useCallback, useEffect, useState } from "react";
import {
  Button,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Radio,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { CloudUploadOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";
import {
  KbSourceRow,
  createKbSource,
  deleteKbSource,
  getKbSource,
  listKbSources,
  reembedKbSource,
  setKbSourceEnabled,
  updateKbSource,
} from "@/api/manage/agentApis";

const { Text } = Typography;

/** 知识库管理(RAG #134 #121):AgentAdmin 工作台「知识库」Tab。
 * 权限 kb:manage(独立于 agent:monitor,可单独授权知识运营);
 * 数据权威在 Agent 服务 /admin/kb*,Backend 纯代理。 */
const AgentKB: React.FC = () => {
  const [rows, setRows] = useState<KbSourceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [kindFilter, setKindFilter] = useState<string>("");
  const [keyword, setKeyword] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const [editing, setEditing] = useState<KbSourceRow | null>(null); // null=关闭
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const docType = Form.useWatch("type", form) ?? "faq";

  const load = useCallback(
    async (p = page, s = size, kind = kindFilter, kw = keyword) => {
      setLoading(true);
      try {
        const res: any = await listKbSources({
          page: p,
          size: s,
          kind: kind || undefined,
          keyword: kw || undefined,
        });
        setRows(res?.data?.items ?? []);
        setTotal(res?.data?.total ?? 0);
      } catch (e: any) {
        message.error(e?.message || "加载知识库列表失败");
      } finally {
        setLoading(false);
      }
    },
    [page, size, kindFilter, keyword]
  );

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setCreating(true);
    form.resetFields();
    form.setFieldsValue({ type: "faq", kind: "normal", tags: [] });
  };

  const openEdit = async (row: KbSourceRow) => {
    setEditing(row);
    form.resetFields();
    try {
      const res: any = await getKbSource(row.source_id);
      const d = res?.data ?? row;
      form.setFieldsValue({
        title: d.title,
        type: d.type,
        kind: d.kind,
        tags: d.tags ?? [],
        question: d.question ?? "",
        answer: d.answer ?? "",
        content_md: d.content_md ?? "",
      });
    } catch (e: any) {
      message.error(e?.message || "加载条目详情失败");
    }
  };

  const closeEditor = () => {
    setCreating(false);
    setEditing(null);
  };

  const submit = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      if (editing) {
        await updateKbSource(editing.source_id, values);
        message.success("已更新并重嵌");
      } else {
        await createKbSource(values);
        message.success("已创建并入库");
      }
      closeEditor();
      load(1, size, kindFilter, keyword);
    } catch (e: any) {
      message.error(e?.message || "保存失败");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleEnabled = async (row: KbSourceRow, enabled: boolean) => {
    try {
      await setKbSourceEnabled(row.source_id, enabled);
      message.success(enabled ? "已启用" : "已停用(退出生检索)");
      load();
    } catch (e: any) {
      message.error(e?.message || "操作失败");
    }
  };

  const doDelete = async (row: KbSourceRow) => {
    try {
      await deleteKbSource(row.source_id);
      message.success("已删除");
      load();
    } catch (e: any) {
      message.error(e?.message || "删除失败");
    }
  };

  const doReembed = async (row: KbSourceRow) => {
    try {
      await reembedKbSource(row.source_id);
      message.success("已重嵌");
      load();
    } catch (e: any) {
      message.error(e?.message || "重嵌失败(若 embedding 未配置请联系管理员)");
    }
  };

  const columns: ColumnsType<KbSourceRow> = [
    {
      title: "标题",
      dataIndex: "title",
      render: (v: string, r) => (
        <div>
          <div>{v}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {r.source_id}
          </Text>
        </div>
      ),
    },
    {
      title: "类型",
      dataIndex: "type",
      width: 80,
      render: (v: string) =>
        v === "faq" ? <Tag color="blue">FAQ</Tag> : <Tag color="geekblue">正文</Tag>,
    },
    {
      title: "kind",
      dataIndex: "kind",
      width: 90,
      render: (v: string) =>
        v === "test" ? <Tag color="warning">测试</Tag> : <Tag>常规</Tag>,
    },
    {
      title: "标签",
      dataIndex: "tags",
      render: (tags: string[]) =>
        (tags ?? []).length ? tags.map((t) => <Tag key={t}>{t}</Tag>) : "-",
    },
    {
      title: "启停",
      dataIndex: "enabled",
      width: 80,
      render: (_: boolean, r) => (
        <Switch
          size="small"
          checked={r.enabled}
          onChange={(checked) => toggleEnabled(r, checked)}
        />
      ),
    },
    { title: "块数", dataIndex: "chunk_count", width: 70, render: (v) => v ?? "-" },
    { title: "更新人", dataIndex: "updated_by", width: 110 },
    {
      title: "更新时间",
      dataIndex: "updated_at",
      width: 150,
      render: (v: string) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "-"),
    },
    {
      title: "操作",
      key: "actions",
      width: 200,
      render: (_: unknown, r) => (
        <Space>
          <Button size="small" type="link" onClick={() => openEdit(r)}>
            编辑
          </Button>
          <Button
            size="small"
            type="link"
            icon={<CloudUploadOutlined />}
            onClick={() => doReembed(r)}
          >
            重嵌
          </Button>
          <Popconfirm title="删除后不可恢复,确定?" onConfirm={() => doDelete(r)}>
            <Button size="small" type="link" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 12 }} wrap>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新建条目
        </Button>
        <Radio.Group
          value={kindFilter}
          onChange={(e) => {
            setKindFilter(e.target.value);
            load(1, size, e.target.value, keyword);
          }}
          optionType="button"
          buttonStyle="solid"
          options={[
            { value: "", label: "全部" },
            { value: "normal", label: "常规" },
            { value: "test", label: "测试" },
          ]}
        />
        <Input.Search
          allowClear
          placeholder="按标题搜索"
          style={{ width: 220 }}
          onSearch={(v) => {
            setKeyword(v);
            load(1, size, kindFilter, v);
          }}
        />
        <Button icon={<ReloadOutlined />} onClick={() => load()} />
        <Text type="secondary" style={{ fontSize: 12 }}>
          测试(kind=test)条目不进生产检索,供 dev/eval 建基准
        </Text>
      </Space>

      <Table
        rowKey="source_id"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={rows}
        locale={{ emptyText: <Empty description="还没有知识条目,点「新建条目」录入" /> }}
        pagination={{
          current: page,
          pageSize: size,
          total,
          showSizeChanger: true,
          onChange: (p, s) => {
            setPage(p);
            setSize(s);
            load(p, s, kindFilter, keyword);
          },
        }}
      />

      <Modal
        open={creating || editing !== null}
        title={editing ? `编辑条目:${editing.title}` : "新建知识条目"}
        width={720}
        onCancel={closeEditor}
        onOk={submit}
        confirmLoading={submitting}
        okText={editing ? "保存并重嵌" : "创建并入库"}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Space style={{ display: "flex" }} size="large">
            <Form.Item
              name="title"
              label="标题"
              rules={[{ required: true, message: "标题必填" }]}
              style={{ minWidth: 320 }}
            >
              <Input maxLength={200} placeholder="如:技术部介绍" />
            </Form.Item>
            <Form.Item name="type" label="类型">
              <Radio.Group
                disabled={editing !== null}
                options={[
                  { value: "faq", label: "FAQ 问答对" },
                  { value: "doc", label: "自由正文" },
                ]}
                optionType="button"
              />
            </Form.Item>
            <Form.Item name="kind" label="kind">
              <Radio.Group
                options={[
                  { value: "normal", label: "常规" },
                  { value: "test", label: "测试" },
                ]}
                optionType="button"
              />
            </Form.Item>
          </Space>
          <Form.Item name="tags" label="标签">
            <Select mode="tags" placeholder="回车添加,如:招新 / 部门" />
          </Form.Item>
          {docType === "faq" ? (
            <>
              <Form.Item
                name="question"
                label="问题"
                rules={[{ required: true, message: "FAQ 问题必填" }]}
              >
                <Input.TextArea rows={2} maxLength={4000} placeholder="用户会怎么问" />
              </Form.Item>
              <Form.Item
                name="answer"
                label="回答"
                rules={[{ required: true, message: "FAQ 回答必填" }]}
              >
                <Input.TextArea rows={6} maxLength={20000} placeholder="标准答案(Markdown)" />
              </Form.Item>
            </>
          ) : (
            <Form.Item
              name="content_md"
              label="正文(Markdown,按标题自动分块)"
              rules={[{ required: true, message: "正文必填" }]}
            >
              <Input.TextArea
                rows={14}
                maxLength={20000}
                placeholder={"# 一级标题\n正文段落…\n## 二级标题\n…"}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default AgentKB;
