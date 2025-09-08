import React, { useState, useEffect } from 'react';
import { Layout as AntdLayout, Menu, Avatar, Typography } from 'antd';
import { UserOutlined, HomeOutlined, FileTextOutlined } from '@ant-design/icons';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUserInfo } from '@/store/modules/user';
import logo from '../../assets/SingleLogo.png';
import './index.scss';

const { Header, Sider, Content } = AntdLayout;
const { Text } = Typography;

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const dispatch = useDispatch();
  const { userInfo, loading } = useSelector((state) => state.user);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    dispatch(fetchUserInfo());
  }, [dispatch]);

  const getAvatarUrl = () => {
    if (!userInfo?.avatar) return null;
    
    if (userInfo.avatar.startsWith('http')) {
      return userInfo.avatar;
    }
    
    if (userInfo.avatar.startsWith('/')) {
      return `https://official.boyuan.club${userInfo.avatar}`;
    }
    
    return userInfo.avatar;
  };

  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: '首页',
    },
    {
      key: '/publish',
      icon: <FileTextOutlined />,
      label: '简历投递',
    },
    {
      key: '/person',
      icon: <UserOutlined />,
      label: '个人主页',
    },
  ];

  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  const selectedKeys = [location.pathname];

  return (
    <AntdLayout className="main-layout" style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={220}
        className="tech-sider"
        style={{
          position: 'fixed',
          height: '100vh',
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        <div className="sider-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <img src={logo} alt="博远信息技术社" className="logo-image" />
          {!collapsed && <div className="logo-glow"></div>}
        </div>

        <Menu
          theme="dark"
          selectedKeys={selectedKeys}
          mode="inline"
          items={menuItems}
          className="tech-menu"
          onClick={handleMenuClick}
        />
      </Sider>

      <AntdLayout 
        className="site-layout" 
        style={{ 
          marginLeft: collapsed ? 80 : 220,
          transition: 'margin-left 0.3s ease',
          minHeight: '100vh'
        }}
      >
        <Header className="tech-header">
          {loading ? (
            <Text type="secondary">加载中...</Text>
          ) : (
            <div className="header-user">
              <Avatar
                src={getAvatarUrl()}
                icon={<UserOutlined />}
                className="user-avatar"
              />
              <span className="username">{userInfo?.name || '未登录用户'}</span>
            </div>
          )}
        </Header>

        <Content className="site-content">
          <div className="content-container">
            <Outlet context={{ userInfo }} />
          </div>
        </Content>
      </AntdLayout>
    </AntdLayout>
  );
};

export default MainLayout;