import React, { useState, useEffect } from 'react';
import { Layout as AntdLayout, Menu, Avatar, Typography } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { Outlet, Link, useLocation } from 'react-router-dom'; // 添加 useLocation
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
  const location = useLocation(); // 获取当前路由位置

  useEffect(() => {
    dispatch(fetchUserInfo());
  }, [dispatch]);

  // 获取完整的头像URL（安全处理）
  const getAvatarUrl = () => {
    if (!userInfo?.avatar) return null;
    
    // 如果已经是完整URL，直接使用
    if (userInfo.avatar.startsWith('http')) {
      return userInfo.avatar;
    }
    
    // 如果是相对路径，拼接完整URL
    if (userInfo.avatar.startsWith('/')) {
      return `http://43.143.27.198:8080${userInfo.avatar}`;
    }
    
    return userInfo.avatar;
  };

  const menuItems = [
    {
      key: '/publish',
      label: <Link to="/publish">简历投递</Link>,
    },
    {
      key: '/person',
      label: <Link to="/person">个人主页</Link>,
    },
  ];

  // 根据当前路径设置选中的菜单项
  const selectedKeys = [location.pathname];

  return (
    <AntdLayout className="main-layout" style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={220}
        className="tech-sider"
      >
        <div className="sider-logo">
          <img src={logo} alt="博远信息技术社" className="logo-image" />
          {!collapsed && <div className="logo-glow"></div>}
        </div>

        <Menu
          theme="dark"
          selectedKeys={selectedKeys} // 动态设置选中的菜单项
          mode="inline"
          items={menuItems}
          className="tech-menu"
        />
      </Sider>

      <AntdLayout className="site-layout">
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