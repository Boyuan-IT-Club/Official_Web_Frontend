// src/pages/Land/index.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Row, Col, Typography, Space } from 'antd';
import { RocketOutlined, TeamOutlined, CodeOutlined, CalendarOutlined, UserOutlined, LoginOutlined, FileTextOutlined } from '@ant-design/icons';
import logo from '../../assets/SingleLogo.png'; // 导入logo图片
import './index.scss';

const { Title, Text, Paragraph } = Typography;

const Land = () => {
  const navigate = useNavigate();

  const handleApplyClick = () => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/main/publish');
    } else {
      navigate('/login');
    }
  };

  const handleLoginClick = () => {
    navigate('/login');
  };

  const handleExploreClick = () => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/main/dashboard');
    } else {
      navigate('/login');
    }
  };

  const featureItems = [
    {
      icon: <CodeOutlined />,
      title: '技术学习',
      description: '前沿技术，项目实践'
    },
    {
      icon: <TeamOutlined />,
      title: '团队协作',
      description: '志同道合，共同成长'
    },
    {
      icon: <RocketOutlined />,
      title: '实践机会',
      description: '校企合作，真实项目'
    },
    {
      icon: <CalendarOutlined />,
      title: '丰富活动',
      description: '技术分享，竞赛指导'
    }
  ];

  return (
    <div className="land-page">
      {/* 顶部导航栏 */}
      <header className="land-header">
        <div className="header-container">
          <div className="logo-container" onClick={() => navigate('/')}>
            <img src={logo} alt="博远信息技术社" className="header-logo" />
            <span className="logo-text">博远信息技术社</span>
          </div>
          <Space>
            <Button 
              type="primary"
              size="middle"
              icon={<LoginOutlined />}
              onClick={handleLoginClick}
              className="login-button"
            >
              登录/注册
            </Button>
          </Space>
        </div>
      </header>

      {/* 背景装饰元素 */}
      <div className="background-elements">
        <div className="bg-circle bg-circle-1"></div>
        <div className="bg-circle bg-circle-2"></div>
        <div className="bg-circle bg-circle-3"></div>
        <div className="bg-dots"></div>
      </div>

      {/* 主内容区域 */}
      <main className="land-content">
        <Row justify="space-between" align="middle" className="main-content">
          <Col xs={24} lg={10} className="welcome-section">
            <div className="welcome-content">
              <div className="title-wrapper">
                <Title level={1} className="main-title">
                  博远信息
                  <span className="title-accent">技术社</span>
                </Title>
              </div>
              <Paragraph className="subtitle">
                卓越技术 · 绝佳创意 · 实践平台
              </Paragraph>
              <Text className="description">
                博远信息技术社，是为卓越技术与绝佳创意量身打造的实践沃土。在这里，无论你来自哪个专业，只要对IT抱有好奇与热爱，都能找到志同道合的伙伴，一起学习，共同成长。
                <span className="highlight">聚集有热情、有想法的伙伴，建立最温馨、能传承的社团</span>。
                社团的发展根基是唐博远学姐（现为学校教师）牵头创立的博远工作室，社团与学校各级组织及多家社会企业保持着紧密联动，从校内信息化项目开发到企业真实业务案例实训，为社员提供了多元而宝贵的实践机会。
                <span className="highlight">培养会技术、敢创造的社员，打造重实践、促成长的平台</span>。
              </Text>
              <div className="stats-container">
                <div className="stat-item">
                  <div className="stat-number">8年</div>
                  <div className="stat-label">深厚积淀</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">100+</div>
                  <div className="stat-label">优秀社员</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">众多</div>
                  <div className="stat-label">合作资源</div>
                </div>
              </div>
              <div className="action-buttons">
                <Button 
                  type="primary" 
                  size="large" 
                  className="explore-button"
                  onClick={handleExploreClick}
                >
                  <RocketOutlined />
                    探索更多
                </Button>
              </div>
            </div>
          </Col>
          
          <Col xs={24} lg={12} className="card-section">
            <div className="card-wrapper">
              <Card className="application-card">
                <div className="card-header">
                  <div className="card-icon">
                    <UserOutlined />
                  </div>
                  <Title level={3} className="card-title">加入博远</Title>
                  <Text className="card-subtitle">
                    开启技术成长之旅
                  </Text>
                </div>
                
                <div className="card-features">
                  <Row gutter={[12, 12]}>
                    {featureItems.map((item, index) => (
                      <Col xs={12} key={index}>
                        <div className="feature-item">
                          <span className="feature-icon">{item.icon}</span>
                          <div className="feature-content">
                            <Text strong className="feature-title">{item.title}</Text>
                            <Text type="secondary" className="feature-desc">{item.description}</Text>
                          </div>
                        </div>
                      </Col>
                    ))}
                  </Row>
                </div>

                <div className="card-actions">
                  <Button 
                    type="primary" 
                    size="large" 
                    className="card-apply-button"
                    onClick={handleApplyClick}
                    block
                  >
                    <FileTextOutlined />
                    投递简历
                  </Button>
                  <div className="apply-hint">
                  </div>
                </div>
              </Card>
            </div>
          </Col>
        </Row>
      </main>

      {/* 联系信息 */}
      <section className="contact-section">
        <div className="contact-content">
          <Title level={4} className="contact-title">了解更多</Title>
          <div className="contact-items">
            <div className="contact-item">
              <span className="contact-label">答疑QQ群：</span>
              <span className="contact-value">765667302</span>
            </div>
            <div className="contact-item">
              <span className="contact-label">官方公众号：</span>
              <span className="contact-value">ECNUCoder</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Land;