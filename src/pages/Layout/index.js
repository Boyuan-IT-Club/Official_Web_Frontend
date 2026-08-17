import React, { useState, useEffect } from "react";
import {
  Layout as AntdLayout,
  Menu,
  Avatar,
  Typography,
  Dropdown,
  message,
} from "antd";
import {
  UserOutlined,
  HomeOutlined,
  FileTextOutlined,
  CodeOutlined,
  LogoutOutlined,
} from "@ant-design/icons"; // 导入新图标
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchUserInfo, logout } from "@/store/modules/user";
import logo from "../../assets/SingleLogo.png";
import "./index.scss";
import { useAppDispatch } from "@/store/hooks";

const { Header, Sider, Content } = AntdLayout;
const { Text } = Typography;
const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const dispatch = useAppDispatch();
  const { userInfo, loading } = useSelector((state) => state.user);
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (userInfo?.role) return;
    dispatch(fetchUserInfo());
  }, [dispatch]);
  const getAvatarUrl = () => {
    if (!userInfo?.avatar) return null;
    if (userInfo.avatar.startsWith("http")) {
      return userInfo.avatar;
    }
    if (userInfo.avatar.startsWith("/")) {
      return `https://official.boyuan.club${userInfo.avatar}`;
    }
    return userInfo.avatar;
  };
  // 根据用户角色动态生成菜单项
  const menuItems = [
    {
      key: "/main/dashboard",
      icon: <HomeOutlined />,
      label: "首页",
    },
    {
      key: "/main/publish",
      icon: <FileTextOutlined />,
      label: "简历投递",
    },
    {
      key: "/main/person",
      icon: <UserOutlined />,
      label: "个人主页",
    },
    {
      key: "/main/evaluations",
      icon: <CodeOutlined />,
      label: "autograding",
    },
    // 管理功能已迁移到独立管理端 admin.boyuan.club（用户端产物不含管理代码）
  ];

  const handleMenuClick = ({ key }) => {
    navigate(key);
  };
  const handleLogout = async () => {
    try {
      await dispatch(logout());
    } finally {
      navigate("/", { replace: true });
      message.success("已成功退出登录");
    }
  };
  const userMenuItems = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "个人资料",
      onClick: () => navigate("/main/person"),
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "退出登录",
      onClick: handleLogout,
      danger: true,
    },
  ];
  const selectedKeys = [location.pathname];

  // 顶栏左侧显示当前页面名：原先左侧空着，右上角的用户信息孤零零贴着边
  const currentPageTitle =
    menuItems.find((m) => m.key === location.pathname)?.label ?? "博远信息技术社";
  return (
    <AntdLayout className="main-layout" style={{ minHeight: "100vh" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={220}
        className="tech-sider"
        style={{
          position: "fixed",
          height: "100vh",
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
        }}
      >
        <div
          className="sider-logo"
          style={{ cursor: "pointer" }}
          onClick={() => navigate("/")}
        >
          <img src={logo} alt="博远信息技术社" className="logo-image" />
          {/* 原先这里是一层 radial-gradient 发光 + pulse 呼吸动画，是全站最显年代感的一处；
              换成社团名——侧栏只有一个居中 logo 时认不出是哪个站。折叠时隐藏文字。 */}
          {!collapsed && <span className="logo-text">博远技术社</span>}
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
          transition: "margin-left 0.15s ease",
          minHeight: "100vh",
        }}
      >
        <Header className="tech-header">
          <span className="header-page-title">{currentPageTitle}</span>
          {loading ? (
            <Text type="secondary">加载中...</Text>
          ) : (
            <div className="header-user">
              <Dropdown
                menu={{
                  items: userMenuItems,
                }}
                placement="bottomRight"
                trigger={["click"]}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    cursor: "pointer",
                    padding: "8px 12px",
                    borderRadius: "6px",
                  }}
                >
                  <Avatar
                    src={getAvatarUrl()}
                    icon={<UserOutlined />}
                    className="user-avatar"
                  />
                  <span
                    className="username"
                    style={{ marginLeft: "8px", marginRight: "4px" }}
                  >
                    {userInfo?.name || "未登录用户"}
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
