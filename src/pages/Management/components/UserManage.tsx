// src/pages/UserManagePage.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Card, message } from 'antd';

import Toolbar from './UserToolbar';
import UserTable, { User } from './UserTable';
import { getAllUsers, getActiveRoles, globalSearch } from '@/api/manage/userApis';

// ─── 类型 ────────────────────────────────────────────────────────────────────

export interface RoleOption {
  value: string;
  label: string;
  color?: string;
}

// ─── 防抖 ────────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ─── 常量 ────────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: '',       label: '全部状态' },
  { value: 'active', label: '正常'     },
  { value: 'frozen', label: '冻结'     },
];

// ─── 组件 ────────────────────────────────────────────────────────────────────

const UserManagePage: React.FC = () => {
  const [users, setUsers]     = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  // ── 分页 ──────────────────────────────────────────────────────────────────
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal]       = useState(0);

  // ── 筛选 / 搜索状态 ───────────────────────────────────────────────────────
  const [searchText, setSearchText]         = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedRole, setSelectedRole]     = useState('');
  const [selectedDept, setSelectedDept]     = useState('');

  const debouncedSearch = useDebounce(searchText);
  const debouncedDept   = useDebounce(selectedDept);

  // ── 选中行 & 角色选项 ─────────────────────────────────────────────────────
  const [selectedRows, setSelectedRows] = useState<User[]>([]);
  const [roleOptions, setRoleOptions]   = useState<RoleOption[]>([]);

  // ── 核心请求 ──────────────────────────────────────────────────────────────
  // 有 keyword → globalSearch（姓名/学号）+ 筛选条件
  // 无 keyword → getAllUsers（纯筛选）
  const fetchUsers = useCallback(async (
    currentPage: number,
    currentPageSize: number,
    keyword: string,
    status: string,
    role: string,
    dept: string,
  ) => {
    setLoading(true);
    try {
      let res: any;

      if (keyword.trim()) {
        // 有关键词 → 全局搜索，同时带上筛选条件
        res = await globalSearch({
          keyword:  keyword.trim(),
          page:     currentPage - 1,        // 0-based
          size:     currentPageSize,
          status:   status       || undefined,
          role:     role         || undefined,
          dept:     dept.trim()  || undefined,
        });
      } else {
        // 无关键词 → 普通列表，带筛选条件
        res = await getAllUsers({
          page:     String(currentPage - 1), // 0-based
          pageSize: String(currentPageSize),
          status:   status       || undefined,
          role:     role         || undefined,
          dept:     dept.trim()  || undefined,
        });
      }

      setUsers(res?.data?.content       ?? []);
      setTotal(res?.data?.totalElements ?? 0);
    } catch (e) {
      console.error(e);
      message.error('获取用户列表失败');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── 筛选/搜索变化 → 回到第 1 页 ──────────────────────────────────────────
  useEffect(() => {
    setPage(1);
    setSelectedRows([]);
    fetchUsers(1, pageSize, debouncedSearch, selectedStatus, selectedRole, debouncedDept);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, selectedStatus, selectedRole, debouncedDept]);

  // ── 翻页 / 改 pageSize ────────────────────────────────────────────────────
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    fetchUsers(page, pageSize, debouncedSearch, selectedStatus, selectedRole, debouncedDept);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  // ── 角色选项 ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchRoleOptions = async () => {
      try {
        const res: any = await getActiveRoles();
        const list = res?.data || res || [];
        setRoleOptions(
          (Array.isArray(list) ? list : []).map((r: any): RoleOption => ({
            value: String(r.id),
            label: r.name,
          })),
        );
      } catch (e) {
        console.error(e);
        message.error('获取角色列表失败');
      }
    };
    fetchRoleOptions();
  }, []);

  // ── 翻页回调 ──────────────────────────────────────────────────────────────
  const handlePageChange = (newPage: number, newPageSize: number) => {
    setSelectedRows([]);
    setPage(newPage);
    setPageSize(newPageSize);
  };

  const refresh = () =>
    fetchUsers(page, pageSize, debouncedSearch, selectedStatus, selectedRole, debouncedDept);

  // ─── 渲染 ─────────────────────────────────────────────────────────────────
  return (
    <Card title="用户管理" styles={{ body: { padding: '16px 24px' } }}>
      <Toolbar
        searchText={searchText}
        onSearchChange={setSearchText}

        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        statusOptions={STATUS_OPTIONS}

        selectedRole={selectedRole}
        onRoleChange={setSelectedRole}

        selectedDept={selectedDept}
        onDeptChange={setSelectedDept}

        roleOptions={roleOptions}
        selectedRowIds={selectedRows.map((u) => u.userId)}
        selectedRowsCount={selectedRows.length}
        selectedRows={selectedRows}
        onClearSelection={() => setSelectedRows([])}
        refreshUsers={refresh}
      />

      <div style={{ marginTop: 16 }}>
        <UserTable
          users={users}
          loading={loading}
          roleOptions={roleOptions}
          selectedRows={selectedRows}
          onSelectionChange={setSelectedRows}
          onView={(user) => console.log('查看用户详情', user)}
          refreshUsers={refresh}
          pagination={{
            current: page,
            pageSize,
            total,
            onChange: handlePageChange,
          }}
        />
      </div>
    </Card>
  );
};

export default UserManagePage;