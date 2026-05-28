// src/pages/UserManagePage.tsx
// NOTE 用户管理板块的父组件
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

const mapStatusToApiString = (status: string): string | undefined => {
  switch (status) {
    case 'active': return 'true';  // 正常 
    case 'frozen': return 'false';   // 冻结
    default: return undefined;      // 全部状态 -> undefined
  }
};

// ─── 组件 ────────────────────────────────────────────────────────────────────

const UserManagePage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  // ── 分页状态 ──────────────────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // ── 筛选 / 搜索状态 ───────────────────────────────────────────────────────
  const [searchText, setSearchText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedDept, setSelectedDept] = useState('');

  const debouncedSearch = useDebounce(searchText);
  const debouncedDept = useDebounce(selectedDept);

  // ── 选中行 & 角色选项 ─────────────────────────────────────────────────────
  const [selectedRows, setSelectedRows] = useState<User[]>([]);
  const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]);

  // ── 统一的筛选参数 ────────────────────────────────────────────────────────
  const filterParams = useMemo(() => {
    const apiStatus = mapStatusToApiString(selectedStatus);
    return {
      keyword: debouncedSearch?.trim() || undefined,
      status: apiStatus || undefined,
      role: selectedRole || undefined,
      dept: debouncedDept?.trim() || undefined,
    };
  }, [debouncedSearch, selectedStatus, selectedRole, debouncedDept]);

  // ── 核心请求函数 ──────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async (
    currentPage: number,
    currentPageSize: number,
    filters: typeof filterParams
  ) => {
    console.log("fetchUsers 被调用", { 
      currentPage, 
      currentPageSize, 
      filters 
    });
    
    setLoading(true);
    try {
      let res: any;
      
      if (filters.keyword) {
        // 有关键词 → 全局搜索
        res = await globalSearch({
          keyword: filters.keyword,
          page: currentPage - 1,  // 0-based
          size: currentPageSize
        });
      } else {
        // 无关键词 → 普通列表，带筛选条件
        const requestParams = {
          page: String(currentPage - 1),
          pageSize: String(currentPageSize),
          status: filters.status,
          role: filters.role,
          dept: filters.dept,
        };
        res = await getAllUsers(requestParams);
      }

      setUsers(res?.data?.users ?? []);
      setTotal(res?.data?.total ?? 0);
    } catch (e) {
      console.error('获取用户列表失败:', e);
      message.error('获取用户列表失败');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── 初始化：获取角色选项 ─────────────────────────────────────────────────────
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const roleRes: any = await getActiveRoles();
        const list = roleRes?.data || roleRes || [];
        setRoleOptions(
          (Array.isArray(list) ? list : []).map((r: any): RoleOption => ({
            value: String(r.id),
            label: r.name,
          })),
        );
      } catch (e) {
        console.error('获取角色失败:', e);
        message.error('获取角色列表失败');
      }
    };
    console.log("初始加载成功")
    fetchRoles();
  }, []);
  
// ── 主要数据加载逻辑（合并效果）─────────────────────────────────────────────

const prevFiltersRef = useRef({}); // 使用ref记录上一次的筛选值
useEffect(() => {

  const currentFilters = {
    search: debouncedSearch,
    status: selectedStatus,
    role: selectedRole,
    dept: debouncedDept
  };
  
  // 检查筛选条件是否变化
  const filtersChanged = 
    JSON.stringify(prevFiltersRef.current) !== JSON.stringify(currentFilters);
  
  // 筛选条件变化时：回到第1页并清空选中
  if (filtersChanged) {
    // 只有当当前页码不是1时才设置，避免不必要的状态更新
    if (page !== 1) {
      setPage(1);
      // 注意：这里不立即调用fetchUsers，因为page变化会触发下一次effect
    } else {
      // 如果已经在第1页，直接使用当前参数获取数据
      fetchUsers(1, pageSize, filterParams);
    }
    setSelectedRows([]);
    
    // 更新上一次筛选值
    prevFiltersRef.current = currentFilters;
  } else {
    // 筛选条件未变化，正常获取数据（分页变化时）
    fetchUsers(page, pageSize, filterParams);
  }
}, [page, pageSize, debouncedSearch, selectedStatus, selectedRole, debouncedDept]);

// ── 翻页回调 ──────────────────────────────────────────────────────────────
const handlePageChange = useCallback((newPage: number, newPageSize: number) => {
  setSelectedRows([]);
  setPage(newPage);
  setPageSize(newPageSize);
}, []);

// ── 刷新函数 ──────────────────────────────────────────────────────────────
const refresh = useCallback(() => {
  fetchUsers(page, pageSize, filterParams);
}, [fetchUsers, page, pageSize, filterParams]);

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
