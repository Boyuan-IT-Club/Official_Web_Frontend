import React, { useState, useEffect } from 'react';
import { Layout as AntdLayout, Menu, Avatar, Typography, Dropdown, message } from 'antd';
import { UserOutlined, HomeOutlined, FileTextOutlined, LogoutOutlined, FolderOpenOutlined } from '@ant-design/icons'; // 导入新图标
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUserInfo, logout } from '@/store/modules/user';
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
  // 根据用户角色动态生成菜单项
  const menuItems = [
    {
      key: '/main/dashboard',
      icon: <HomeOutlined />,
      label: '首页',
    },
    {
      key: '/main/publish',
      icon: <FileTextOutlined />,
      label: '简历投递',
    },
    {
      key: '/main/person',
      icon: <UserOutlined />,
      label: '个人主页',
    },
  ];
  // 如果用户角色是 ADMIN，则添加简历查看菜单项
  if (userInfo?.role === 'ADMIN') {
    menuItems.push({
      key: '/main/resume', // 确保路由配置中已添加此路径
      icon: <FolderOpenOutlined />, // 使用合适的图标
      label: '简历查看',
    });
  }
  const handleMenuClick = ({ key }) => {
    navigate(key);
  };
  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
    message.success('已成功退出登录');
  };
  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
      onClick: () => navigate('/main/person')
    },
    {
      type: 'divider'
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
      danger: true
    }
  ];
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
          zIndex: 100,
        }}
      >
        <div className="sider-logo"  style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
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
              <Dropdown
                menu={{
                  items: userMenuItems
                }}
                placement="bottomRight"
                trigger={['click']}
              >
                <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '8px 12px', borderRadius: '6px' }}>
                  <Avatar
                    src={getAvatarUrl()}
                    icon={<UserOutlined />}
                    className="user-avatar"
                  />
                  <span className="username" style={{ marginLeft: '8px', marginRight: '4px' }}>
                    {userInfo?.name || '未登录用户'}
                  </span>
                </div>
              </Dropdown>
            </div>
          )}
        </Header>
        <Content className="site-content">
          <div className="content-container">
            {/* 传递原始 userInfo 和获取到的 userRole */}
            <Outlet context={{ userInfo, userRole: userInfo?.role }} />
          </div>
        </Content>
      </AntdLayout>
    </AntdLayout>
  );
};
export default MainLayout;