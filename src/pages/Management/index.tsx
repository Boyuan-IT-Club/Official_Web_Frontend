// src/pages/Management/index.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Row, Col, Card, Tabs, Modal, message, Drawer, Descriptions, Tag, Avatar, Alert, Segmented } from 'antd';
import {
  TeamOutlined,
  LockOutlined,
  CheckOutlined,
  AppstoreOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';

import StatsCard from './components/StatsCard';
import Toolbar from './components/UserToolbar';
import UserTable, { User } from './components/UserTable';
import RoleManager from './components/RoleManager';
import DeptManage from './components/DeptManage';

// 导入API
import {
  getAllUsers,
  getUserStats,
  getActiveRoles,
  batchAdmitAsMember,
  exportUsersExcel,
} from '@/api/manage/userApis';

import { getToken, hasEffectiveJwtRoles } from '@/utils';
import { hasPermission } from '@/utils/jwt';


const { confirm } = Modal;

// ─── 类型 ─────────────────────────────────────────────────────────────────────

export interface RoleOption {
  value: string;
  label: string;
  color?: string;
}

// ─── 常量 ─────────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: '',       label: '全部状态' },
  { value: 'active', label: '正常'     },
  { value: 'frozen', label: '冻结'     },
];

// 当前招新周期 ID（与后端默认配置 cycleId 一致）

// ─── 防抖 Hook ────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ─── 页面组件 ─────────────────────────────────────────────────────────────────

const Management: React.FC = () => {
  const [activeTab, setActiveTab]             = useState('users');

  // ── 用户列表 ──────────────────────────────────────────────────────────────
  const [users, setUsers]     = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  // ── 统计数据（全量，仅用于 StatsCard，独立于分页列表） ─────────────────────
  const [stats, setStats] = useState({
    total: 0,
    frozen: 0,
    nonMember: 0,
    member: 0,
  });

  // ── 分页 ──────────────────────────────────────────────────────────────────
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal]       = useState(0);

  // ── Toolbar 状态 ──────────────────────────────────────────────────────────
  const [searchText, setSearchText]         = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedRole, setSelectedRole]     = useState('');
  const [selectedDept, setSelectedDept]     = useState('');
  // 用户分组：''=全部, admin=管理员, member=社员, nonmember=非社员
  const [selectedGroup, setSelectedGroup]   = useState('');
  const debouncedSearch = useDebounce(searchText);
  const debouncedDept   = useDebounce(selectedDept);

  // ── 选中行 / 角色 ─────────────────────────────────────────────────────────
  const [selectedRows, setSelectedRows] = useState<User[]>([]);
  const [roleOptions, setRoleOptions]   = useState<RoleOption[]>([]);

  // ── 简历 / 提示词 ─────────────────────────────────────────────────────────

  // ── 核心请求：分页列表 ────────────────────────────────────────────────────
  // 只读准入:管理员(ADMIN)角色只有 user:view,能读用户列表但一个写接口都调不动。
  // 后端是唯一权威(写接口仍要 admin:manage),这里收起入口只是免得点了才吃 403。
  const canManage = hasPermission(getToken(), 'admin:manage');
  // 角色管理的增删改查都要 role:assign,ADMIN 角色没有,不隐藏就是一个必然 403 的空 tab
  const canAssignRole = hasPermission(getToken(), 'role:assign');

  const fetchUsers = useCallback(async (
    currentPage: number,
    currentPageSize: number,
    keyword: string,
    status: string,
    role: string,
    dept: string,
    group: string,
  ) => {
    setLoading(true);
    try {
      const res: any = await getAllUsers({
        page:      String((currentPage - 1) * currentPageSize),
        pageSize:  String(currentPageSize),
        keyword:   keyword || undefined,
        status:    status  || undefined,
        role:      role    || undefined,
        dept:      dept.trim() || undefined,
        roleGroup: group   || undefined,
      });
      const data = res?.data;
      setUsers(data?.content ?? []);
      setTotal(data?.totalElements ?? 0);
    } catch (e) {
      console.error(e);
      message.error('获取用户列表失败');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── 统计卡片（全量，独立于分页列表与筛选） ──────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const res: any = await getUserStats();
      const d = res?.data;
      setStats({
        total:     Number(d?.total ?? 0),
        frozen:    Number(d?.frozen ?? 0),
        nonMember: Number(d?.nonMemberCount ?? 0),
        member:    Number(d?.memberCount ?? 0),
      });
    } catch (e) {
      console.error(e);
      // 统计失败不阻断列表
    }
  }, []);

  // ── 搜索/状态/分组变化 → 回到第 1 页 ──────────────────────────────────
  useEffect(() => {
    setPage(1);
    setSelectedRows([]);
    fetchUsers(1, pageSize, debouncedSearch, selectedStatus, selectedRole, debouncedDept, selectedGroup);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, selectedStatus, selectedRole, debouncedDept, selectedGroup]);

  // ── 翻页/改 pageSize ──────────────────────────────────────────────────────
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    fetchUsers(page, pageSize, debouncedSearch, selectedStatus, selectedRole, debouncedDept, selectedGroup);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  // ── 角色列表 ──────────────────────────────────────────────────────────────
  const fetchRoleOptions = async () => {
    try {
      const res: any = await getActiveRoles();
      const serverRoles = res?.data || res || [];
      // 后端 Role 字段为 roleId / roleName（兼容旧的 id / name）
      const options: RoleOption[] = (Array.isArray(serverRoles) ? serverRoles : [])
        .map(
          (r: any): RoleOption => ({
            value: String(r.roleId ?? r.id ?? ''),
            label: r.roleName ?? r.name ?? '',
          }),
        )
        .filter((o) => o.value && o.label);
      setRoleOptions(options);
    } catch (e) {
      console.error(e);
      message.error('获取角色列表失败');
    }
  };

  // 简历字段的加载/保存/重置已随「简历设置」Tab 移到「招募周期」
  // （CycleManage/ResumeFieldsDrawer），本页不再持有相关状态与函数。
  //
  // ⚠️ 上次移除 Tab 时只删了 useState 声明、漏删了这三个仍在调用它的函数，
  // 而挂载时的 useEffect 就会调其中之一，页面一进来就弹
  // "Can't find variable: setResumeFields"。
  // 教训：删状态要连着删它所有的读写方——按变量名 grep 计数会漏掉 setXxx 这种派生标识符。

  // ── 初始化 ────────────────────────────────────────────────────────────────
  // 注：管理端准入已由 AdminGuard 按 JWT permissionCodes 把关，无需在此重复告警
  useEffect(() => {
    fetchRoleOptions();
    fetchStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 翻页回调 ──────────────────────────────────────────────────────────────
  const handlePageChange = (newPage: number, newPageSize: number) => {
    setSelectedRows([]);
    setPageSize(newPageSize);
    setPage(newPage);
  };

  // ── 批量录取为社员 ────────────────────────────────────────────────────────
  const handleBatchAdmit = () => {
    const targets = selectedRows.filter((u) => !u.isMember);
    if (targets.length === 0) {
      message.warning('所选用户均已是社员，无需重复操作');
      return;
    }
    confirm({
      title: '确认批量录取为社员？',
      icon: <ExclamationCircleOutlined />,
      content: (
        <span>
          将 <b>{targets.length}</b> 名用户录取为社员，此操作不可撤销，是否继续？
        </span>
      ),
      okText: '确认录取',
      cancelText: '取消',
      async onOk() {
        try {
          await batchAdmitAsMember(true, targets.map((u) => u.userId));
          message.success(`成功录取 ${targets.length} 名社员`);
          setSelectedRows([]);
          fetchUsers(page, pageSize, debouncedSearch, selectedStatus, selectedRole, debouncedDept, selectedGroup);
        } catch (e) {
          console.error(e);
          message.error('批量录取失败，请稍后重试');
        }
      },
    });
  };

  // ── 查看详情 ──────────────────────────────────────────────────────────────
  const [viewUser, setViewUser] = useState<User | null>(null);
  const handleViewUser = (user: User) => setViewUser(user);

  // ─── 渲染 ─────────────────────────────────────────────────────────────────
  return (
    <div className="management-page">
      {/* 统计卡片 */}
      <Row gutter={[24, 24]} className="stats-row">
        <Col xs={24} sm={12} md={6}>
          <StatsCard
            icon={<TeamOutlined style={{ fontSize: 24 }} />}
            value={stats.total}
            title="总用户数"
            bgColor="rgba(77,166,255,0.1)"
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatsCard
            icon={<LockOutlined style={{ fontSize: 24 }} />}
            value={stats.frozen}
            title="冻结账户"
            bgColor="rgba(255,77,79,0.1)"
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatsCard
            icon={<CheckOutlined style={{ fontSize: 24 }} />}
            value={stats.nonMember}
            title="非社员/待审核"
            bgColor="rgba(82,196,26,0.1)"
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatsCard
            icon={<AppstoreOutlined style={{ fontSize: 24 }} />}
            value={stats.member}
            title="社员人数"
            bgColor="rgba(250,140,22,0.1)"
          />
        </Col>
      </Row>

      <Card className="main-card">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          tabBarExtraContent={{
            right: (
              <a
                onClick={async (e) => {
                  e.preventDefault();
                  try {
                    const res: any = await exportUsersExcel();
                    const blob = new Blob([res.data ?? res], {
                      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `用户列表_${new Date().toISOString().slice(0, 10)}.xlsx`;
                    a.click();
                    URL.revokeObjectURL(url);
                  } catch (err: any) {
                    message.error(err?.message || '导出失败');
                  }
                }}
              >
                导出用户 Excel
              </a>
            ),
          }}
          items={[
            {
              key: 'users',
              label: '用户管理',
              children: (
                <>
                  {!canManage && (
                    <Alert
                      type="info"
                      showIcon
                      style={{ marginBottom: 12 }}
                      message="只读模式"
                      description="当前账号具有查看用户信息的权限,但不能执行录取、分配部门、冻结、删除等操作。需要这些操作请联系超级管理员。"
                    />
                  )}
                  <div style={{ marginBottom: 12 }}>
                    <Segmented
                      value={selectedGroup}
                      onChange={(v) => setSelectedGroup(String(v))}
                      options={[
                        { label: '全部', value: '' },
                        { label: '管理员', value: 'admin' },
                        { label: '社员', value: 'member' },
                        { label: '非社员', value: 'nonmember' },
                      ]}
                    />
                  </div>
                  <Toolbar
                    searchText={searchText}
                    onSearchChange={setSearchText}
                    selectedStatus={selectedStatus}
                    selectedRole={selectedRole}
                    onRoleChange={setSelectedRole}
                    selectedDept={selectedDept}
                    onDeptChange={setSelectedDept}
                    onStatusChange={setSelectedStatus}
                    statusOptions={STATUS_OPTIONS}
                    selectedRowsCount={selectedRows.length}
                    selectedRows={selectedRows}
                    selectedRowIds={selectedRows.map((u) => u.userId)}
                    onClearSelection={() => setSelectedRows([])}
                    roleOptions={roleOptions}
                    refreshUsers={() => fetchUsers(page, pageSize, debouncedSearch, selectedStatus, selectedRole, debouncedDept, selectedGroup)}
                    canManage={canManage}
                  />
                  <UserTable
                    users={users}
                    loading={loading}
                    roleOptions={roleOptions}
                    selectedRows={selectedRows}
                    onSelectionChange={setSelectedRows}
                    onView={handleViewUser}
                    refreshUsers={() => fetchUsers(page, pageSize, debouncedSearch, selectedStatus, selectedRole, debouncedDept, selectedGroup)}
                    canManage={canManage}
                    pagination={{
                      current: page,
                      pageSize,
                      total,
                      onChange: handlePageChange,
                    }}
                  />
                </>
              ),
            },
            // 角色管理整块要 role:assign;只读管理员没有,挂出来点进去只会看到一片
            // 加载失败,所以直接不给这个 tab
            ...(canAssignRole ? [{
              key: 'roles',
              label: '角色管理',
              children: <RoleManager />,
            }] : []),
            // 「简历设置」Tab 已移出本页：简历字段是按周期定义的
            // （resume_field_definition.cycle_id），与用户/角色无关；而且这里写死了
            // cycleId 常量，导致新建周期后无法配置其字段。现入口在
            // 「招募周期」列表每一行的「简历字段」按钮，见 CycleManage/ResumeFieldsDrawer。
            //
            // 同一 Tab 下的「报名提示」面板没有一起搬：它的 prompts 是纯本地 state
            // （从不读写后端），改完刷新即丢，属于未完成功能，先不挂出来误导人。
            {
              key: 'dept',
              label: '部门管理',
              children: <DeptManage />,
            },
          ]}
        />
      </Card>

      {/* 用户详情抽屉 */}
      <Drawer
        title="用户详情"
        width={420}
        open={!!viewUser}
        onClose={() => setViewUser(null)}
      >
        {viewUser && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="头像/昵称">
              <Avatar size="small" style={{ backgroundColor: '#4da6ff', marginRight: 8 }}>
                {(viewUser.name || viewUser.username || '?').slice(0, 1)}
              </Avatar>
              {viewUser.name || '未填写'}
            </Descriptions.Item>
            <Descriptions.Item label="用户名/学号">{viewUser.username}</Descriptions.Item>
            <Descriptions.Item label="用户ID">{viewUser.userId}</Descriptions.Item>
            <Descriptions.Item label="邮箱">{viewUser.email || '未填写'}</Descriptions.Item>
            <Descriptions.Item label="手机号">{viewUser.phone || '未填写'}</Descriptions.Item>
            <Descriptions.Item label="角色">
              {(() => {
                const names = ((viewUser as any).roles ?? [])
                  .map((r: any) => r?.roleName)
                  .filter(Boolean);
                return names.length > 0
                  ? names.map((n: string) => <Tag color="geekblue" key={n}>{n}</Tag>)
                  : <Tag>暂无角色</Tag>;
              })()}
            </Descriptions.Item>
            <Descriptions.Item label="社员身份">
              {viewUser.isMember
                ? <Tag color="blue">{viewUser.dept ? `社员 · ${viewUser.dept}` : '社员'}</Tag>
                : <Tag>非社员</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="账户状态">
              {viewUser.status ? <Tag color="green">正常</Tag> : <Tag color="red">已冻结</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="注册时间">{viewUser.createTime || '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
};

export default Management;
