import React from 'react';
import { Layout, Button, Avatar, Typography, Menu } from 'antd';
import { TeamOutlined, CalendarOutlined, FileTextOutlined, UserOutlined } from '@ant-design/icons';
import './index.scss';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/SingleLogo.png';

const { Header, Content, Footer } = Layout;
const { Text } = Typography;

const HomePage = () => {
    const navigate = useNavigate();
  const navItems = [
    { key: 'about', icon: <TeamOutlined />, label: '社团简介' },
    { key: 'activities', icon: <CalendarOutlined />, label: '社团活动' },
    { key: 'members', icon: <UserOutlined />, label: '社团成员' },
    { key: 'admin', icon: <UserOutlined />, label: '管理员入口' }
  ];
  const onNavigate = (key) => {
    if (key === 'login') {
      navigate('/login');}}
  return (
    <Layout className="home-layout">
      {/* 科技感流动背景 */}
      <div className="background-watermark"></div>
      
      <Header className="home-header">
        <div className="header-content">
          <div className="logo-title">
            <Avatar src={logo} size={48} />
            <h3 className="title-text">博远信息技术社</h3>
          </div>
          <Menu
            theme="light"
            mode="horizontal"
            items={navItems}
            className="nav-menu"
            onClick={({ key }) => onNavigate(key)}
          />
          <Button 
            type="primary" 
            className="login-button"
            onClick={() => onNavigate('login')}
          >
            登录/注册
          </Button>
        </div>
      </Header>
      
      <Content className="home-content">
        <div className="recruitment-hero">
          {/* 艺术字标题 */}
          <div className="art-title">
            <span className="art-text">欢迎加入博远信息技术社</span>
          </div>
          {/* 艺术字副标题 */}
          <div className="art-subtitle">
            <span>与优秀的人一起，探索技术的无限可能</span>
          </div>
          
          <div className="cta-buttons">
            <Button 
              type="primary" 
              size="large" 
              className="apply-button"
              icon={<FileTextOutlined />}
              onClick={() => onNavigate('resume')}
            >
              立即投递简历
            </Button>
          </div>
        </div>
      </Content>
      
      <Footer className="home-footer">
        <Text>© {new Date().getFullYear()} 博远信息技术社 版权所有</Text>
      </Footer>
    </Layout>
  );
};

export default HomePage;