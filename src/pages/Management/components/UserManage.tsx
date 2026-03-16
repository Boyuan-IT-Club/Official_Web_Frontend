// src/pages/UserManagePage.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Card, Modal, message } from 'antd';

import Toolbar from './UserToolbar';
import UserTable, { User } from './UserTable';
import { getAllUsers } from '@/api/manage/userApis';

// ─── 常量 ────────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: '',       label: '全部状态' },
  { value: 'active', label: '正常'     },
  { value: 'frozen', label: '冻结'     },
];

const ROLE_OPTIONS = [
  { value: '1', label: '管理员'   },
  { value: '2', label: '普通用户' },
  { value: '3', label: '社员'     },
];

// ─── 防抖 ────────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ─── 组件 ────────────────────────────────────────────────────────────────────

const UserManagePage: React.FC = () => {
  const [users, setUsers]     = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal]       = useState(0);

  const [searchText, setSearchText]         = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const debouncedSearch = useDebounce(searchText);

  const [selectedRows, setSelectedRows] = useState<User[]>([]);

  // ── 核心请求 ──────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async (
    currentPage: number,
    currentPageSize: number,
    keyword: string,
    status: string,
  ) => {
    setLoading(true);
    try {
      const res: any = await getAllUsers({
        page: String(currentPage),
        pageSize: String(currentPageSize),
        status: status || undefined,
      });
      setUsers(res?.data?.content ?? []);
      setTotal(res?.data?.totalElements ?? 0);
    } catch (e) {
      console.error(e);
      message.error('获取用户列表失败');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    setSelectedRows([]);
    fetchUsers(1, pageSize, debouncedSearch, selectedStatus);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, selectedStatus]);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    fetchUsers(page, pageSize, debouncedSearch, selectedStatus);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  const handlePageChange = (newPage: number, newPageSize: number) => {
    setSelectedRows([]);
    setPageSize(newPageSize);
    setPage(newPage);
  };

  const handleView = (user: User) => {
    console.log('查看用户', user);
  };

  const refresh = () => fetchUsers(page, pageSize, debouncedSearch, selectedStatus);

  // ─── 渲染 ─────────────────────────────────────────────────────────────────
  return (
    <Card title="用户管理" styles={{ body: { padding: '16px 24px' } }}>
      <Toolbar
        searchText={searchText}
        onSearchChange={setSearchText}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        statusOptions={STATUS_OPTIONS}
        selectedRowIds={selectedRows.map((u) => u.userId)}
        selectedRowsCount={selectedRows.length}
        roleOptions={ROLE_OPTIONS}
        onClearSelection={() => setSelectedRows([])}
        refreshUsers={refresh}
      />

      <div style={{ marginTop: 16 }}>
        <UserTable
          users={users}
          loading={loading}
          roleOptions={ROLE_OPTIONS}
          selectedRows={selectedRows}
          onSelectionChange={setSelectedRows}
          onView={handleView}
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