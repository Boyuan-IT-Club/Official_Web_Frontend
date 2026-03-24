// src/pages/DeptManagePage.tsx
// NOTE 部门管理板块
import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  message,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  createDept,
  deleteDept,
  getDept,
  updateDept,
  DeptData,
} from '@/api/manage/deptManage';

// ─── 类型 ────────────────────────────────────────────────────────────────────

interface Dept extends DeptData {
  deptId: number;
}

type ModalMode = 'create' | 'edit' | 'view';

// ─── 组件 ────────────────────────────────────────────────────────────────────

const DeptManagePage: React.FC = () => {
  const [depts, setDepts] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(false);

  // ── 弹窗状态 ──────────────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [currentDept, setCurrentDept] = useState<Dept | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form] = Form.useForm();

  // ── 数据加载 ──────────────────────────────────────────────────────────────
  const fetchDepts = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await getDept();
      setDepts(res?.data ?? []);
    } catch (e) {
      console.error('获取部门列表失败:', e);
      message.error('获取部门列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepts();
  }, [fetchDepts]);

  // ── 打开弹窗 ──────────────────────────────────────────────────────────────
  const openModal = (mode: ModalMode, dept?: Dept) => {
    setModalMode(mode);
    setCurrentDept(dept ?? null);
    if (dept) {
      form.setFieldsValue(dept);
    } else {
      form.resetFields();
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setCurrentDept(null);
    form.resetFields();
  };

  // ── 提交（新增 / 编辑）───────────────────────────────────────────────────
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      if (modalMode === 'create') {
        await createDept(values);
        message.success('部门创建成功');
      } else if (modalMode === 'edit' && currentDept) {
        await updateDept(currentDept.deptId, values);
        message.success('部门更新成功');
      }
      closeModal();
      fetchDepts();
    } catch (e: any) {
      if (e?.errorFields) return; // 表单校验失败，不报 error
      console.error(e);
      message.error(modalMode === 'create' ? '创建失败' : '更新失败');
    } finally {
      setSubmitting(false);
    }
  };

  // ── 删除 ──────────────────────────────────────────────────────────────────
  const handleDelete = async (deptId: number) => {
    try {
      await deleteDept(deptId);
      message.success('部门已删除');
      fetchDepts();
    } catch (e) {
      console.error(e);
      message.error('删除失败');
    }
  };

  // ── 表格列 ────────────────────────────────────────────────────────────────
  const columns = [
    {
      title: '部门编码',
      dataIndex: 'deptCode',
      key: 'deptCode',
      width: 120,
    },
    {
      title: '部门名称',
      dataIndex: 'deptName',
      key: 'deptName',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (v: string) => v || <span style={{ color: '#bbb' }}>—</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (v: number) =>
        v === 1
          ? <Tag color="success">启用</Tag>
          : <Tag color="default">禁用</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_: any, record: Dept) => (
        <Space size={4}>
          <Tooltip title="查看">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => openModal('view', record)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openModal('edit', record)}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Popconfirm
              title="确认删除该部门？"
              description="删除后不可恢复，请谨慎操作。"
              okText="确认删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDelete(record.deptId)}
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  // ── 弹窗标题 ──────────────────────────────────────────────────────────────
  const modalTitleMap: Record<ModalMode, string> = {
    create: '新增部门',
    edit: '编辑部门',
    view: '部门详情',
  };

  // ─── 渲染 ─────────────────────────────────────────────────────────────────
  return (
    <Card
      title="部门管理"
      styles={{ body: { padding: '16px 24px' } }}
      extra={
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchDepts}
            loading={loading}
          >
            刷新
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openModal('create')}
          >
            新增部门
          </Button>
        </Space>
      }
    >
      <Table
        rowKey="deptId"
        dataSource={depts}
        columns={columns}
        loading={loading}
        pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条` }}
      />

      {/* 新增 / 编辑 / 查看 弹窗 */}
      <Modal
        title={modalTitleMap[modalMode]}
        open={modalOpen}
        onCancel={closeModal}
        onOk={modalMode === 'view' ? closeModal : handleSubmit}
        okText={modalMode === 'view' ? '关闭' : '确认'}
        cancelButtonProps={modalMode === 'view' ? { style: { display: 'none' } } : undefined}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          disabled={modalMode === 'view'}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            label="部门编码"
            name="deptCode"
            rules={[{ required: true, message: '请输入部门编码' }]}
          >
            <Input placeholder="如：TECH、HR" />
          </Form.Item>

          <Form.Item
            label="部门名称"
            name="deptName"
            rules={[{ required: true, message: '请输入部门名称' }]}
          >
            <Input placeholder="如：技术部" />
          </Form.Item>

          <Form.Item label="描述" name="description">
            <Input.TextArea rows={3} placeholder="部门职能描述（选填）" />
          </Form.Item>

          <Form.Item label="状态" name="status" valuePropName="checked">
            <Switch
              checkedChildren="启用"
              unCheckedChildren="禁用"
              defaultChecked
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default DeptManagePage;