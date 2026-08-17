import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Card,
  List,
  Avatar,
  Tag,
  Button,
  Space,
  Typography,
  message,
  Pagination,
  Select,
  Input,
  Dropdown,
  Menu,
  Spin,
  Alert,
  Modal,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  UserOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  DownloadOutlined,
  SearchOutlined,
  FilterOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  CloseCircleOutlined,
  AppstoreOutlined, // 用于部门筛选图标
} from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import { resumeActions } from '@/store/modules/resume';
import { getAllCycles } from '@/api/manage/cycleApis';
import './index.scss';

const { Text, Title } = Typography;
const { Option } = Select;

type SimpleField = {
  fieldId?: number;
  fieldLabel?: string;
  fieldKey?: string;
  fieldValue?: string;
};

type Resume = {
  resumeId: string | number;
  status: number;
  submittedAt?: string | number | Date | null;
  simpleFields?: SimpleField[];
  // 不改后端返回结构：允许其他字段存在
  [key: string]: any;
};

type PaginationState = {
  total: number;
  pageSize: number;
  [key: string]: any;
};

type ResumeSliceState = {
  resumes: Resume[];
  adminLoading: boolean;
  adminError?: string | null;
  pagination: PaginationState;
};

type RootStateLike = {
  resume: ResumeSliceState;
};

type ResumeListProps = {
  onShowDetail?: (resume: Resume, currentPage?: number) => void;
  onApprove?: (resumeId: string | number) => void;
  onReject?: (resumeId: string | number) => void;
  onDownload?: (resumeId: string | number) => void;
  currentPage?: number;
  onPageChange?: (page: number) => void;
};

// --- 新增：解析期望部门字段的函数（保持原逻辑不变） ---
const parseExpectedDepartments = (rawValue: unknown): string => {
  if (!rawValue) return '';
  const str = String(rawValue);

  try {
    const parsedValue: unknown = JSON.parse(str);
    if (Array.isArray(parsedValue)) {
      return (parsedValue as unknown[])
        .filter((dept) => typeof dept === 'string' && dept.trim() && dept !== '无')
        .join(', ');
    } else if (typeof parsedValue === 'string') {
      return parsedValue;
    }
  } catch (e) {
    // 如果不是 JSON，使用原来的处理逻辑
    // eslint-disable-next-line no-console
    console.log('不是 JSON 格式，使用备用解析方法');
  }

  let cleanedValue = str.replace(/["'()[\]]/g, '');
  cleanedValue = cleanedValue.trim();
  const departments = cleanedValue
    .split(',')
    .map((dep) => dep.trim())
    .filter((dep) => dep && dep !== '无');

  if (departments.length === 0) return '';
  return departments.join(', ');
};

const ResumeList: React.FC<ResumeListProps> = ({
  onShowDetail,
  onApprove,
  onReject,
  onDownload,
  currentPage,
  onPageChange,
}) => {
  const dispatch = useDispatch<any>();

  // 从 Redux 获取分页相关状态
  const { resumes, adminLoading, adminError, pagination } = useSelector(
    (state: RootStateLike) => state.resume
  );

  // 添加 ref 来跟踪是否是从详情页返回
  const isReturningFromDetail = useRef<boolean>(false);
  // 添加 ref 来跟踪搜索参数是否变化
  const searchParamsRef = useRef<{
    searchText: string;
    searchType: string;
    expectedDepartment: string;
    statusFilter: string;
    cycleId?: number;
    sortBy: string;
    sortOrder: string;
  }>({
    searchText: '',
    searchType: 'name',
    expectedDepartment: '',
    statusFilter: '2',
    cycleId: undefined,
    sortBy: 'submitted_at',
    sortOrder: 'DESC',
  });

  // 搜索、筛选、排序状态
  const [searchText, setSearchText] = useState<string>('');
  const [searchType, setSearchType] = useState<string>('name');
  const [expectedDepartment, setExpectedDepartment] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('submitted_at');
  const [sortOrder, setSortOrder] = useState<string>('DESC');
  const [statusFilter, setStatusFilter] = useState<string>('2');
  // 招募周期筛选：后端 /api/resumes/search 早就支持 cycleId 参数，只是前端一直没传，
  // 于是列表把历届简历混在一起显示
  const [cycleId, setCycleId] = useState<number | undefined>();
  const [cycles, setCycles] = useState<any[]>([]);
  const [isStartingReview, setIsStartingReview] = useState<boolean>(false);

  // 用于高亮显示当前排序方式
  const [currentSortKey, setCurrentSortKey] = useState<string>('time_desc');

  // 使用从父组件传递的 currentPage 作为初始值
  const [localCurrentPage, setLocalCurrentPage] = useState<number>(currentPage || 1);

  // 检查搜索参数是否真正变化
  const hasSearchParamsChanged = (): boolean => {
    const currentParams = { searchText, searchType, expectedDepartment, statusFilter, cycleId, sortBy, sortOrder };
    const prevParams = searchParamsRef.current;
    return (
      currentParams.searchText !== prevParams.searchText ||
      currentParams.searchType !== prevParams.searchType ||
      currentParams.expectedDepartment !== prevParams.expectedDepartment ||
      currentParams.statusFilter !== prevParams.statusFilter ||
      currentParams.cycleId !== prevParams.cycleId ||
      currentParams.sortBy !== prevParams.sortBy ||
      currentParams.sortOrder !== prevParams.sortOrder
    );
  };

  // 更新搜索参数引用
  const updateSearchParamsRef = (): void => {
    searchParamsRef.current = { searchText, searchType, expectedDepartment, statusFilter, cycleId, sortBy, sortOrder };
  };

  // 加载简历数据的函数（保持原逻辑不变）
  const loadResumes = (page: number, size: number, isReturning = false): void => {
    setLocalCurrentPage(page);

    if (!isReturning && onPageChange) {
      onPageChange(page);
    }

    const params: Record<string, any> = {
      page: page - 1, // 后端页码从0开始
      size: size,
    };

    // 添加搜索条件
    if (searchText) {
      if (searchType === 'name') {
        params.name = searchText;
      } else if (searchType === 'major') {
        params.major = searchText;
      }
    }

    // 添加部门筛选
    if (expectedDepartment) {
      params.expectedDepartment = expectedDepartment;
    }

    // 添加状态筛选
    if (statusFilter) {
      params.status = statusFilter;
    }

    // 添加周期筛选
    if (cycleId) {
      params.cycleId = cycleId;
    }

    // 添加排序 - 使用接口文档中的参数名
    if (sortBy && sortOrder) {
      params.sortBy = sortBy;
      params.sortOrder = sortOrder;
    }

    // eslint-disable-next-line no-console
    console.log('Dispatching fetchResumes with params:', params);
    dispatch(resumeActions.fetchResumes(params));

    updateSearchParamsRef();

    if (isReturning) {
      isReturningFromDetail.current = false;
    }
  };

  // 当父组件的 currentPage 变化时更新本地状态（保持原逻辑不变）
  // 拉周期列表并默认选中进行中的那一届：默认「全部周期」会把历届混在一起，
  // 而管理员绝大多数时候只关心当前这一届
  useEffect(() => {
    let cancelled = false;
    getAllCycles()
      .then((res: any) => {
        if (cancelled) return;
        const list = res?.data ?? [];
        setCycles(list);
        const active = list.find((c: any) => c.isActive === 1) ?? list[0];
        if (active) setCycleId(active.cycleId);
      })
      .catch(() => { /* 周期拉不到时退化为全部周期，不阻塞简历列表 */ });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (currentPage && currentPage !== localCurrentPage) {
      // eslint-disable-next-line no-console
      console.log('父组件页码变化，更新本地页码:', currentPage);
      setLocalCurrentPage(currentPage);
      isReturningFromDetail.current = true; // 标记为从详情页返回
      loadResumes(currentPage, pagination.pageSize, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pagination.pageSize]);

  // 组件挂载时获取当前页码的数据（保持原逻辑不变）
  useEffect(() => {
    loadResumes(localCurrentPage, pagination.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  // 搜索、筛选、排序变化时重新加载数据（重置到第一页）
  useEffect(() => {
    if (isReturningFromDetail.current) {
      // eslint-disable-next-line no-console
      console.log('从详情页返回，跳过搜索条件变化的重置逻辑');
      return;
    }

    if (hasSearchParamsChanged()) {
      // eslint-disable-next-line no-console
      console.log('搜索/筛选/排序条件变化，重置到第一页');
      setLocalCurrentPage(1);
      if (onPageChange) onPageChange(1);
      loadResumes(1, pagination.pageSize);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText, searchType, expectedDepartment, statusFilter, cycleId, sortBy, sortOrder, onPageChange]);

  // 获取状态信息
  // 简历状态三态：草稿 / 已提交 / 已截止（录取与否见「面试管理 → 结果与通知」）
  const getStatusInfo = (status: number) => {
    switch (status) {
      case 3:
        return { text: '已截止（未提交）', color: 'default', icon: <CloseCircleOutlined /> };
      case 2:
        return { text: '已提交', color: 'processing', icon: <CheckCircleOutlined /> };
      case 1:
      default:
        return { text: '草稿', color: 'gold', icon: <ClockCircleOutlined /> };
    }
  };

  // 从 simpleFields 中获取字段值的辅助函数
  const getFieldValueFromResume = (resume: Resume, labelOrKey: string): string => {
    if (!resume.simpleFields || !Array.isArray(resume.simpleFields)) return '';
    const field = resume.simpleFields.find((f) => f.fieldLabel === labelOrKey || f.fieldKey === labelOrKey);
    return field ? field.fieldValue || '' : '';
  };

  // 查看简历详情
  const handleViewResume = (resumeObject: Resume): void => {
    // eslint-disable-next-line no-console
    console.log('Viewing resume:', resumeObject);
    if (onShowDetail) {
      onShowDetail(resumeObject, localCurrentPage);
    }
  };

  // 下载简历
  const handleDownloadResume = (resumeId: string | number): void => {
    if (onDownload) onDownload(resumeId);
  };

  // 处理排序变化
  const handleSortChange = (newSortBy: string, newSortOrder: string, key: string): void => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setCurrentSortKey(key);
  };

  // 分页变化时加载数据
  const handlePageChange = (page: number, size?: number): void => {
    if (size && size !== pagination.pageSize) {
      const newPage = 1;
      setLocalCurrentPage(newPage);
      if (onPageChange) onPageChange(newPage);
      loadResumes(newPage, size);
    } else {
      loadResumes(page, size || pagination.pageSize);
    }
  };

  // 「开始审核/评审中」流程已随三态化移除：录取与否在「面试管理 → 结果与通知」中决定

  // 排序菜单 - 添加 selectedKeys（保持原逻辑不变）
  const sortMenu = (
    <Menu
      selectedKeys={[currentSortKey]}
      onClick={({ key }) => {
        const k = String(key);
        if (k === 'time_desc') {
          handleSortChange('submitted_at', 'DESC', 'time_desc');
        } else if (k === 'time_asc') {
          handleSortChange('submitted_at', 'ASC', 'time_asc');
        } else if (k === 'name_asc') {
          handleSortChange('name', 'ASC', 'name_asc');
        } else if (k === 'name_desc') {
          handleSortChange('name', 'DESC', 'name_desc');
        }
      }}
    >
      <Menu.Item key="time_desc" icon={<SortDescendingOutlined />}>
        按时间倒序
      </Menu.Item>
      <Menu.Item key="time_asc" icon={<SortAscendingOutlined />}>
        按时间正序
      </Menu.Item>
      <Menu.Item key="name_asc" icon={<SortAscendingOutlined />}>
        按姓名正序
      </Menu.Item>
      <Menu.Item key="name_desc" icon={<SortDescendingOutlined />}>
        按姓名倒序
      </Menu.Item>
    </Menu>
  );

  return (
    <div className="resume-list-container">
      {adminError && (
        <Alert
          message="获取简历列表失败"
          description={adminError}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <div className="list-controls">
        <div className="controls-flex-container">
          <div className="control-item search-box">
            <Input
              placeholder="输入搜索内容"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </div>

          <div className="control-item search-type-select">
            <Select style={{ width: '100%' }} placeholder="搜索类型" value={searchType} onChange={setSearchType}>
              <Option value="name">姓名</Option>
              <Option value="major">专业</Option>
            </Select>
          </div>

          <div className="control-item department-filter-select">
            <Select
              style={{ width: '100%' }}
              placeholder="招募周期"
              value={cycleId}
              onChange={setCycleId}
              allowClear
              options={cycles.map((c: any) => ({
                value: c.cycleId,
                label: `${c.cycleName}${c.isActive === 1 ? '（进行中）' : ''}`,
              }))}
            />
          </div>

          <div className="control-item department-filter-select">
            <Select
              style={{ width: '100%' }}
              placeholder="部门筛选"
              value={expectedDepartment}
              onChange={setExpectedDepartment}
              allowClear
              suffixIcon={<AppstoreOutlined />}
            >
              <Option value="技术部">技术部</Option>
              <Option value="项目部">项目部</Option>
              <Option value="媒体部">媒体部</Option>
              <Option value="综合部">综合部</Option>
            </Select>
          </div>

          <div className="control-item status-filter-select">
            <Select
              style={{ width: '100%' }}
              placeholder="状态筛选"
              value={statusFilter}
              onChange={setStatusFilter}
              allowClear
            >
              <Option value="1,2">全部</Option>
              <Option value="2">已提交</Option>
              <Option value="1">草稿</Option>
            </Select>
          </div>

          <div className="control-item sort-dropdown">
            <Dropdown overlay={sortMenu} trigger={['click']}>
              <Button icon={<FilterOutlined />}>排序方式</Button>
            </Dropdown>
          </div>

          <div className="control-item results-info-wrapper">
            <div className="results-info">共找到 {pagination.total} 份简历</div>
          </div>
        </div>
      </div>

      <div className="list-header">
        <Title level={4}>简历管理</Title>
        <Text type="secondary">共 {pagination.total} 份简历</Text>
      </div>

      <Spin spinning={adminLoading}>
        {adminLoading ? (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <Spin size="large" />
          </div>
        ) : (
          <>
            <List
              dataSource={resumes}
              grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 3, xl: 3, xxl: 3 }}
              renderItem={(resume) => {
                const statusInfo = getStatusInfo(resume.status);
                const name = getFieldValueFromResume(resume, '姓名');
                const major = getFieldValueFromResume(resume, '专业');
                const rawDeptValue = getFieldValueFromResume(resume, '期望部门');
                const parsedDept = parseExpectedDepartments(rawDeptValue);
                const email = getFieldValueFromResume(resume, '邮箱');

                return (
                  <List.Item key={String(resume.resumeId)}>
                    <Card
                      hoverable
                      className="resume-card"
                      actions={[
                        <Button type="link" icon={<EyeOutlined />} onClick={() => handleViewResume(resume)}>
                          查看
                        </Button>,
                        <Button
                          type="link"
                          icon={<DownloadOutlined />}
                          onClick={() => handleDownloadResume(resume.resumeId)}
                        >
                          下载
                        </Button>,
                      ]}
                    >
                      <Card.Meta
                        avatar={<Avatar size="large" icon={<UserOutlined />} />}
                        title={
                          <Space>
                            <Text strong>{name || '未提供姓名'}</Text>
                            <Tag icon={statusInfo.icon} color={statusInfo.color}>
                              {statusInfo.text}
                            </Tag>
                          </Space>
                        }
                        description={
                          <div className="resume-card-description">
                            <div>
                              <Text type="secondary">专业:</Text> {major || '未提供'}
                            </div>
                            <div>
                              <Text type="secondary">部门:</Text> {parsedDept || '未提供'}
                            </div>
                            <div>
                              <Text type="secondary">邮箱:</Text> {email || '未提供'}
                            </div>
                            <div>
                              <Text type="secondary">提交时间:</Text> <CalendarOutlined />{' '}
                              {resume.submittedAt ? new Date(resume.submittedAt).toLocaleString() : '未提交'}
                            </div>
                          </div>
                        }
                      />
                    </Card>
                  </List.Item>
                );
              }}
            />

            <Pagination
              className="resume-pagination"
              current={localCurrentPage}
              pageSize={pagination.pageSize}
              total={pagination.total}
              onChange={handlePageChange}
              onShowSizeChange={handlePageChange}
              showSizeChanger
              showQuickJumper
              showTotal={(total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`}
              pageSizeOptions={['9', '20', '50', '100']}
            />
          </>
        )}
      </Spin>
    </div>
  );
};

export default ResumeList;
