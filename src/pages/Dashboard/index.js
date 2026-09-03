// src/pages/Dashboard/index.js
import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Typography, Divider, Button, message } from 'antd';
import { readCanAttendOffline } from '@/utils/interviewIntent';
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
import { fetchMyResumeReadonly, fetchOpenCycles, setSelectedCycle } from '@/store/modules/resume';
import RecruitProgressCard from '@/components/RecruitProgressCard';
import CycleSwitcher from '@/components/CycleSwitcher';
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
  const { userInfo } = useSelector((state) => state.user);
  // 已录取的社员不再参加招新，进度卡（完善简历→提交→面试→结果）对他们没有意义
  const isMember = Boolean(userInfo?.isMember);
  const [hasInterview, setHasInterview] = useState(false);

  // 进入首页先拉一次「当前开放投递的周期」列表。
  // fetchOpenCycles 的 reducer 会把 store 里选中的 cycleId 校正到开放列表内，
  // 所以这里不用自己算该选哪个。
  useEffect(() => {
    dispatch(fetchOpenCycles());
  }, [dispatch]);

  // 简历状态跟着「选中的周期」重新拉 —— 必须单独一个 effect 且依赖 cycleId：
  // 首页现在有切换器了，如果还是只在挂载时拉一次，切到另一个周期后进度卡的
  // resumeStatus 会停在上一个周期的数据（RecruitProgressCard 自己会按 cycleId
  // 重拉它那三个接口，但 resumeStatus 是从这里传进去的）。
  const selectedCycleId = resumeState?.cycleId ?? null;

  // 选了「不能参加线下面试」的同学不会被排进线下场次，进度卡要换成线上路线。
  // 这个值藏在另一个字段的 JSON 里，解析见 readCanAttendOffline。
  const canAttendOffline = React.useMemo(
    () => readCanAttendOffline(resumeState?.resume?.simpleFields),
    [resumeState?.resume],
  );
  useEffect(() => {
    if (selectedCycleId != null) dispatch(fetchMyResumeReadonly(selectedCycleId));
  }, [dispatch, selectedCycleId]);

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
      const result = await dispatch(fetchMyResumeReadonly(selectedCycleId ?? 2)).unwrap();
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

      {/* 多周期同时在招时，首页也能切 —— 进度卡跟着切换的周期走。
          只有一个开放周期时 CycleSwitcher 自己返回 null，不占位。 */}
      <div style={{ maxWidth: 960, margin: '16px auto 0', padding: '0 16px' }}>
        <CycleSwitcher
          compact
          cycles={resumeState?.openCycles ?? []}
          value={Number(selectedCycleId)}
          onChange={(id) => dispatch(setSelectedCycle(id))}
        />
      </div>

      {/* 招新进度卡（方案三）：随时知道自己进行到哪一步。已是社员的不再显示 */}
      {!isMember && (
        <div style={{ maxWidth: 960, margin: '8px auto 0', padding: '0 16px' }}>
          <RecruitProgressCard
            cycleId={selectedCycleId ?? 2}
            resumeStatus={resumeState?.resume?.status ?? null}
            canAttendOffline={canAttendOffline}
          />
        </div>
      )}

      {/* 工作台：面试提醒 + 最新活动（无面试安排时活动卡自动铺满整行） */}
      <div style={{ maxWidth: 960, margin: '12px auto 0', padding: '0 16px' }}>
        <Row gutter={[12, 12]}>
          {hasInterview && (
            <Col xs={24} md={12}>
              <InterviewReminderCard cycleId={selectedCycleId ?? 2} onVisibleChange={setHasInterview} />
            </Col>
          )}
          <Col xs={24} md={hasInterview ? 12 : 24}>
            <ActivitiesPreviewCard />
          </Col>
          {!hasInterview && (
            <Col span={0} style={{ display: 'none' }}>
              <InterviewReminderCard cycleId={selectedCycleId ?? 2} onVisibleChange={setHasInterview} />
            </Col>
          )}
        </Row>
      </div>

      {/* 快捷入口：申请者看投递/进度，社员看活动/评测——两拨人关心的事不一样 */}
      <div style={{ maxWidth: 960, margin: '12px auto 24px', padding: '0 16px' }}>
        <Row gutter={[12, 12]}>
          {isMember ? (
            <>
              <Col xs={8}>
                <Card hoverable size="small" onClick={() => navigate('/Activities')} style={{ textAlign: 'center' }}>
                  <ScheduleOutlined style={{ fontSize: 22, color: '#1f76cc' }} />
                  <div style={{ marginTop: 6 }}>社团活动</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>公告 · 精彩瞬间</Text>
                </Card>
              </Col>
              <Col xs={8}>
                <Card hoverable size="small" onClick={() => navigate('/main/evaluations')} style={{ textAlign: 'center' }}>
                  <FileTextOutlined style={{ fontSize: 22, color: '#1f76cc' }} />
                  <div style={{ marginTop: 6 }}>autograding</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>评测成绩</Text>
                </Card>
              </Col>
            </>
          ) : (
            <>
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
            </>
          )}
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