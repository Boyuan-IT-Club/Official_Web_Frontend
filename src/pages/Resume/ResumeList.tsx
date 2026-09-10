import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Card,
  List,
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
  Tooltip,
  Checkbox,
  Popconfirm
} from 'antd';
import type { MenuProps } from 'antd';
import { ThunderboltOutlined,
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
import { buildExportDataFromSimpleFields, exportResumeAsDOCX } from '@/utils/exportResume';
import { resolveResumePhotoDataUrl } from '@/api/resumePhoto';
import { batchScreening } from '@/api/manage/resumeEntry';
import ResumePhotoAvatar from '@/components/ResumePhotoAvatar';
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
  /** 进入沉浸式打分舞台（从这一份开始批改，队列即当前筛选结果） */
  onEnterStage?: (resume: Resume) => void;
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

/** 分数配色：只分三档，避免变成一片花的调色盘 */
const scoreColor = (score: number): string => {
  if (score >= 85) return 'green';
  if (score >= 60) return 'blue';
  return 'orange';
};

/**
 * 「已提交」= 待初筛 + 通过初筛 + 未通过初筛。
 *
 * 默认落在这一档而不是只看「待初筛」：初筛一旦出结论，简历就从 2 变成 4/5，
 * 在只看 2 的视图里当场消失——管理员刚标完就找不到人了，也没法回头核对
 * 自己判过什么。草稿不在其中，它还没交上来。
 */
const SUBMITTED_STATUSES = '2,4,5';

const ResumeList: React.FC<ResumeListProps> = ({
  onShowDetail,
  onEnterStage,
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
    choiceRank: string;
    statusFilter: string;
    cycleId?: number;
    sortBy: string;
    sortOrder: string;
  }>({
    searchText: '',
    searchType: 'name',
    expectedDepartment: '',
    choiceRank: '',
    statusFilter: SUBMITTED_STATUSES,
    cycleId: undefined,
    sortBy: 'submitted_at',
    sortOrder: 'DESC',
  });

  // 搜索、筛选、排序状态
  const [searchText, setSearchText] = useState<string>('');
  const [searchType, setSearchType] = useState<string>('name');
  const [expectedDepartment, setExpectedDepartment] = useState<string>('');
  /**
   * 志愿位次：''=不限（一二志愿命中任一）、first、second。
   * 原来只有一个部门下拉，匹配的是简历字段里 ["第一志愿","第二志愿"] 那个数组，
   * 只能 LIKE，分不出这人是把该部门填成第一还是第二——而这恰恰是筛人时最想知道的。
   */
  const [choiceRank, setChoiceRank] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('submitted_at');
  const [sortOrder, setSortOrder] = useState<string>('DESC');
  const [statusFilter, setStatusFilter] = useState<string>(SUBMITTED_STATUSES);
  // 批量初筛：勾选后统一标通过/未通过、给未通过的发通知。
  // 卡片式列表没有 Table 的 rowSelection，用卡片左上角的勾选框自己管一份 id 集合。
  const [picked, setPicked] = useState<number[]>([]);
  const [screening, setScreening] = useState(false);

  // 本页简历 id，供「全选本页」用
  const pageResumeIds: number[] = (resumes ?? []).map((r: any) => Number(r.resumeId));

  const togglePick = (resumeId: number, checked: boolean) =>
    setPicked((prev) => (checked ? [...prev, resumeId] : prev.filter((id) => id !== resumeId)));

  const runScreening = async (passed: boolean) => {
    setScreening(true);
    try {
      const res: any = await batchScreening(picked, passed);
      const updated = res?.data?.updated ?? 0;
      message.success(`已标记 ${updated} 份为${passed ? '通过' : '未通过'}初筛`
        + (updated < picked.length ? `（${picked.length - updated} 份是草稿，已跳过）` : ''));
      setPicked([]);
      loadResumes(localCurrentPage, pagination.pageSize);
    } catch (e: any) {
      message.error(e?.message || '批量初筛失败');
    } finally {
      setScreening(false);
    }
  };

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
    const currentParams = { searchText, searchType, expectedDepartment, choiceRank, statusFilter, cycleId, sortBy, sortOrder };
    const prevParams = searchParamsRef.current;
    return (
      currentParams.searchText !== prevParams.searchText ||
      currentParams.searchType !== prevParams.searchType ||
      currentParams.expectedDepartment !== prevParams.expectedDepartment ||
      currentParams.choiceRank !== prevParams.choiceRank ||
      currentParams.statusFilter !== prevParams.statusFilter ||
      currentParams.cycleId !== prevParams.cycleId ||
      currentParams.sortBy !== prevParams.sortBy ||
      currentParams.sortOrder !== prevParams.sortOrder
    );
  };

  // 更新搜索参数引用
  const updateSearchParamsRef = (): void => {
    searchParamsRef.current = { searchText, searchType, expectedDepartment, choiceRank, statusFilter, cycleId, sortBy, sortOrder };
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
      // 位次只在选了部门时才有意义，单独传等于没有条件
      if (choiceRank) params.choiceRank = choiceRank;
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
  }, [searchText, searchType, expectedDepartment, choiceRank, statusFilter, cycleId, sortBy, sortOrder, onPageChange]);

  // 获取状态信息
  // 简历状态三态：草稿 / 已提交 / 已截止（录取与否见「面试管理 → 结果与通知」）
  const getStatusInfo = (status: number) => {
    switch (status) {
      // 4/5 是初筛结论（与「面试结果」的录取与否是两回事）
      case 5:
        return { text: '未通过初筛', color: 'error', icon: <CloseCircleOutlined /> };
      case 4:
        return { text: '通过初筛', color: 'success', icon: <CheckCircleOutlined /> };
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

          {/* 周期选择器一直沿用「部门筛选」的类名，宽度也就跟着部门走，
              而周期名比部门名长得多，选中后把整行顶偏。给它自己的类名 */}
          <div className="control-item cycle-filter-select">
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

          <div className="control-item">
            {onEnterStage && (
              <Button
                type="primary"
                icon={<ThunderboltOutlined />}
                disabled={(resumes ?? []).length === 0}
                onClick={() => {
                  // 从第一位未打分的开始；都打完了就从第一份开始复查
                  const list: any[] = resumes ?? [];
                  const target = list.find((r) => r.resumeScore == null) ?? list[0];
                  if (target) onEnterStage(target);
                }}
              >
                打分舞台
              </Button>
            )}
          </div>

          <div className="control-item department-filter-select">
            <Select
              style={{ width: '100%' }}
              placeholder="志愿部门"
              value={expectedDepartment || undefined}
              onChange={(v) => {
                setExpectedDepartment(v ?? '');
                // 清空部门时位次一并清掉，否则留着一个不起作用的「第一志愿」很费解
                if (!v) setChoiceRank('');
              }}
              allowClear
              suffixIcon={<AppstoreOutlined />}
            >
              <Option value="技术部">技术部</Option>
              <Option value="项目部">项目部</Option>
              <Option value="媒体部">媒体部</Option>
              <Option value="综合部">综合部</Option>
            </Select>
          </div>

          {/* 位次只在选了部门后出现：没选部门时它没有意义，
              常驻两个下拉只会把工具条撑满、显得都要填 */}
          {expectedDepartment && (
            <div className="control-item choice-rank-select">
              <Select
                style={{ width: '100%' }}
                value={choiceRank}
                onChange={setChoiceRank}
                options={[
                  { value: '', label: '不限志愿' },
                  { value: 'first', label: '第一志愿' },
                  { value: 'second', label: '第二志愿' },
                ]}
              />
            </div>
          )}

          <div className="control-item status-filter-select">
            <Select
              style={{ width: '100%' }}
              placeholder="状态筛选"
              value={statusFilter}
              onChange={setStatusFilter}
              allowClear
            >
              <Option value={SUBMITTED_STATUSES}>已提交（全部）</Option>
              <Option value="2">待初筛</Option>
              <Option value="4">通过初筛</Option>
              <Option value="5">未通过初筛</Option>
              <Option value="1">草稿（未提交）</Option>
              <Option value="1,2,4,5">含草稿的全部</Option>
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

      {/*
        批量初筛条：常驻显示。原先做成「勾选后才浮出」，结果没人知道这里能操作——
        功能藏在一个需要先猜到的前置操作后面等于不存在（用户实测反馈）。
        现在按钮一直在，未勾选时禁用并直接写清该怎么用。

        这里只管「判」不管「发」：落选通知统一在「面试管理 → 通知」里发。
        两处都能发的时候，管理员在这边发一批、那边看到的却是另一套统计，
        没人说得清到底通知过谁。初筛决定谁能进面试，与录取决定也是两回事。
      */}
      <div className="screening-bar">
          <Space wrap>
            <Checkbox
              checked={pageResumeIds.length > 0 && picked.length === pageResumeIds.length}
              indeterminate={picked.length > 0 && picked.length < pageResumeIds.length}
              onChange={(e) => setPicked(e.target.checked ? pageResumeIds : [])}
            >
              全选本页
            </Checkbox>
            <Text strong>
              {picked.length > 0 ? `已选 ${picked.length} 份` : '勾选简历后可批量初筛'}
            </Text>
            <Popconfirm
              title={`标记 ${picked.length} 份为通过初筛？`}
              description="通过初筛的同学可以填写面试意向、参与面试分配。"
              okText="确认" cancelText="取消"
              disabled={picked.length === 0}
              onConfirm={() => runScreening(true)}
            >
              <Button type="primary" loading={screening} disabled={picked.length === 0}>
                标为通过初筛
              </Button>
            </Popconfirm>
            <Popconfirm
              title={`标记 ${picked.length} 份为未通过初筛？`}
              description="未通过的同学本届流程即结束：不再参与面试分配，也不能再提交面试意向。此操作可撤回（重新标为通过）。"
              okText="确认" cancelText="取消"
              okButtonProps={{ danger: true }}
              disabled={picked.length === 0}
              onConfirm={() => runScreening(false)}
            >
              <Button danger loading={screening} disabled={picked.length === 0}>
                标为未通过初筛
              </Button>
            </Popconfirm>
            {picked.length > 0 && (
              <Button type="text" onClick={() => setPicked([])}>取消选择</Button>
            )}
          </Space>
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
                // 身份信息以简历字段优先、注册账号兜底：空草稿没有任何字段值，
                // 但姓名/邮箱注册时就有，不该显示成「未提供」
                const name = getFieldValueFromResume(resume, '姓名') || (resume as any).userName;
                const major = getFieldValueFromResume(resume, '专业');
                const rawDeptValue = getFieldValueFromResume(resume, '期望部门');
                const parsedDept = parseExpectedDepartments(rawDeptValue);
                const email = getFieldValueFromResume(resume, '邮箱') || (resume as any).userEmail;
                // 「个人照片」字段值：新数据是 COS objectKey，历史数据是整段 base64，
                // ResumePhotoAvatar 内部两种都认；没传照片时回落到占位图标
                const photo = getFieldValueFromResume(resume, '个人照片');

                return (
                  <List.Item key={String(resume.resumeId)}>
                    <Card
                      hoverable
                      className={`resume-card${picked.includes(Number(resume.resumeId)) ? ' is-picked' : ''}`}
                      actions={[
                        <Button type="link" icon={<EyeOutlined />} onClick={() => handleViewResume(resume)}>
                          查看
                        </Button>,
                        <Dropdown
                          menu={{
                            items: [
                              { key: 'pdf', label: '下载 PDF', onClick: () => handleDownloadResume(resume.resumeId) },
                              {
                                key: 'word',
                                label: '下载 Word',
                                onClick: async () => {
                                  const data = buildExportDataFromSimpleFields((resume as any).simpleFields, {
                                    userName: (resume as any).userName,
                                    userEmail: (resume as any).userEmail,
                                  });
                                  // 照片是 COS objectKey 时先取回内嵌用的 dataURL；
                                  // 历史 base64 已由 buildExportDataFromSimpleFields 拾取
                                  if (!data.photoBase64) {
                                    data.photoBase64 = await resolveResumePhotoDataUrl(Number(resume.resumeId), photo);
                                  }
                                  await exportResumeAsDOCX(data);
                                },
                              },
                            ],
                          }}
                        >
                          <Button type="link" icon={<DownloadOutlined />}>下载</Button>
                        </Dropdown>,
                      ]}
                    >
                      <Card.Meta
                        avatar={<ResumePhotoAvatar resumeId={resume.resumeId} value={photo} size="large" />}
                        title={
                          <Space>
                            {/* 勾选框与姓名同排：原先绝对定位在卡片左上角，
                                正好压在照片头像上，看不出这里能勾 */}
                            <Checkbox
                              checked={picked.includes(Number(resume.resumeId))}
                              onChange={(e) => togglePick(Number(resume.resumeId), e.target.checked)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <Text strong>{name || '未提供姓名'}</Text>
                            <Tag icon={statusInfo.icon} color={statusInfo.color}>
                              {statusInfo.text}
                            </Tag>
                            {/* 分数直接摆在封面：批量筛简历时最想先看到的就是它，
                                否则要逐个点进详情才知道谁打过分。
                                未打分显示灰色「未评分」，一眼看出还剩谁要处理。 */}
                            {(resume as any).resumeScore != null ? (
                              <Tooltip
                                title={(resume as any).scoredByName
                                  ? `${(resume as any).scoredByName} 评分`
                                  : '已评分'}
                              >
                                <Tag color={scoreColor((resume as any).resumeScore)}>
                                  {(resume as any).resumeScore} 分
                                </Tag>
                              </Tooltip>
                            ) : (
                              <Tag>未评分</Tag>
                            )}
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
