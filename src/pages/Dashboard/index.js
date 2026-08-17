// src/pages/Dashboard/index.js
import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Typography, Divider, Button, message } from 'antd';
import {
  CodeOutlined,
  TeamOutlined,
  CalendarOutlined,
  UserOutlined,
  TrophyOutlined,
  ProjectOutlined,
  BookOutlined,
  BulbOutlined,
  CoffeeOutlined,
  SendOutlined,
  SmileOutlined,
  StarOutlined,
  IdcardOutlined,
  FileTextOutlined,
  ScheduleOutlined,
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchMyResumeReadonly, fetchActiveCycle } from '@/store/modules/resume';
import RecruitProgressCard from '@/components/RecruitProgressCard';
import InterviewReminderCard from '@/components/InterviewReminderCard';
import ActivitiesPreviewCard from '@/components/ActivitiesPreviewCard';
import './index.scss';

const { Title, Text, Paragraph } = Typography;

const departments = [
  {
    name: '项目部',
    icon: <ProjectOutlined />,
    description: '负责项目规划、进度管理和团队协作',
    color: '#4da6ff',
    features: ['前端开发', '后端开发', '项目管理', '质量保证'],
    detail: '项目部负责统筹社团各类项目，确保项目按时高质量完成，培养成员的项目管理能力和前后端开发技能。'
  },
  {
    name: '技术部',
    icon: <CodeOutlined />,
    description: '负责技术学习、技术分享和创新实践',
    color: '#6c7ae0',
    features: ['技术研究', '技术分享', '创新实践', '问题解决'],
    detail: '技术部专注于各种前沿技术的学习和应用，组织技术分享和创新实践活动，提升社员的技术能力。'
  },
  {
    name: '媒体部',
    icon: <TeamOutlined />,
    description: '负责社团宣传、内容创作和品牌建设',
    color: '#ff9c6e',
    features: ['内容创作', '品牌宣传', '活动推广', '社交媒体'],
    detail: '媒体部负责社团的对外宣传和品牌建设，创作优质内容，扩大社团影响力。'
  },
  {
    name: '综合部',
    icon: <BookOutlined />,
    description: '负责资源整合、活动组织和内部协调',
    color: '#36cfc9',
    features: ['资源管理', '活动组织', '内部协调', '会员服务'],
    detail: '综合部负责社团内部协调和资源整合，组织各类活动，为社员提供全方位的服务和支持。'
  }
];

const achievements = [
  {
    title: '优秀社员',
    count: '100+',
    icon: <UserOutlined />
  },
  {
    title: '项目成果',
    count: '50+',
    icon: <ProjectOutlined />
  },
  {
    title: '竞赛奖项',
    count: '30+',
    icon: <TrophyOutlined />
  },
  {
    title: '社团活动',
    count: '80+',
    icon: <CalendarOutlined />
  }
];

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const resumeState = useSelector((state) => state.resume);
  const [hasInterview, setHasInterview] = useState(false);

  // 进入首页：解析活跃周期（动态化，不再硬编码），再拉取简历状态驱动进度卡
  useEffect(() => {
    (async () => {
      let cid = 2;
      try {
        const active = await dispatch(fetchActiveCycle()).unwrap();
        if (active != null) cid = active;
      } catch (e) { /* 回退默认周期 */ }
      dispatch(fetchMyResumeReadonly(cid));
    })();
  }, [dispatch]);

  // 简历投递
  const handleGoToResume = () => {
    navigate('/main/publish');
  };

  // 我的预约
  const handleGoToAppointment = async () => {
    const resume = resumeState?.resume;
    // 如果 store 中已有已提交的简历，直接跳转
    if (resume && resume.status >= 2) {
      navigate('/main/interview-appointment');
      return;
    }

    // 尝试从后端获取最新简历状态
    try {
      const result = await dispatch(fetchMyResumeReadonly(resumeState?.cycleId ?? 2)).unwrap();
      const resumeData = result?.data || result;
      if (resumeData && resumeData.status >= 2) {
        navigate('/main/interview-appointment');
      } else {
        message.warning('请先投递简历后再进行面试预约');
      }
    } catch (err) {
      message.warning('请先投递简历后再进行面试预约');
    }
  };

  return (
    <div className="dashboard-page">
      {/* 欢迎横幅 */}
      <div className="dashboard-banner">
        <div className="banner-content">
          <Title level={1} className="banner-title">
            欢迎来到<span className="title-accent">博远信息技术社</span>
          </Title>
          <Text className="banner-subtitle">
            卓越技术 · 绝佳创意 · 实践平台
          </Text>
        </div>
      </div>

      {/* 招新进度卡（方案三）：随时知道自己进行到哪一步 */}
      <div style={{ maxWidth: 960, margin: '16px auto 0', padding: '0 16px' }}>
        <RecruitProgressCard cycleId={resumeState?.cycleId ?? 2} resumeStatus={resumeState?.resume?.status ?? null} />
      </div>

      {/* 工作台：面试提醒 + 最新活动（无面试安排时活动卡自动铺满整行） */}
      <div style={{ maxWidth: 960, margin: '12px auto 0', padding: '0 16px' }}>
        <Row gutter={[12, 12]}>
          {hasInterview && (
            <Col xs={24} md={12}>
              <InterviewReminderCard cycleId={resumeState?.cycleId ?? 2} onVisibleChange={setHasInterview} />
            </Col>
          )}
          <Col xs={24} md={hasInterview ? 12 : 24}>
            <ActivitiesPreviewCard />
          </Col>
          {!hasInterview && (
            <Col span={0} style={{ display: 'none' }}>
              <InterviewReminderCard cycleId={resumeState?.cycleId ?? 2} onVisibleChange={setHasInterview} />
            </Col>
          )}
        </Row>
      </div>

      {/* 快捷入口 */}
      <div style={{ maxWidth: 960, margin: '12px auto 24px', padding: '0 16px' }}>
        <Row gutter={[12, 12]}>
          <Col xs={8}>
            <Card hoverable size="small" onClick={handleGoToResume} style={{ textAlign: 'center' }}>
              <FileTextOutlined style={{ fontSize: 22, color: '#1f76cc' }} />
              <div style={{ marginTop: 6 }}>简历投递</div>
              <Text type="secondary" style={{ fontSize: 12 }}>填写或修改</Text>
            </Card>
          </Col>
          <Col xs={8}>
            <Card hoverable size="small" onClick={() => navigate('/main/interview-appointment')} style={{ textAlign: 'center' }}>
              <ScheduleOutlined style={{ fontSize: 22, color: '#1f76cc' }} />
              <div style={{ marginTop: 6 }}>申请进度</div>
              <Text type="secondary" style={{ fontSize: 12 }}>时间线与结果</Text>
            </Card>
          </Col>
          <Col xs={8}>
            <Card hoverable size="small" onClick={() => navigate('/main/person')} style={{ textAlign: 'center' }}>
              <UserOutlined style={{ fontSize: 22, color: '#1f76cc' }} />
              <div style={{ marginTop: 6 }}>个人主页</div>
              <Text type="secondary" style={{ fontSize: 12 }}>资料 · 历届申请</Text>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default Dashboard;