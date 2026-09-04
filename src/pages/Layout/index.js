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
  QuestionCircleOutlined,
  ScheduleOutlined,
} from "@ant-design/icons"; // 导入新图标
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchUserInfo, logout } from "@/store/modules/user";
import { useOnboardingTour, IntroList } from "@/components/OnboardingTour";
import logo from "../../assets/SingleLogo.png";
import AgentChatWidget from "@/components/AgentChat/AgentChatWidget";
import "./index.scss";
import { useAppDispatch } from "@/store/hooks";

const { Header, Sider, Content } = AntdLayout;
const { Text } = Typography;

// 首次登录的欢迎说明：一份「申请者怎么用这个站」的流程清单
const TOUR_INTRO = (
  <IntroList
    items={[
      { label: "个人主页", text: "先完善姓名、专业、GitHub 和获奖经历——审核与面试官都会参考" },
      { label: "简历投递", text: "招新周期开放时，在这里填写并提交简历" },
      { label: "关注进展", text: "首页可查看审核进度与面试安排，简历通过后按提示填写志愿与可面试时间" },
      { label: "autograding", text: "报名技术方向可提交编程作业，自动评测成绩会同步给面试官" },
    ]}
    footnote="随时可点顶栏的「使用指引」重看本说明。"
  />
);

// 分步导览的锚点。菜单项用 antd 渲染的 data-menu-id（结尾即路由）定位，
// 不必往菜单结构里塞额外标记
const TOUR_STEPS = [
  {
    selector: 'li.ant-menu-item[data-menu-id$="-/main/dashboard"]',
    title: "首页",
    description: "招新进度、面试提醒和社团动态都汇总在这里，每次登录先看它。",
  },
  {
    selector: 'li.ant-menu-item[data-menu-id$="-/main/publish"]',
    title: "简历投递",
    description: "招新周期开放时在这里填写并提交简历，提交后仍可在截止前修改。",
  },
  {
    selector: 'li.ant-menu-item[data-menu-id$="-/main/person"]',
    title: "个人主页",
    description: "维护个人信息与获奖经历，这些内容会展示给审核与面试的老师。",
  },
  {
    selector: 'li.ant-menu-item[data-menu-id$="-/main/evaluations"]',
    title: "autograding",
    description: "查看编程作业的自动评测成绩与提交记录。",
  },
  {
    selector: '[data-tour="user-menu"]',
    title: "账号菜单",
    description: "查看个人资料或退出登录。",
  },
  {
    selector: '[data-tour="help"]',
    title: "使用指引",
    description: "以后想重看这份说明或导览，点这里就行。",
  },
];

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

  // 新用户首次进来自动弹使用说明；顶栏「使用指引」可随时重看
  const tour = useOnboardingTour({
    mode: "user",
    userId: userInfo?.userId,
    title: "欢迎来到博远信息技术社",
    intro: TOUR_INTRO,
    steps: TOUR_STEPS,
  });
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
  // 菜单对所有人一致。社员看得到「简历投递」，进去是只读并带一句说明 ——
  // 直接把入口藏掉会让人以为功能坏了或自己没权限，反而要来问。
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
      // 申请中心此前只有页面没有入口 —— 只能从个人主页「我的申请」绕进去，
      // 而它恰恰是投完简历后最常回来看的页面（审核进度、面试安排、改期）
      key: "/main/interview-appointment",
      icon: <ScheduleOutlined />,
      label: "申请进度",
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
          {!collapsed && <span className="logo-text">博远信息技术社</span>}
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
          <div className="header-right">
            <span
              className="header-help"
              data-tour="help"
              onClick={tour.open}
              role="button"
            >
              <QuestionCircleOutlined /> 使用指引
            </span>
            {loading ? (
              <Text type="secondary">加载中...</Text>
            ) : (
              <div className="header-user" data-tour="user-menu">
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
          </div>
        </Header>
        <Content className="site-content">
          <div className="content-container">
            {/* 传递原始 userInfo 和获取到的 userRole */}
            <Outlet context={{ userInfo, userRole: userInfo?.role }} />
          </div>
        </Content>
        {tour.node}
        <AgentChatWidget />
      </AntdLayout>
    </AntdLayout>
  );
};
export default MainLayout;
