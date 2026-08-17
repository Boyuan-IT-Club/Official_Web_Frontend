import React, { useEffect, useMemo, useState } from "react";
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
  TeamOutlined,
  FolderOpenOutlined,
  CalendarOutlined,
  ScheduleOutlined,
  FormOutlined,
  FlagOutlined,
  CodeOutlined,
  LogoutOutlined,
  ExportOutlined,
} from "@ant-design/icons";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { fetchUserInfo, logout } from "@/store/modules/user";
import { useAppDispatch } from "@/store/hooks";
import { getToken } from "@/utils";
import { getJwtPermissionCodes } from "@/utils/jwt";
import logo from "../../assets/SingleLogo.png";
import "./index.scss";

const { Header, Sider, Content } = AntdLayout;
const { Text } = Typography;

/** 菜单项与所需权限码（任一满足即显示；undefined 表示登录即可见） */
const MENU_DEFS: Array<{
  key: string;
  icon: React.ReactNode;
  label: string;
  anyOf?: string[];
}> = [
  { key: "/manage", icon: <TeamOutlined />, label: "用户与角色", anyOf: ["admin:manage", "role:assign", "dept:manage", "resume:audit"] },
  { key: "/resumes", icon: <FolderOpenOutlined />, label: "简历审核", anyOf: ["resume:view", "resume:audit"] },
  { key: "/cycles", icon: <CalendarOutlined />, label: "招募周期", anyOf: ["cycle:manage"] },
  { key: "/interviews", icon: <ScheduleOutlined />, label: "面试管理", anyOf: ["resume:audit", "resume:view"] },
  { key: "/evaluation", icon: <FormOutlined />, label: "面试评价表", anyOf: ["resume:audit", "interview:evaluate"] },
  { key: "/activities", icon: <FlagOutlined />, label: "活动管理", anyOf: ["activity:manage"] },
  { key: "/evaluations", icon: <CodeOutlined />, label: "autograding", anyOf: ["evaluation:view"] },
];

const AdminLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const dispatch = useAppDispatch();
  const { userInfo } = useSelector((state: any) => state.user);
  const location = useLocation();
  const navigate = useNavigate();

  const permCodes = useMemo(() => getJwtPermissionCodes(getToken()), []);

  useEffect(() => {
    if (userInfo?.username) return;
    dispatch(fetchUserInfo());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  const menuItems = useMemo(
    () =>
      MENU_DEFS.filter(
        (m) => !m.anyOf || m.anyOf.some((code) => permCodes.includes(code))
      ).map(({ key, icon, label }) => ({ key, icon, label })),
    [permCodes]
  );

  const handleLogout = async () => {
    try {
      await dispatch(logout() as any);
    } finally {
      navigate("/login", { replace: true });
      message.success("已退出登录");
    }
  };

  const userMenuItems = [
    {
      key: "user-site",
      icon: <ExportOutlined />,
      label: "返回官网",
      onClick: () => {
        window.location.href = "https://official.boyuan.club";
      },
    },
    { type: "divider" as const },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "退出登录",
      onClick: handleLogout,
      danger: true,
    },
  ];

  // 选中当前一级路径
  const selectedKeys = ["/" + (location.pathname.split("/")[1] || "manage")];

  // 头部左侧显示当前页面名——原先放的是一个「管理端」标签，占位却不提供信息
  const currentTitle =
    MENU_DEFS.find((m) => m.key === selectedKeys[0])?.label ?? "管理后台";

  return (
    <AntdLayout className="admin-layout" style={{ minHeight: "100vh" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={220}
        theme="light"
        style={{
          position: "fixed",
          height: "100vh",
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
          borderRight: "1px solid #e8e8ed",
        }}
      >
        <div className="admin-sider-logo" onClick={() => navigate("/manage")} style={{ cursor: "pointer" }}>
          <img src={logo} alt="博远信息技术社" className="logo-image" />
          {!collapsed && <span className="logo-text">管理后台</span>}
        </div>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={selectedKeys}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <AntdLayout style={{ marginLeft: collapsed ? 80 : 220, transition: "margin-left 0.2s" }}>
        <Header className="admin-header">
          <span className="admin-page-title">{currentTitle}</span>
          <Dropdown menu={{ items: userMenuItems as any }} placement="bottomRight">
            <div className="admin-user">
              <Avatar size="small" icon={<UserOutlined />} src={userInfo?.avatar || undefined} />
              <Text className="admin-user-name">
                {userInfo?.name || userInfo?.username || "管理员"}
              </Text>
            </div>
          </Dropdown>
        </Header>
        <Content style={{ margin: 16, minHeight: "calc(100vh - 96px)" }}>
          <Outlet />
        </Content>
      </AntdLayout>
    </AntdLayout>
  );
};

export default AdminLayout;
