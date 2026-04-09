// src/pages/RoleManagePage.tsx
// NOTE 角色权限管理板块
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Button,
  Card,
  Checkbox,
  Col,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
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
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import {
  createRole,
  deleteRole,
  getRoles,
  updateRole,
  Role,
  RoleData,
} from '@/api/manage/roleControl';
import {
  getRolePermissionIds,
  syncRolePermissions,
} from '@/api/manage/rolePermission';

// ─── 类型 ────────────────────────────────────────────────────────────────────

type ModalMode = 'create' | 'edit' | 'view';

// 权限列表（如有独立接口可替换为动态获取）
const ALL_PERMISSIONS = [
  { label: '查看简历', value: 1 },
  { label: '修改简历', value: 2 },
  { label: '删除简历', value: 3 },
  { label: '用户管理', value: 4 },
  { label: '部门管理', value: 5 },
  { label: '角色管理', value: 6 },
];

// ─── 组件 ────────────────────────────────────────────────────────────────────

const RoleManagePage: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);

  // ── 角色 CRUD 弹窗 ────────────────────────────────────────────────────────
  const [crudModalOpen, setCrudModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  // ── 权限分配弹窗 ──────────────────────────────────────────────────────────
  const [permModalOpen, setPermModalOpen] = useState(false);
  const [permRole, setPermRole] = useState<Role | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<number[]>([]);
  const [permLoading, setPermLoading] = useState(false);
  const [permSubmitting, setPermSubmitting] = useState(false);

  // ── 批量分配权限弹窗 ──────────────────────────────────────────────────────
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchSelectedRoles, setBatchSelectedRoles] = useState<number[]>([]);
  const [batchSelectedPerms, setBatchSelectedPerms] = useState<number[]>([]);
  const [batchSubmitting, setBatchSubmitting] = useState(false);

  // ── 数据加载 ──────────────────────────────────────────────────────────────
  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await getRoles();
      setRoles(res?.data ?? []);
    } catch (e) {
      console.error('获取角色列表失败:', e);
      message.error('获取角色列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  // ── CRUD 弹窗操作 ─────────────────────────────────────────────────────────
  const openCrudModal = (mode: ModalMode, role?: Role) => {
    setModalMode(mode);
    setCurrentRole(role ?? null);
    if (role) {
      form.setFieldsValue({ ...role, status: role.status === 1 });
    } else {
      form.resetFields();
    }
    setCrudModalOpen(true);
  };

  const closeCrudModal = () => {
    setCrudModalOpen(false);
    setCurrentRole(null);
    form.resetFields();
  };

  const handleCrudSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload: RoleData = {
        ...values,
        status: values.status ? 1 : 0,
      };
      setSubmitting(true);
      if (modalMode === 'create') {
        await createRole(payload);
        message.success('角色创建成功');
      } else if (modalMode === 'edit' && currentRole) {
        await updateRole(currentRole.roleId, payload);
        message.success('角色更新成功');
      }
      closeCrudModal();
      fetchRoles();
    } catch (e: any) {
      if (e?.errorFields) return;
      console.error(e);
      message.error(modalMode === 'create' ? '创建失败' : '更新失败');
    } finally {
      setSubmitting(false);
    }
  };

  // ── 删除 ──────────────────────────────────────────────────────────────────
  const handleDelete = async (roleId: number) => {
    try {
      await deleteRole(roleId);
      message.success('角色已删除');
      fetchRoles();
    } catch (e) {
      console.error(e);
      message.error('删除失败');
    }
  };

  // ── 权限分配弹窗 ──────────────────────────────────────────────────────────
  const originalPermsRef = React.useRef<number[]>([]);

  const openPermModal = async (role: Role) => {
    setPermRole(role);
    setPermLoading(true);
    setPermModalOpen(true);
    try {
      const res: any = await getRolePermissionIds(role.roleId);
      const perms: number[] = res?.data ?? [];
      originalPermsRef.current = perms; // 记录原始权限用于 diff
      setSelectedPerms(perms);
    } catch (e) {
      console.error(e);
      message.error('获取权限详情失败');
    } finally {
      setPermLoading(false);
    }
  };

  const closePermModal = () => {
    setPermModalOpen(false);
    setPermRole(null);
    setSelectedPerms([]);
    originalPermsRef.current = [];
  };

  const handlePermSubmit = async () => {
    if (!permRole) return;
    setPermSubmitting(true);
    try {
      // diff：只调用有变化的 add / remove，每次传单个 int
      await syncRolePermissions(permRole.roleId, originalPermsRef.current, selectedPerms);
      message.success(`[${permRole.roleName}] 权限更新成功`);
      closePermModal();
    } catch (e) {
      console.error(e);
      message.error('权限分配失败');
    } finally {
      setPermSubmitting(false);
    }
  };

  // ── 批量分配权限 ──────────────────────────────────────────────────────────
  const openBatchModal = () => {
    setBatchSelectedRoles([]);
    setBatchSelectedPerms([]);
    setBatchModalOpen(true);
  };

  const closeBatchModal = () => {
    setBatchModalOpen(false);
  };

  const handleBatchSubmit = async () => {
    if (batchSelectedRoles.length === 0) {
      message.warning('请至少选择一个角色');
      return;
    }
    if (batchSelectedPerms.length === 0) {
      message.warning('请至少选择一个权限');
      return;
    }
    setBatchSubmitting(true);
    try {
      // 先并发获取各角色当前权限，再 diff 增量操作
      const currentPermsResults = await Promise.all(
        batchSelectedRoles.map((roleId) => getRolePermissionIds(roleId))
      );
      await Promise.all(
        batchSelectedRoles.map((roleId, idx) => {
          const oldPerms: number[] = (currentPermsResults[idx] as any)?.data ?? [];
          return syncRolePermissions(roleId, oldPerms, batchSelectedPerms);
        })
      );
      message.success(`已为 ${batchSelectedRoles.length} 个角色统一分配权限`);
      closeBatchModal();
    } catch (e) {
      console.error(e);
      message.error('批量分配失败');
    } finally {
      setBatchSubmitting(false);
    }
  };

  // ── 表格列 ────────────────────────────────────────────────────────────────
  const columns = [
    {
      title: '角色编码',
      dataIndex: 'roleCode',
      key: 'roleCode',
      width: 130,
    },
    {
      title: '角色名称',
      dataIndex: 'roleName',
      key: 'roleName',
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
      width: 160,
      render: (_: any, record: Role) => (
        <Space size={4}>
          <Tooltip title="查看">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => openCrudModal('view', record)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openCrudModal('edit', record)}
            />
          </Tooltip>
          <Tooltip title="分配权限">
            <Button
              type="text"
              size="small"
              icon={<SafetyCertificateOutlined />}
              onClick={() => openPermModal(record)}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Popconfirm
              title="确认删除该角色？"
              description="删除后不可恢复，请谨慎操作。"
              okText="确认删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDelete(record.roleId)}
            >
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  const crudModalTitles: Record<ModalMode, string> = {
    create: '新增角色',
    edit: '编辑角色',
    view: '角色详情',
  };

  // ─── 渲染 ─────────────────────────────────────────────────────────────────
  return (
    <Card
      title="角色管理"
      styles={{ body: { padding: '16px 24px' } }}
      extra={
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchRoles}
            loading={loading}
          >
            刷新
          </Button>
          <Button icon={<SafetyCertificateOutlined />} onClick={openBatchModal}>
            批量分配权限
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openCrudModal('create')}
          >
            新增角色
          </Button>
        </Space>
      }
    >
      <Table
        rowKey="roleId"
        dataSource={roles}
        columns={columns}
        loading={loading}
        pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条` }}
      />

      {/* ── 新增 / 编辑 / 查看 弹窗 ── */}
      <Modal
        title={crudModalTitles[modalMode]}
        open={crudModalOpen}
        onCancel={closeCrudModal}
        onOk={modalMode === 'view' ? closeCrudModal : handleCrudSubmit}
        okText={modalMode === 'view' ? '关闭' : '确认'}
        cancelButtonProps={
          modalMode === 'view' ? { style: { display: 'none' } } : undefined
        }
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
            label="角色编码"
            name="roleCode"
            rules={[{ required: true, message: '请输入角色编码' }]}
          >
            <Input placeholder="如：ADMIN、MEMBER" />
          </Form.Item>
          <Form.Item
            label="角色名称"
            name="roleName"
            rules={[{ required: true, message: '请输入角色名称' }]}
          >
            <Input placeholder="如：管理员、普通社员" />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={3} placeholder="角色职责描述（选填）" />
          </Form.Item>
          <Form.Item label="状态" name="status" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" defaultChecked />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── 单角色权限分配弹窗 ── */}
      <Modal
        title={`分配权限 — ${permRole?.roleName}`}
        open={permModalOpen}
        onCancel={closePermModal}
        onOk={handlePermSubmit}
        okText="保存"
        confirmLoading={permSubmitting}
        destroyOnClose
      >
        {permLoading ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#999' }}>
            加载中…
          </div>
        ) : (
          <Checkbox.Group
            value={selectedPerms}
            onChange={(v) => setSelectedPerms(v as number[])}
            style={{ width: '100%' }}
          >
            <Row gutter={[0, 12]} style={{ marginTop: 16 }}>
              {ALL_PERMISSIONS.map((p) => (
                <Col span={12} key={p.value}>
                  <Checkbox value={p.value}>{p.label}</Checkbox>
                </Col>
              ))}
            </Row>
          </Checkbox.Group>
        )}
      </Modal>

      {/* ── 批量分配权限弹窗 ── */}
      <Modal
        title="批量分配权限"
        open={batchModalOpen}
        onCancel={closeBatchModal}
        onOk={handleBatchSubmit}
        okText="确认分配"
        confirmLoading={batchSubmitting}
        destroyOnClose
      >
        <div style={{ marginTop: 16 }}>
          <p style={{ fontWeight: 500, marginBottom: 8 }}>第一步：选择目标角色</p>
          <Checkbox.Group
            value={batchSelectedRoles}
            onChange={(v) => setBatchSelectedRoles(v as number[])}
            style={{ width: '100%' }}
          >
            <Row gutter={[0, 8]}>
              {roles.map((r) => (
                <Col span={12} key={r.roleId}>
                  <Checkbox value={r.roleId}>{r.roleName}</Checkbox>
                </Col>
              ))}
            </Row>
          </Checkbox.Group>
        </div>

        <div style={{ margin: '20px 0', borderTop: '1px solid #f0f0f0' }} />

        <div>
          <p style={{ fontWeight: 500, marginBottom: 8 }}>第二步：选择统一赋予的权限</p>
          <Checkbox.Group
            value={batchSelectedPerms}
            onChange={(v) => setBatchSelectedPerms(v as number[])}
            style={{ width: '100%' }}
          >
            <Row gutter={[0, 8]}>
              {ALL_PERMISSIONS.map((p) => (
                <Col span={12} key={p.value}>
                  <Checkbox value={p.value}>{p.label}</Checkbox>
                </Col>
              ))}
            </Row>
          </Checkbox.Group>
        </div>
      </Modal>
    </Card>
  );
};

export default RoleManagePage;