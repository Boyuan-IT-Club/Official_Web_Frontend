// src/pages/Dashboard/index.js
import React from 'react';
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
import { fetchOrCreateResume } from '@/store/modules/resume';
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
      const result = await dispatch(fetchOrCreateResume(2)).unwrap();
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

      {/* 社团招新 */}
      <section className="recruitment-section">
        <div className="section-header">
          <Title level={2}>社团招新</Title>
          <Text type="secondary">期待每一个热爱技术的你</Text>
        </div>

        <Row gutter={[24, 24]} className="recruitment-cards">
          <Col xs={24} md={8}>
            <Card className="recruitment-card">
              <div className="recruitment-icon" style={{ backgroundColor: 'rgba(77, 166, 255, 0.1)', color: '#4da6ff' }}>
                <SendOutlined />
              </div>
              <Title level={4}>招新对象</Title>
              <Text>面向全校各年级、各专业同学，只要热爱技术、愿意学习，博远信息技术社都欢迎你的加入</Text>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card className="recruitment-card">
              <div className="recruitment-icon" style={{ backgroundColor: 'rgba(108, 122, 224, 0.1)', color: '#6c7ae0' }}>
                <StarOutlined />
              </div>
              <Title level={4}>你将收获</Title>
              <Text>系统的技术培训体系、真实项目实战机会、志同道合的伙伴团队、丰富的竞赛与实践资源</Text>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card className="recruitment-card">
              <div className="recruitment-icon" style={{ backgroundColor: 'rgba(255, 156, 110, 0.1)', color: '#ff9c6e' }}>
                <SmileOutlined />
              </div>
              <Title level={4}>招新要求</Title>
              <Text>零基础也能来！我们更看重你的学习热情和团队精神，这里有完善的培养体系助你成长</Text>
            </Card>
          </Col>
        </Row>

        <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
          <Col xs={24}>
            <Card className="recruitment-cta-card">
              <div className="recruitment-cta-content">
                <div className="cta-text">
                  <Title level={3} style={{ color: '#fff', marginBottom: 8 }}>
                    2026 秋季招新正在进行中
                  </Title>
                  <div className="cta-buttons">
                    <Button
                      type="primary"
                      size="large"
                      icon={<FileTextOutlined />}
                      onClick={handleGoToResume}
                      className="cta-btn cta-btn--resume"
                    >
                      简历投递
                    </Button>
                    <Button
                      size="large"
                      icon={<ScheduleOutlined />}
                      onClick={handleGoToAppointment}
                      className="cta-btn cta-btn--appointment"
                    >
                      我的预约
                    </Button>
                  </div>
                </div>
                <div className="cta-action">
                  <div className="cta-qrcode-placeholder">
                    <IdcardOutlined style={{ fontSize: 48, color: '#fff' }} />
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4, display: 'block' }}>
                      ECNUCoder
                    </Text>
                  </div>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      </section>

      {/* 社团成就 */}
      <section className="achievement-section">
        <div className="section-header">
          <Title level={2}>社团成就</Title>
          <Text type="secondary">八年积淀，硕果累累</Text>
        </div>
        <Row gutter={[24, 24]} className="achievement-cards">
          {achievements.map((item, index) => (
            <Col xs={12} sm={12} md={6} key={index}>
              <Card className="achievement-card">
                <div className="achievement-icon" style={{ color: item.color }}>
                  {item.icon}
                </div>
                <div className="achievement-content">
                  <div className="achievement-count">{item.count}</div>
                  <div className="achievement-title">{item.title}</div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </section>

      {/* 部门介绍 */}
      <section className="departments-section">
        <div className="section-header">
          <Title level={2}>我们的部门</Title>
          <Text type="secondary">四大核心部门，各司其职</Text>
        </div>
        
        <Row gutter={[24, 24]} className="department-cards">
          {departments.map((dept, index) => (
            <Col xs={24} md={12} key={index}>
              <Card className="department-card">
                <div className="department-header">
                  <div 
                    className="department-icon"
                    style={{ backgroundColor: `${dept.color}15`, color: dept.color }}
                  >
                    {dept.icon}
                  </div>
                  <div className="department-title">
                    <Title level={4} style={{ color: dept.color, margin: 0 }}>
                      {dept.name}
                    </Title>
                    <Text type="secondary">{dept.description}</Text>
                  </div>
                </div>
                
                <Divider style={{ margin: '16px 0' }} />
                
                <div className="department-features">
                  <Text strong>主要职能：</Text>
                  <div className="feature-tags">
                    {dept.features.map((feature, i) => (
                      <div key={i} className="feature-tag">
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </section>

      {/* 社团活动 */}
      <section className="activities-section">
        <div className="section-header">
          <Title level={2}>社团活动</Title>
          <Text type="secondary">丰富多彩的技术与交流活动</Text>
        </div>
        
        <Row gutter={[24, 24]}>
          <Col xs={24} md={8}>
            <Card className="activity-card">
              <div className="activity-icon" style={{ backgroundColor: 'rgba(77, 166, 255, 0.1)', color: '#4da6ff' }}>
                <CodeOutlined />
              </div>
              <Title level={4}>Owner-Pro 项目工坊</Title>
              <Text>从前端到后端，从设计到部署，系统学习网站制作全流程，打造属于自己的数字作品</Text>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card className="activity-card">
              <div className="activity-icon" style={{ backgroundColor: 'rgba(255, 156, 110, 0.1)', color: '#ff9c6e' }}>
                <BulbOutlined />
              </div>
              <Title level={4}>创意头脑风暴</Title>
              <Text>双创项目灵感碰撞，志同道合伙伴组队，让创意在交流中绽放，让梦想在协作中实现</Text>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card className="activity-card">
              <div className="activity-icon" style={{ backgroundColor: 'rgba(54, 207, 201, 0.1)', color: '#36cfc9' }}>
                <CoffeeOutlined />
              </div>
              <Title level={4}>社团温馨团建</Title>
              <Text>技术之外的轻松时光，聚会玩耍中加深情谊，在欢声笑语中构建温暖的社团大家庭</Text>
            </Card>
          </Col>
        </Row>
      </section>

      {/* 加入我们 */}
      <section className="join-section">
        <Card className="join-card">
          <div className="join-content">
            <Title level={2}>加入博远信息技术社</Title>
            <Paragraph>
              无论你是技术小白还是编程高手，只要对IT技术充满热情，都欢迎加入我们！
              在这里你将获得技术提升、项目实践、团队协作和职业发展的全方位成长。
            </Paragraph>
            <div className="contact-info">
              <div className="contact-item">
                <Text strong>答疑QQ群：</Text>
                <Text>765667302</Text>
              </div>
              <div className="contact-item">
                <Text strong>官方公众号：</Text>
                <Text>ECNUCoder</Text>
              </div>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
};

export default Dashboard;