import React, { useState } from 'react';
import { Layout as AntdLayout, Menu, Upload, Button, message, Input, Card, Avatar, Typography } from 'antd';
import { UploadOutlined, UserOutlined, TrophyOutlined, SolutionOutlined, LockOutlined } from '@ant-design/icons';
import './index.scss';
import logo from '../../assets/SingleLogo.png'; // 替换为您的logo路径

const { Header, Sider, Content } = AntdLayout;
const { TextArea } = Input;
const { Title } = Typography;

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeMenu, setActiveMenu] = useState('resume');
  const [resumeText, setResumeText] = useState('');
  
  const uploadProps = {
    name: 'file',
    action: '/api/upload/resume',
    headers: {
      authorization: 'authorization-text',
    },
    beforeUpload(file) {
      const isAllowedType = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type);
      if (!isAllowedType) {
        message.error('只能上传 PDF、DOC 或 DOCX 文件!');
      }
      return isAllowedType;
    },
    onChange(info) {
      if (info.file.status === 'done') {
        message.success(`${info.file.name} 文件上传成功`);
      } else if (info.file.status === 'error') {
        message.error(`${info.file.name} 文件上传失败`);
      }
    },
  };

  const handleResumeSubmit = () => {
    if (!resumeText.trim()) {
      message.warning('请输入简历内容');
      return;
    }
    message.success('简历提交成功');
  };

  const navigateToProfile = () => {
    setActiveMenu('profile');
  };

  const renderContent = () => {
    switch (activeMenu) {
      case 'resume':
        return (
          <Card 
            title={null} 
            bordered={false}
            className="resume-card"
          >
            <div className="resume-header">
              <Title level={2} className="art-title">简历投递</Title>
            </div>
            <div className="resume-section">
              <TextArea
                rows={10}
                placeholder="请详细描述您的技能、项目经验和个人优势..."
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                className="resume-textarea"
              />
            </div>
            
            <div className="upload-section">
              <Upload {...uploadProps}>
                <Button icon={<UploadOutlined />} className="tech-button">
                  选择文件
                </Button>
              </Upload>
              <p className="upload-hint">支持PDF、DOC、DOCX格式，大小不超过10MB</p>
            </div>
            
            <div className="submit-section">
              <Button 
                type="primary" 
                size="large"
                onClick={handleResumeSubmit}
                className="tech-primary-btn"
              >
                提交简历
              </Button>
            </div>
          </Card>
        );
      case 'awards':
        return <div className="coming-soon">获奖情况上传功能即将上线</div>;
      case 'profile':
        return <div className="coming-soon">个人主页功能即将上线</div>;
      case 'admin':
        return <div className="coming-soon">管理员入口功能即将上线</div>;
      default:
        return <div>简历投递页面</div>;
    }
  };

  return (
    <AntdLayout className="main-layout" style={{ minHeight: '100vh' }}>
      {/* 侧边栏 */}
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
          defaultSelectedKeys={['resume']}
          mode="inline"
          onSelect={({ key }) => setActiveMenu(key)}
          className="tech-menu"
        >
          <Menu.Item key="resume" icon={<SolutionOutlined className="menu-icon" />}>
            简历投递
          </Menu.Item>
          <Menu.Item key="awards" icon={<TrophyOutlined className="menu-icon" />}>
            获奖情况上传
          </Menu.Item>
          <Menu.Item key="profile" icon={<UserOutlined className="menu-icon" />}>
            个人主页
          </Menu.Item>
          <Menu.Item key="admin" icon={<LockOutlined className="menu-icon" />}>
            管理员入口
          </Menu.Item>
        </Menu>
      </Sider>

      <AntdLayout className="site-layout">
        {/* 顶部导航栏 */}
        <Header className="tech-header">
          <div className="header-user" onClick={navigateToProfile}>
            <Avatar icon={<UserOutlined />} className="user-avatar" />
            <span className="username">用户名</span>
          </div>
        </Header>

        {/* 主体内容 */}
        <Content className="site-content">
          <div className="content-container">
            {renderContent()}
          </div>
        </Content>
      </AntdLayout>
    </AntdLayout>
  );
};

export default MainLayout;