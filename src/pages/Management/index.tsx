// src/pages/index.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Row, Col, Card, Tabs, Modal, message } from 'antd';
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
import ResumeFieldPanel from './components/ResumeFieldPanel';
import RoleManager from './components/RoleManager';
import PromptPanel from './components/PromptPanel';
import DeptManage from './components/DeptManage'

// 导入API
import {
  getAllUsers,
  getActiveRoles,
  batchAdmitAsMember,
} from '@/api/manage/userApis';

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
  const [activeConfigTab, setActiveConfigTab] = useState('resume');

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

  //  分页 ──────────────────────────────────────────────────────────────────
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal]       = useState(0);

  // ── Toolbar 状态 ──────────────────────────────────────────────────────────
const [searchText, setSearchText]         = useState('');
const [selectedStatus, setSelectedStatus] = useState('');
const [selectedRole, setSelectedRole]     = useState(''); 
const [selectedDept, setSelectedDept]     = useState('');   
const debouncedSearch = useDebounce(searchText);
const debouncedDept   = useDebounce(selectedDept);          

  // ── 选中行 / 角色 ─────────────────────────────────────────────────────────
  const [selectedRows, setSelectedRows] = useState<User[]>([]);
  const [roleOptions, setRoleOptions]   = useState<RoleOption[]>([]);

  // ── 简历 / 提示词（保持原有结构） ─────────────────────────────────────────
  const [resumeFields, setResumeFields] = useState<any[]>([]);
  const [formPrompts, setFormPrompts]   = useState<any[]>([]);

  // ── 核心请求：分页列表 ────────────────────────────────────────────────────
  const fetchUsers = useCallback(async (
    currentPage: number,
    currentPageSize: number,
    keyword: string,
    status: string,
    role: string,
    dept: string
  ) => {
    setLoading(true);
    try {
      const res: any = await getAllUsers({
        page: String((currentPage-1)* currentPageSize),      
        pageSize: String(currentPageSize), 
        keyword: keyword || undefined,
        status: status || undefined,
        role: role || undefined, 
        dept:dept.trim() || undefined,  
      });
      const data = res?.data;
      setUsers(res?.data?.content ?? []);     
      setTotal(res?.data?.totalElements ?? 0);

      // 利用首次请求或全量数据更新统计卡片
      // 如果后端有专门的统计接口，可以替换这里
      if (currentPage === 1 && !keyword && !status) {
        setStats({
          total:     data?.totalElements  ?? 0,
          frozen:    data?.frozenCount  ?? 0,  // 若后端有额外字段则直接用
          nonMember: data?.nonMemberCount ?? 0,
          member:    data?.memberCount  ?? 0,
        });
      }
    } catch (e) {
      console.error(e);
      message.error('获取用户列表失败');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── 搜索/状态变化 → 回到第 1 页 ──────────────────────────────────────────
  useEffect(() => {
    setPage(1);
    setSelectedRows([]);
  // FIXME 太复杂了，准备封装一下
    fetchUsers(1, pageSize, debouncedSearch, selectedStatus,selectedRole,debouncedDept);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, selectedStatus, selectedRole, debouncedDept]);

  // ── 翻页/改 pageSize（跳过首次渲染，避免与上面 effect 重复请求） ──────────
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    fetchUsers(page, pageSize, debouncedSearch, selectedStatus,selectedRole,debouncedDept);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  // ── 角色列表 ──────────────────────────────────────────────────────────────
  const fetchRoleOptions = async () => {
    try {
      const res: any = await getActiveRoles();
      const serverRoles = res?.data || res || [];
      const options: RoleOption[] = (Array.isArray(serverRoles) ? serverRoles : []).map(
        (r: any): RoleOption => ({
          value: String(r.id),
          label: r.name,
        }),
      );
      setRoleOptions(options);
    } catch (e) {
      console.error(e);
      message.error('获取角色列表失败');
    }
  };

  useEffect(() => {
    fetchRoleOptions();
    fetchResumeFields(); // 初始化时获取简历字段
  }, [fetchResumeFields]);

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
          fetchUsers(page, pageSize, debouncedSearch, selectedStatus,selectedRole,debouncedDept);
        } catch (e) {
          console.error(e);
          message.error('批量录取失败，请稍后重试');
        }
      },
    });
  };

  // ── 查看详情 ──────────────────────────────────────────────────────────────
  const handleViewUser = (user: User) => {
    // TODO: 打开详情 Drawer / Modal
    console.log('查看用户详情', user);
  };

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
          items={[
            {
              key: 'users',
              label: '用户管理',
              children: (
                <>
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
                    refreshUsers={() => fetchUsers(page, pageSize, debouncedSearch, selectedStatus,selectedRole,debouncedDept)}
                  />
                  <UserTable
                    users={users}
                    loading={loading}
                    roleOptions={roleOptions}
                    selectedRows={selectedRows}
                    onSelectionChange={setSelectedRows}
                    onView={handleViewUser}
                    refreshUsers={() => fetchUsers(page, pageSize, debouncedSearch, selectedStatus,selectedRole,debouncedDept)}
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
            {
              key: 'roles',
              label: '角色管理',
              children: <RoleManager />,
            },
            {
              key: 'resume',
              label: '简历设置',
              children: (
                <Tabs
                  activeKey={activeConfigTab}
                  onChange={setActiveConfigTab}
                  items={[
                    {
                      key: 'resume',
                      label: '简历字段',
                      children: (
                        <ResumeFieldPanel
                          cycleId={CURRENT_CYCLE_ID}
                          fields={resumeFields}
                          onSave={handleSaveResumeFields}
                          onFieldsChange={setResumeFields}
                          onResetToDefault={handleResetToDefault}
                          fieldTypeOptions={[
                            { value: 'input',    label: '文本框'   },
                            { value: 'textarea', label: '多行文本' },
                            { value: 'radio',    label: '单选'     },
                            { value: 'checkbox', label: '多选'     },
                            { value: 'select',   label: '下拉选择' },
                            { value: 'custom',   label: '照片'     },
                          ]}
                        />
                      ),
                    },
                    {
                      key: 'prompt',
                      label: '报名提示',
                      children: (
                        <PromptPanel
                          prompts={formPrompts}
                          onSave={setFormPrompts}
                        />
                      ),
                    },
                  ]}
                />
              ),
            },
            {
              key: 'dept',
              label: '部门管理',
              children: <DeptManage />,
            }
          ]}
        />
      </Card>
    </div>
  );
};

export default Management;