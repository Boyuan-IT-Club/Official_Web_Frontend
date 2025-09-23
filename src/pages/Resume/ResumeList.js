// src/pages/Resume/ResumeList.js
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
  Row,
  Col,
  Dropdown,
  Menu,
  Spin,
  Alert,
  Modal
} from 'antd';
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
  CloseCircleOutlined
} from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import { resumeActions } from '@/store/modules/resume';
import './index.scss';

const { Text, Title } = Typography;
const { Option } = Select;

const ResumeList = ({ 
  onShowDetail, 
  onApprove, 
  onReject, 
  onDownload,
  currentPage,        // 新增：接收当前页码
  onPageChange        // 新增：接收页码变化回调
}) => {
  const dispatch = useDispatch();
  // 从 Redux 获取分页相关状态
  const { resumes, adminLoading, adminError, pagination } = useSelector((state) => state.resume);
  
  // 添加 ref 来跟踪是否是从详情页返回
  const isReturningFromDetail = useRef(false);
  // 添加 ref 来跟踪搜索参数是否变化
  const searchParamsRef = useRef({
    searchText: '',
    statusFilter: '2,3,4,5',
    sortBy: 'time',
    sortOrder: 'desc'
  });

  // 搜索和筛选状态
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState('time');
  const [sortOrder, setSortOrder] = useState('desc');
  const [statusFilter, setStatusFilter] = useState('2,3,4,5'); // 默认只显示已提交及之后的简历
  const [isStartingReview, setIsStartingReview] = useState(false);
  
  // 使用从父组件传递的 currentPage 作为初始值
  const [localCurrentPage, setLocalCurrentPage] = useState(currentPage || 1);

  // 当父组件的 currentPage 变化时更新本地状态
  useEffect(() => {
    if (currentPage && currentPage !== localCurrentPage) {
      console.log("父组件页码变化，更新本地页码:", currentPage);
      setLocalCurrentPage(currentPage);
      isReturningFromDetail.current = true; // 标记为从详情页返回
      // 如果页码变化，重新加载数据
      loadResumes(currentPage, pagination.pageSize, true);
    }
  }, [currentPage]);

  // 组件挂载时获取当前页码的数据
  useEffect(() => {
    loadResumes(localCurrentPage, pagination.pageSize);
  }, []);

  // 检查搜索参数是否真正变化
  const hasSearchParamsChanged = () => {
    const currentParams = { searchText, statusFilter, sortBy, sortOrder };
    const prevParams = searchParamsRef.current;
    
    return currentParams.searchText !== prevParams.searchText ||
           currentParams.statusFilter !== prevParams.statusFilter ||
           currentParams.sortBy !== prevParams.sortBy ||
           currentParams.sortOrder !== prevParams.sortOrder;
  };

  // 更新搜索参数引用
  const updateSearchParamsRef = () => {
    searchParamsRef.current = { searchText, statusFilter, sortBy, sortOrder };
  };

  // 加载简历数据的函数
  const loadResumes = (page, size, isReturning = false) => {
    // 更新本地页码状态
    setLocalCurrentPage(page);
    
    // 如果是返回操作，不通知父组件页码变化（避免循环）
    if (!isReturning && onPageChange) {
      onPageChange(page);
    }
    
    // 构建查询参数
    const params = {
      page: page - 1, // 后端页码从0开始
      size: size,
    };
    
    // 添加搜索条件
    if (searchText) {
      params.name = searchText;
    }
    
    // 添加状态筛选
    if (statusFilter) {
      params.status = statusFilter;
    }
    
    // 添加排序
    if (sortBy === 'time') {
      params.sort = `submittedAt,${sortOrder}`;
    } else if (sortBy === 'name') {
      params.sort = `name,${sortOrder}`;
    }
    
    dispatch(resumeActions.fetchResumes(params));
    
    // 更新搜索参数引用
    updateSearchParamsRef();
    
    // 重置返回标记
    if (isReturning) {
      isReturningFromDetail.current = false;
    }
  };

  // 搜索、筛选、排序变化时重新加载数据（重置到第一页）
  useEffect(() => {
    // 检查是否是从详情页返回，如果是则跳过重置逻辑
    if (isReturningFromDetail.current) {
      console.log("从详情页返回，跳过搜索条件变化的重置逻辑");
      return;
    }
    
    // 检查搜索参数是否真正变化
    if (hasSearchParamsChanged()) {
      console.log("搜索/筛选条件变化，重置到第一页");
      setLocalCurrentPage(1);
      if (onPageChange) {
        onPageChange(1);
      }
      loadResumes(1, pagination.pageSize);
    }
  }, [searchText, statusFilter, sortBy, sortOrder]);

  // 获取状态信息
  const getStatusInfo = (status) => {
    switch (status) {
      case 5:
        return { text: '已拒绝', color: 'red', icon: <CloseCircleOutlined /> };
      case 4:
        return { text: '已录取', color: 'green', icon: <CheckCircleOutlined /> };
      case 3:
        return { text: '评审中', color: 'blue', icon: <ClockCircleOutlined /> };
      case 2:
        return { text: '已提交', color: 'cyan', icon: <ClockCircleOutlined /> };
      case 1:
      default:
        return { text: '草稿', color: 'default', icon: <ClockCircleOutlined /> };
    }
  };

  // 从 simpleFields 中获取字段值的辅助函数
  const getFieldValueFromResume = (resume, labelOrKey) => {
    if (!resume.simpleFields || !Array.isArray(resume.simpleFields)) return '';
    const field = resume.simpleFields.find(f => f.fieldLabel === labelOrKey || f.fieldKey === labelOrKey);
    return field ? field.fieldValue : '';
  };

  // 查看简历详情
  const handleViewResume = (resumeObject) => {
    console.log("Viewing resume:", resumeObject);
    if (onShowDetail) {
      onShowDetail(resumeObject, localCurrentPage); // 传递当前页码
    }
  };

  // 下载简历
  const handleDownloadResume = (resumeId) => {
    if (onDownload) {
      onDownload(resumeId);
    }
  };

  // 处理搜索文本变化
  const handleSearchTextChange = (value) => {
    setSearchText(value);
  };

  // 处理状态筛选变化
  const handleStatusFilterChange = (value) => {
    setStatusFilter(value);
  };

  // 处理排序变化
  const handleSortChange = (newSortBy, newSortOrder) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
  };

  // 分页变化时加载数据
  const handlePageChange = (page, size) => {
  // 如果 size 变化了，需要重置到第一页
  if (size && size !== pagination.pageSize) {
    const newPage = 1; // 每页大小变化时回到第一页
    setLocalCurrentPage(newPage);
    if (onPageChange) {
      onPageChange(newPage);
    }
    loadResumes(newPage, size);
  } else {
    // 只是页码变化
    loadResumes(page, size || pagination.pageSize);
  }
};

  // 处理"开始审核"按钮点击
  const handleStartReview = useCallback(async () => {
    Modal.confirm({
      title: '确认开始审核',
      content: '此操作会将所有"已提交"的简历状态变为"评审中"，申请人将无法再修改简历。确定要继续吗？',
      okText: '确定',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        setIsStartingReview(true);
        try {
          // 获取当前页状态为2的简历
          const resumeIdsToReview = resumes
            .filter(resume => resume.status === 2)
            .map(resume => resume.resumeId);

          if (resumeIdsToReview.length === 0) {
            message.info('当前页没有状态为"已提交"的简历需要更新。');
            setIsStartingReview(false);
            return;
          }

          const updatePromises = resumeIdsToReview.map(resumeId =>
            dispatch(resumeActions.updateResumeStatus({ resumeId, status: 3 })).unwrap()
          );

          await Promise.all(updatePromises);
          message.success(`已开始审核，成功将 ${resumeIdsToReview.length} 份"已提交"的简历状态更新为"评审中"`);

          // 刷新当前页数据
          loadResumes(localCurrentPage, pagination.pageSize);

        } catch (error) {
          console.error("开始审核失败:", error);
          const errorMessage = error?.message || '操作失败，请稍后重试';
          message.error(`开始审核失败: ${errorMessage}`);
        } finally {
          setIsStartingReview(false);
        }
      }
    });
  }, [dispatch, resumes, localCurrentPage, pagination.pageSize]);

  // 排序菜单
  const sortMenu = (
    <Menu>
      <Menu.Item key="time_desc" icon={<SortDescendingOutlined />} onClick={() => handleSortChange('time', 'desc')}>
        按时间倒序
      </Menu.Item>
      <Menu.Item key="time_asc" icon={<SortAscendingOutlined />} onClick={() => handleSortChange('time', 'asc')}>
        按时间正序
      </Menu.Item>
      <Menu.Item key="name_asc" icon={<SortAscendingOutlined />} onClick={() => handleSortChange('name', 'asc')}>
        按姓名正序
      </Menu.Item>
      <Menu.Item key="name_desc" icon={<SortDescendingOutlined />} onClick={() => handleSortChange('name', 'desc')}>
        按姓名倒序
      </Menu.Item>
    </Menu>
  );

  return (
    <div className="resume-list-container">
      {/* 显示全局错误信息 */}
      {adminError && <Alert message="获取简历列表失败" description={adminError} type="error" showIcon style={{ marginBottom: 16 }} />}
      
      <div className="list-controls">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="搜索姓名/专业/邮箱"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => handleSearchTextChange(e.target.value)}
              allowClear
            />
          </Col>
          
          <Col xs={24} sm={12} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="状态筛选"
              value={statusFilter}
              onChange={handleStatusFilterChange}
              allowClear
            >
              <Option value="2,3,4,5">全部可审核简历</Option>
              <Option value="2">已提交</Option>
              <Option value="3">评审中</Option>
              <Option value="4">已录取</Option>
              <Option value="5">已拒绝</Option>
            </Select>
          </Col>
          
          <Col xs={24} sm={12} md={4}>
            <Dropdown overlay={sortMenu} trigger={['click']}>
              <Button icon={<FilterOutlined />}>排序方式</Button>
            </Dropdown>
          </Col>
          
          <Col xs={24} sm={12} md={10} style={{ textAlign: 'right' }}>
            <Space>
              <Button
                type="primary"
                danger
                onClick={handleStartReview}
                loading={isStartingReview}
                disabled={isStartingReview || adminLoading}
              >
                开始审核
              </Button>
              <div className="results-info">共找到 {pagination.total} 份简历</div>
            </Space>
          </Col>
        </Row>
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
              grid={{
                gutter: 16,
                xs: 1,
                sm: 1,
                md: 2,
                lg: 3,
                xl: 3,
                xxl: 3,
              }}
              renderItem={(resume) => {
                const statusInfo = getStatusInfo(resume.status);
                const name = getFieldValueFromResume(resume, "姓名");
                const major = getFieldValueFromResume(resume, "专业");
                const dept = getFieldValueFromResume(resume, "期望部门");
                const email = getFieldValueFromResume(resume, "邮箱");
                
                return (
                  <List.Item>
                    <Card
                      hoverable
                      className="resume-card"
                      actions={[
                        <Button type="link" icon={<EyeOutlined />} onClick={() => handleViewResume(resume)}>
                          查看
                        </Button>,
                        <Button type="link" icon={<DownloadOutlined />} onClick={() => handleDownloadResume(resume.resumeId)}>
                          下载
                        </Button>
                      ]}
                    >
                      <Card.Meta
                        avatar={<Avatar size="large" icon={<UserOutlined />} />}
                        title={
                          <Space>
                            <Text strong>{name || '未提供姓名'}</Text>
                            <Tag icon={statusInfo.icon} color={statusInfo.color}>{statusInfo.text}</Tag>
                          </Space>
                        }
                        description={
                          <div className="resume-card-description">
                            <div><Text type="secondary">专业:</Text> {major || '未提供'}</div>
                            <div><Text type="secondary">部门:</Text> {dept || '未提供'}</div>
                            <div><Text type="secondary">邮箱:</Text> {email || '未提供'}</div>
                            <div><Text type="secondary">提交时间:</Text> <CalendarOutlined /> {resume.submittedAt ? new Date(resume.submittedAt).toLocaleString() : '未提交'}</div>
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
              current={localCurrentPage} // 使用本地页码状态
              pageSize={pagination.pageSize}
              total={pagination.total}
              onChange={handlePageChange}
              onShowSizeChange={handlePageChange}
              showSizeChanger
              showQuickJumper
              showTotal={(total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`}
              pageSizeOptions={['9', '20', '50', '100']} // 确保有合适的选项
            />
          </>
        )}
      </Spin>
    </div>
  );
};

export default ResumeList;