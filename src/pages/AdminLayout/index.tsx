import React, { useEffect, useMemo, useState } from "react";
import GlobalSearch from '@/components/GlobalSearch';
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
  ProfileOutlined,
  LogoutOutlined,
  ExportOutlined,
  BgColorsOutlined,
  CheckOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { fetchUserInfo, logout } from "@/store/modules/user";
import { useAppDispatch } from "@/store/hooks";
import { getToken } from "@/utils";
import { getJwtPermissionCodes } from "@/utils/jwt";
import { useSkin } from "@/theme/SkinProvider";
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
  { key: "/profiles", icon: <ProfileOutlined />, label: "候选档案", anyOf: ["resume:view", "evaluation:view"] },
];

const AdminLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const dispatch = useAppDispatch();
  const { userInfo } = useSelector((state: any) => state.user);
  const location = useLocation();
  const navigate = useNavigate();

  const permCodes = useMemo(() => getJwtPermissionCodes(getToken()), []);
  const { skin, skins, setSkinKey } = useSkin();

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

  // 全局搜索：⌘K / Ctrl+K 打开。
  // 只把当前账号有权进的页面喂给它 —— 搜出一个点进去 403 的页面毫无意义。
  const [searchOpen, setSearchOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleLogout = async () => {
    try {
      await dispatch(logout() as any);
    } finally {
      navigate("/login", { replace: true });
      message.success("已退出登录");
    }
  };

  const userMenuItems = [
    // 皮肤切换：只有一套皮肤时不出现这一项，免得点开是个只有一个选项的菜单
    ...(skins.length > 1
      ? [
        {
          key: "skin",
          icon: <BgColorsOutlined />,
          label: "界面皮肤",
          children: skins.map((s) => ({
            key: `skin:${s.key}`,
            label: s.name,
            // 当前选中项打勾，而不是靠高亮——下拉子菜单里高亮容易和 hover 混淆
            icon: s.key === skin.key ? <CheckOutlined /> : <span style={{ width: 14 }} />,
            onClick: () => setSkinKey(s.key),
          })),
        },
        { type: "divider" as const },
      ]
      : []),
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
          <button
            type="button"
            className="admin-search-trigger"
            onClick={() => setSearchOpen(true)}
          >
            <SearchOutlined />
            <span className="admin-search-trigger__text">搜索</span>
            <kbd>⌘K</kbd>
          </button>
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
        <GlobalSearch
          open={searchOpen}
          onClose={() => setSearchOpen(false)}
          pages={menuItems.map((m) => ({ key: String(m.key), label: String(m.label) }))}
        />
      </AntdLayout>
    </AntdLayout>
  );
};

export default AdminLayout;
