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
  LogoutOutlined,
  FolderOpenOutlined,
  ControlOutlined,
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
// 删掉原来的 menuItems 数组，替换成下面这段
const role = userInfo?.role;

const allMenuItems = [
  {
    key: "/main/dashboard",
    icon: <HomeOutlined />,
    label: "首页",
    roles: ["user", "admin"],
  },
  {
    key: "/main/publish",
    icon: <FileTextOutlined />,
    label: "简历投递",
    roles: ["user", "admin"],
  },
  {
    key: "/main/person",
    icon: <UserOutlined />,
    label: "个人主页",
    roles: ["user", "admin"],
  },
  {
    key: "/main/resume",
    icon: <FolderOpenOutlined />,
    label: "简历查看",
    roles: ["admin"],          // 🔒 仅管理员
  },
  {
    key: "/main/manage",
    icon: <ControlOutlined />,
    label: "管理",
    roles: ["admin"],          // 🔒 仅管理员
  },
];

// role 未加载完成时先展示所有，加载完成后按角色过滤
const menuItems = allMenuItems
  .filter(item => !role || item.roles.includes(role))
  .map(({ roles, ...rest }) => rest); // 去掉 roles 字段，Antd 不需要它

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
          transition: "margin-left 0.3s ease",
          minHeight: "100vh",
        }}
      >
        <Header className="tech-header">
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
