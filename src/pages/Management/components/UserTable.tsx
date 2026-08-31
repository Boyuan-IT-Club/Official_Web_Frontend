// src/pages/components/UserTable.tsx
import React from 'react';
import {
  Table, Space, Button, Tooltip, Tag, Avatar, Modal, Select, message, Dropdown,
} from 'antd';
import {
  EyeOutlined, LockOutlined, UnlockOutlined,
  UserOutlined, ExclamationCircleOutlined, DeleteOutlined, MoreOutlined, TeamOutlined,
} from '@ant-design/icons';

import {
  replaceUserRoles, removeRoleFromUser, freezeUser, unfreezeUser, deleteUser,
  batchUpdateUserDept,
} from '@/api/manage/userApis';
import { getValidDept } from '@/api/manage/deptManage';

const { Option } = Select;
const { confirm } = Modal;

// ─── 类型 ────────────────────────────────────────────────────────────────────

export interface User {
  createTime: string;
  dept: null | string;
  email: string;
  isMember: boolean;
  name: null | string;
  // password 不在这里：接口已用 @JsonProperty(WRITE_ONLY) 停止下发密码哈希,
  // 留着这个字段会让人以为响应里还有它
  phone: null | string;
  role: string;
  status: boolean;   // True = 正常，False = 冻结
  userId: number;
  username: string;
  [property: string]: any;
}

interface RoleOption {
  value: string;
  label: string;
  color?: string;
}

interface UserTableProps {
  users: User[];
  loading: boolean;
  roleOptions: RoleOption[];
  selectedRows: User[];
  onSelectionChange: (selected: User[]) => void;
  onView: (user: User) => void;
  refreshUsers: () => void;
  /** 是否持有 admin:manage。false 时只保留「查看详情」,并去掉勾选框 */
  canManage?: boolean;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
}

// ─── 组件 ────────────────────────────────────────────────────────────────────

const UserTable: React.FC<UserTableProps> = ({
  users, loading, roleOptions,
  selectedRows, onSelectionChange,
  onView, refreshUsers, pagination,
  canManage = true,
}) => {
  // ── 角色管理弹窗（从「更多」菜单进入；多选，保存时整体替换，可增可减） ──
  const [roleModalUser, setRoleModalUser] = React.useState<User | null>(null);
  const [roleModalValues, setRoleModalValues] = React.useState<string[]>([]);
  const [roleSaving, setRoleSaving] = React.useState(false);

  /** 取用户当前的 RBAC 角色名列表（后端 /api/admin/users 已填充 roles） */
  const getUserRoleNames = (user: User): string[] => {
    const roles = (user as any).roles;
    if (Array.isArray(roles) && roles.length > 0) {
      return roles.map((r: any) => r?.roleName).filter(Boolean);
    }
    return [];
  };

  const getUserRoleIds = (user: User): string[] => {
    const roles = (user as any).roles;
    if (!Array.isArray(roles)) return [];
    return roles.map((r: any) => r?.roleId).filter((v: any) => v != null).map(String);
  };

  const openRoleModal = (user: User) => {
    setRoleModalValues(getUserRoleIds(user));
    setRoleModalUser(user);
  };

  const handleSaveRoles = async () => {
    if (!roleModalUser) return;
    const displayName = roleModalUser.name || roleModalUser.username;
    setRoleSaving(true);
    try {
      if (roleModalValues.length > 0) {
        // 替换语义：后端先删旧再插新，一次调用完成增删
        await replaceUserRoles(roleModalUser.userId, roleModalValues.map(Number));
      } else {
        // 清空所有角色：替换接口不接受空列表，逐个删除
        const currentIds = getUserRoleIds(roleModalUser).map(Number);
        for (const rid of currentIds) {
          await removeRoleFromUser(roleModalUser.userId, rid);
        }
      }
      message.success(`${displayName} 的角色已更新`);
      setRoleModalUser(null);
      refreshUsers();
    } catch (e) {
      console.error(e);
      message.error('保存角色失败');
    } finally {
      setRoleSaving(false);
    }
  };

  // ── 分配部门弹窗 ──
  const [deptModalUser, setDeptModalUser] = React.useState<User | null>(null);
  const [deptModalValue, setDeptModalValue] = React.useState<string | undefined>();
  const [deptOptions, setDeptOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [deptSaving, setDeptSaving] = React.useState(false);

  const openDeptModal = async (user: User) => {
    setDeptModalValue(user.dept || undefined);
    setDeptModalUser(user);
    if (deptOptions.length === 0) {
      try {
        const res: any = await getValidDept();
        setDeptOptions(
          (res?.data ?? []).map((d: any) => ({ value: d.deptName, label: d.deptName })),
        );
      } catch (e) {
        console.error(e);
        message.error('加载部门列表失败');
      }
    }
  };

  /** 取消分配：后端按「dept 键存在但为 null」识别为清空 */
  const handleClearDept = async () => {
    if (!deptModalUser) return;
    setDeptSaving(true);
    try {
      await batchUpdateUserDept([deptModalUser.userId], null);
      message.success(`已取消 ${deptModalUser.name || deptModalUser.username} 的部门分配`);
      setDeptModalUser(null);
      refreshUsers();
    } catch (e) {
      console.error(e);
      message.error('取消分配失败');
    } finally {
      setDeptSaving(false);
    }
  };

  const handleAssignDept = async () => {
    if (!deptModalUser || !deptModalValue) return;
    setDeptSaving(true);
    try {
      await batchUpdateUserDept([deptModalUser.userId], deptModalValue);
      message.success(`${deptModalUser.name || deptModalUser.username} 的部门已更新为 ${deptModalValue}`);
      setDeptModalUser(null);
      refreshUsers();
    } catch (e) {
      console.error(e);
      message.error('分配部门失败');
    } finally {
      setDeptSaving(false);
    }
  };

  /** 冻结 / 解冻 */
  const handleToggleFreeze = (user: User) => {
    const isFrozen = user.status === false;
    confirm({
      title: isFrozen ? '确认解冻该用户？' : '确认冻结该用户？',
      icon: <ExclamationCircleOutlined />,
      content: <span>用户：<b>{user.name || user.username}</b>（{user.username}）</span>,
      okText: isFrozen ? '解冻' : '冻结',
      okType: isFrozen ? 'primary' : 'danger',
      cancelText: '取消',
      async onOk() {
        try {
          isFrozen ? await unfreezeUser(user.userId) : await freezeUser(user.userId);
          message.success(`${user.name || user.username} 操作成功`);
          refreshUsers();
        } catch (e) {
          console.error(e);
          message.error('操作失败，请稍后重试');
        }
      },
    });
  };

  /** 删除用户 */
  const handleDelete = (user: User) => {
    confirm({
      title: '确认删除该用户？',
      icon: <ExclamationCircleOutlined />,
      content: <span>此操作不可恢复，确认删除 <b>{user.name || user.username}</b> 吗？</span>,
      okText: '删除', okType: 'danger', cancelText: '取消',
      async onOk() {
        try {
          await deleteUser(user.userId);
          message.success('删除成功');
          refreshUsers();
        } catch (e) {
          console.error(e);
          message.error('删除失败，请稍后重试');
        }
      },
    });
  };

  // ─── 列定义 ───────────────────────────────────────────────────────────────

  const columns = [
    {
      title: '用户信息',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: User) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {/* 之前这里写死了通用人形图标、根本没传 src —— 所有人的头像都显示不出来。
              src 取后端解析好的地址（COS 直链或 /api/files/...）；
              加载失败时 antd 自动回落到 icon，历史遗留的 /uploads/... 死链
              因此只会退回图标，不会显示裂图。 */}
          <Avatar
            src={record.avatar || undefined}
            icon={<UserOutlined />}
            style={{ backgroundColor: '#4da6ff', flexShrink: 0 }}
          />
          <div style={{ marginLeft: 12 }}>
            <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center' }}>
              {text || record.username || '未知昵称'}
              {record.status === false && (
                <Tooltip title="账户已冻结">
                  <LockOutlined style={{ color: '#ff4d4f', marginLeft: 4, fontSize: 12 }} />
                </Tooltip>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>{record.username}</div>
          </div>
        </div>
      ),
    },
    {
      title: '角色',
      key: 'role',
      render: (_: any, record: User) => {
        const names = getUserRoleNames(record);
        if (names.length === 0) return <Tag>暂无角色</Tag>;
        return (
          <Space size={4} wrap>
            {names.map((n) => <Tag color="geekblue" key={n}>{n}</Tag>)}
          </Space>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: boolean) => (
        <Tag color={status ? 'green' : 'red'}>{status ? '正常' : '冻结'}</Tag>
      ),
    },
    {
      title: '部门',
      key: 'memberDept',
      render: (_: any, record: User) => {
        if (!record.isMember) {
          return <Tag color="default">非社员</Tag>;
        }
        return record.dept
          ? <Tag color="blue" style={{ borderRadius: 4 }}>{record.dept}</Tag>
          : <Tag color="blue">社员</Tag>;
      },
    },
    {
      title: '联系方式',
      key: 'contact',
      render: (_: any, record: User) => (
        <div>
          <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 2 }}>
            {record.phone || '暂无手机'}
          </div>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>
            {record.email || '暂无邮箱'}
          </div>
        </div>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: User) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button type="text" icon={<EyeOutlined />} size="small" onClick={() => onView(record)} />
          </Tooltip>
          {/* 冻结/删除等危险操作收进「更多」菜单，避免误触。
              只读角色(仅 user:view)不渲染「更多」,只留查看详情 */}
          {canManage && <Dropdown
            trigger={['click']}
            menu={{
              items: [
                {
                  key: 'assign-role',
                  icon: <UserOutlined />,
                  label: '角色管理',
                },
                {
                  key: 'assign-dept',
                  icon: <TeamOutlined />,
                  label: '分配部门',
                },
                {
                  key: 'freeze',
                  icon: record.status === false ? <UnlockOutlined /> : <LockOutlined />,
                  label: record.status === false ? '解冻账户' : '冻结账户',
                },
                { type: 'divider' },
                {
                  key: 'delete',
                  icon: <DeleteOutlined />,
                  label: '删除用户',
                  danger: true,
                },
              ],
              onClick: ({ key }) => {
                if (key === 'assign-role') openRoleModal(record);
                if (key === 'assign-dept') openDeptModal(record);
                if (key === 'freeze') handleToggleFreeze(record);
                if (key === 'delete') handleDelete(record);
              },
            }}
          >
            <Button type="text" icon={<MoreOutlined />} size="small" />
          </Dropdown>}
        </Space>
      ),
    },
  ];

  // ─── 渲染 ─────────────────────────────────────────────────────────────────

  return (
    <>
    <Modal
      title={roleModalUser ? `角色管理：${roleModalUser.name || roleModalUser.username}` : ''}
      open={!!roleModalUser}
      onOk={handleSaveRoles}
      confirmLoading={roleSaving}
      onCancel={() => setRoleModalUser(null)}
      destroyOnClose
    >
      <div style={{ marginBottom: 8, color: '#8c8c8c', fontSize: 12 }}>
        勾选即持有、取消勾选即移除，保存后整体生效（权限为所选角色的并集）。
        「社员」由部门分配自动管理（分配部门即录取、取消分配即移除），这里不可手选。
      </div>
      <Select
        mode="multiple"
        style={{ width: '100%' }}
        placeholder="不选择任何角色 = 清空该用户的全部角色"
        value={roleModalValues}
        onChange={setRoleModalValues}
        optionFilterProp="children"
      >
        {roleOptions.map((r) => (
          <Option key={r.value} value={r.value} disabled={r.label === '社员'}>
            {r.label}{r.label === '社员' ? '（随部门分配自动管理）' : ''}
          </Option>
        ))}
      </Select>
    </Modal>
    <Modal
      title={deptModalUser ? `分配部门：${deptModalUser.name || deptModalUser.username}` : ''}
      open={!!deptModalUser}
      onOk={handleAssignDept}
      okButtonProps={{ disabled: !deptModalValue || deptModalValue === deptModalUser?.dept }}
      okText="保存"
      confirmLoading={deptSaving}
      onCancel={() => setDeptModalUser(null)}
      destroyOnClose
      /* 取消分配放在左下角：它是反向操作，不该和「保存」并排抢位置；
         只有当前确实分了部门才出现，没分的时候这个按钮没有意义。 */
      footer={(_, { OkBtn, CancelBtn }) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {deptModalUser?.dept && (
            <Button danger type="text" loading={deptSaving} onClick={handleClearDept}>
              取消分配
            </Button>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <CancelBtn />
            <OkBtn />
          </div>
        </div>
      )}
    >
      <Select
        style={{ width: '100%' }}
        placeholder="选择部门"
        value={deptModalValue}
        onChange={setDeptModalValue}
        options={deptOptions}
        allowClear
        onClear={() => setDeptModalValue(undefined)}
      />
      {deptModalUser?.dept && (
        <div style={{ marginTop: 8, fontSize: 12, color: '#8c8c8c' }}>
          当前部门：{deptModalUser.dept}
        </div>
      )}
    </Modal>
    <Table<User>
      rowSelection={canManage ? {
        selectedRowKeys: selectedRows.map((u) => u.userId),
        onChange: (_: React.Key[], rows: User[]) => onSelectionChange(rows),
      } : undefined}
      columns={columns}
      dataSource={[...users].sort((a, b) => {
        // 有角色的用户排前面（角色多者优先），无角色的排后面
        const ra = ((a as any).roles?.length ?? 0);
        const rb = ((b as any).roles?.length ?? 0);
        if (ra !== rb) return rb - ra;
        return (a.userId ?? 0) - (b.userId ?? 0);
      })}
      rowKey="userId"
      loading={loading}
      pagination={{
        current:         pagination.current,
        pageSize:        pagination.pageSize,
        total:           pagination.total,
        onChange:        pagination.onChange,
        showSizeChanger: true,
        pageSizeOptions: ['10', '20', '50'],
        showTotal:       (t) => `共 ${t} 条数据`,
      }}
      locale={{ emptyText: '暂无用户数据' }}
      scroll={{ x: 'max-content' }}
    />
    </>
  );
};

export default UserTable;