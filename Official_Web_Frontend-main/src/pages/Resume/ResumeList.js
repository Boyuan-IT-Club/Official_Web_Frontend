// src/pages/Resume/ResumeList.js
import React, { useState, useEffect, useCallback } from 'react'; // 引入 useCallback
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
  Alert
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
import { resumeActions } from '@/store/modules/resume'; // 确保导入了新的 action
import './index.scss';
const { Text, Title } = Typography;
const { Option } = Select;

const ResumeList = ({ onShowDetail, onApprove, onReject, onDownload }) => {
  const dispatch = useDispatch();
  // 注意：这里获取的是所有简历的集合，因为我们将在 useEffect 中请求多个状态
  const { resumes, adminLoading, adminError } = useSelector((state) => state.resume);
  const [filteredResumes, setFilteredResumes] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(9); // 默认每页显示 9 个
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState('time'); // time, name
  const [sortOrder, setSortOrder] = useState('desc'); // asc, desc
  // 修改状态筛选的默认值和选项，以匹配新的状态码
  const [statusFilter, setStatusFilter] = useState('all'); // all, 2(submitted), 3(under_review), 4(accepted), 5(rejected)
  // --- 新增状态：控制“开始审核”按钮的加载状态 ---
  const [isStartingReview, setIsStartingReview] = useState(false);
  // --- ---

  // 从 Redux resumes 数据中提取所有可能的部门 (如果字段存在)
  // 注意：根据 Pasted_Text_1757350393089.txt，部门信息可能在 simpleFields 中，需要查找
  const getDepartments = (resumesList) => {
    const deptSet = new Set();
    resumesList.forEach(resume => {
      if (resume.simpleFields && Array.isArray(resume.simpleFields)) {
        const deptField = resume.simpleFields.find(f => f.fieldLabel === "期望部门" || f.fieldKey === "expected_department"); // 根据实际字段调整
        if (deptField && deptField.fieldValue) {
          deptSet.add(deptField.fieldValue);
        }
      }
    });
    return Array.from(deptSet);
  };
  const departments = getDepartments(resumes);

  // 组件挂载时获取简历列表 - 修改为请求多个单值状态
  useEffect(() => {
    // 清空现有简历列表，准备加载新数据
    dispatch(resumeActions.clearResumesAndErrors());
    // 定义需要获取的状态 (对应 submitted, under_review, accepted, rejected)
    // 注意：我们不获取 draft (1) 状态的简历，因为管理员通常不关心草稿
    const statusesToFetch = ['2', '3', '4', '5'];
    // 创建一个 Promise 数组，包含所有状态的请求
    const fetchPromises = statusesToFetch.map(status =>
      // 调用 action，传递单个 status 参数
      dispatch(resumeActions.fetchResumes({ status })).unwrap()
    );
    // 使用 Promise.all 并行处理所有请求
    Promise.allSettled(fetchPromises)
      .then((results) => {
        // results 是一个包含每次调用结果（fulfilled 或 rejected）的数组
        console.log("所有状态简历获取尝试完成:", results);
      })
      .catch((error) => {
        console.error("获取简历列表时发生未预期的错误:", error);
      });
  }, [dispatch]); // 依赖项保持 [dispatch]

  // 筛选和排序逻辑 (基于 Redux 中的 resumes)
  useEffect(() => {
    let result = [...resumes]; // 使用从 Redux store 获取的完整简历列表
    // 搜索逻辑
    if (searchText) {
      result = result.filter(resume =>
        (resume.simpleFields && resume.simpleFields.find(f => f.fieldLabel === "姓名")?.fieldValue?.toLowerCase().includes(searchText.toLowerCase())) ||
        (resume.simpleFields && resume.simpleFields.find(f => f.fieldLabel === "专业")?.fieldValue?.toLowerCase().includes(searchText.toLowerCase())) ||
        (resume.simpleFields && resume.simpleFields.find(f => f.fieldLabel === "邮箱")?.fieldValue?.toLowerCase().includes(searchText.toLowerCase())) // 添加邮箱搜索
      );
    }
    // 状态筛选逻辑 - 使用新的状态码
    if (statusFilter !== 'all') {
      const statusValue = parseInt(statusFilter, 10);
      if (!isNaN(statusValue)) {
        result = result.filter(resume => resume.status === statusValue);
      }
    }
    // 排序逻辑
    result.sort((a, b) => {
      let compareA, compareB;
      switch (sortBy) {
        case 'name':
          compareA = a.simpleFields?.find(f => f.fieldLabel === "姓名")?.fieldValue || '';
          compareB = b.simpleFields?.find(f => f.fieldLabel === "姓名")?.fieldValue || '';
          break;
        case 'time':
        default:
          // 使用后端的 submittedAt 字段 (注意大小写)
          compareA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
          compareB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
          break;
      }
      if (typeof compareA === 'number' && typeof compareB === 'number') {
        return sortOrder === 'asc' ? compareA - compareB : compareB - compareA;
      }
      if (typeof compareA === 'string' && typeof compareB === 'string') {
        return sortOrder === 'asc' ? compareA.localeCompare(compareB) : compareB.localeCompare(compareA);
      }
      return 0;
    });
    setFilteredResumes(result);
    setCurrentPage(1); // 重置到第一页
  }, [resumes, searchText, sortBy, sortOrder, statusFilter]); // 依赖项包含所有影响筛选/排序的因素

  // 获取状态信息 (处理新的数字状态 1, 2, 3, 4, 5)
  // 状态码说明：
  // - 1: draft (草稿)
  // - 2: submitted (已提交)
  // - 3: under_review (评审中)
  // - 4: accepted (录取)
  // - 5: rejected (拒绝)
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

  // 修改：接收整个简历对象
  const handleViewResume = (resumeObject) => { // 注意参数变化
    console.log("Viewing resume:", resumeObject); // 调试日志
    if (onShowDetail) {
      // 调用从父组件传入的函数，并传递整个简历对象
      onShowDetail(resumeObject); // 注意参数变化
    }
  };

  const handleDownloadResume = (resumeId) => { // 下载仍需要 ID
    if (onDownload) {
      onDownload(resumeId);
    }
  };

  // --- 新增：处理“开始审核”按钮点击 ---
  const handleStartReview = useCallback(async () => {
    // 1. 确认操作
    if (!window.confirm('确定要开始审核吗？此操作会将所有“已提交”的简历状态变为“评审中”，申请人将无法再修改简历。')) {
      return; // 用户取消操作
    }

    setIsStartingReview(true); // 设置按钮加载状态
    try {
      // 2. 从当前 filteredResumes 或 resumes 中筛选出所有状态为 2 的简历 ID
      // 这里选择从当前显示的简历列表中筛选，更符合用户直观感受
      const resumeIdsToReview = filteredResumes
        .filter(resume => resume.status === 2)
        .map(resume => resume.resumeId); // 假设后端返回的字段是 resumeId

      if (resumeIdsToReview.length === 0) {
         message.info('当前没有状态为“已提交”的简历需要更新。');
         setIsStartingReview(false);
         return;
      }

      // 3. 使用 updateResumeStatus 逐个更新状态
      // 由于后端没有提供批量接口，我们只能循环调用单个更新 API
      const updatePromises = resumeIdsToReview.map(resumeId =>
        // 调用单个更新 action
        dispatch(resumeActions.updateResumeStatus({ resumeId, status: 3 })).unwrap()
      );

      // 4. 使用 Promise.all 并发执行所有更新请求
      await Promise.all(updatePromises);

      // 5. 如果成功，给出提示
      message.success(`已开始审核，成功将 ${resumeIdsToReview.length} 份“已提交”的简历状态更新为“评审中”`);

      // 6. 刷新列表以立即显示状态变化
      // 方式一：简单地重新获取状态为 2 和 3 的简历
      // dispatch(resumeActions.fetchResumes({ status: '2' })); // 如果还有状态2的，说明可能有并发
      // dispatch(resumeActions.fetchResumes({ status: '3' })); // 获取最新的状态3的简历

      // 方式二（推荐）：更彻底地刷新列表
      dispatch(resumeActions.clearResumesAndErrors()); // 清空现有数据
      const statusesToFetch = ['2', '3', '4', '5'];
      const fetchPromises = statusesToFetch.map(status =>
        dispatch(resumeActions.fetchResumes({ status })).unwrap()
      );
      await Promise.allSettled(fetchPromises); // 等待刷新完成

    } catch (error) {
      // 7. 如果失败，给出错误提示
      console.error("开始审核失败:", error);
      const errorMessage = error?.message || '操作失败，请稍后重试';
      message.error(`开始审核失败: ${errorMessage}`);
    } finally {
      // 8. 无论成功与否，都结束加载状态
      setIsStartingReview(false);
    }
  }, [dispatch, filteredResumes]); // 依赖 dispatch 和 filteredResumes
  // --- ---

  // 分页逻辑
  const paginatedResumes = filteredResumes.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // 排序菜单
  const sortMenu = (
    <Menu>
      <Menu.Item key="time_desc" icon={<SortDescendingOutlined />} onClick={() => { setSortBy('time'); setSortOrder('desc'); }}>
        按时间倒序
      </Menu.Item>
      <Menu.Item key="time_asc" icon={<SortAscendingOutlined />} onClick={() => { setSortBy('time'); setSortOrder('asc'); }}>
        按时间正序
      </Menu.Item>
      <Menu.Item key="name_asc" icon={<SortAscendingOutlined />} onClick={() => { setSortBy('name'); setSortOrder('asc'); }}>
        按姓名正序
      </Menu.Item>
      <Menu.Item key="name_desc" icon={<SortDescendingOutlined />} onClick={() => { setSortBy('name'); setSortOrder('desc'); }}>
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
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          {/* 部门筛选 (如果需要且字段明确) */}
          {/* <Col xs={24} sm={12} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="部门筛选"
              // value={departmentFilter}
              // onChange={setDepartmentFilter}
              allowClear
            >
              <Option value="all">全部部门</Option>
              {departments.map(dept => (
                <Option key={dept} value={dept}>{dept}</Option>
              ))}
            </Select>
          </Col> */}
          <Col xs={24} sm={12} md={4}>
            {/* 修改状态筛选选项以匹配新的状态码 */}
            <Select
              style={{ width: '100%' }}
              placeholder="状态筛选"
              value={statusFilter}
              onChange={setStatusFilter}
              allowClear
            >
              <Option value="all">全部状态</Option>
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
          {/* --- 修改：添加“开始审核”按钮 --- */}
          <Col xs={24} sm={12} md={10} style={{ textAlign: 'right' }}> {/* 使用 Col 来布局，靠右对齐 */}
            <Space> {/* 使用 Space 组件来管理按钮间距 */}
              <Button
                type="primary" // 使用主要按钮样式
                danger // 使用危险色（红色）以示重要性
                onClick={handleStartReview} // 绑定点击事件
                loading={isStartingReview} // 绑定加载状态
                disabled={isStartingReview || adminLoading} // 在加载或列表加载时禁用
              >
                开始审核
              </Button>
              <div className="results-info">共找到 {filteredResumes.length} 份简历</div>
            </Space>
          </Col>
          {/* --- --- */}
        </Row>
      </div>
      <div className="list-header">
        <Title level={4}>简历管理</Title>
        <Text type="secondary">共 {filteredResumes.length} 份简历</Text>
      </div>
      <Spin spinning={adminLoading}>
        {adminLoading ? (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <Spin size="large" />
          </div>
        ) : (
          <>
            <List
              dataSource={paginatedResumes}
              grid={{
                gutter: 16,
                xs: 1,
                sm: 1,
                md: 2,
                lg: 3,
                xl: 3,
                xxl: 3,
              }}
              renderItem={(resume) => { // 这里的 resume 是从 /api/resumes/search 获取的完整对象
                const statusInfo = getStatusInfo(resume.status);
                const name = getFieldValueFromResume(resume, "姓名");
                const major = getFieldValueFromResume(resume, "专业");
                const dept = getFieldValueFromResume(resume, "期望部门");
                const email = getFieldValueFromResume(resume, "邮箱"); // 获取邮箱
                return (
                  <List.Item>
                    <Card
                      hoverable
                      className="resume-card"
                      actions={[
                        // 修改：传递整个 resume 对象
                        <Button type="link" icon={<EyeOutlined />} onClick={() => handleViewResume(resume)}>
                          查看
                        </Button>,
                        // 下载仍传递 resumeId
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
              current={currentPage}
              pageSize={pageSize}
              total={filteredResumes.length}
              onChange={(page, size) => {
                setCurrentPage(page);
                setPageSize(size);
              }}
              showSizeChanger
              showQuickJumper
              showTotal={(total) => `共 ${total} 条`}
            />
          </>
        )}
      </Spin>
    </div>
  );
};

export default ResumeList;