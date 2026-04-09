import React from 'react';
import './ClubIntro.scss'; 
import logoImg from "../../assets/SingleLogo.png"; 
import { useNavigate } from 'react-router-dom';
// 1. 引入需要的图标
import { 
  CodeOutlined, 
  ProjectOutlined, 
  VideoCameraOutlined, 
  CoffeeOutlined 
} from '@ant-design/icons';

// 2. 更新接口定义，加入 icon 属性
interface Department {
  id: number;
  name: string;
  desc: string;
  icon: React.ReactNode; // 允许存放 React 组件
}

// 3. 在模拟数据中加入对应的图标
const deptList: Department[] = [
  { 
    id: 1, 
    name: '技术部', 
    desc: '负责技术学习、技术分享和创新实践',
    icon: <CodeOutlined /> 
  },
  { 
    id: 2, 
    name: '项目部', 
    desc: '负责项目规划、进度管理和团队协作',
    icon: <ProjectOutlined /> 
  },
  { 
    id: 3, 
    name: '媒体部', 
    desc: '负责社团宣传、内容创作和品牌建设',
    icon: <VideoCameraOutlined /> 
  },
  { 
    id: 4, 
    name: '综合部', 
    desc: '负责资源整合、活动组织和内部协调',
    icon: <CoffeeOutlined /> 
  },
];

const ClubIntro: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="page-wrapper">
      <div className="boyuan-container">
        
        {/* 1. 顶部 Header */}
        <header className="header">
          <img src={logoImg} alt="社团Logo" className="app-logo" />
          <div className="app-title">Boyuan Club</div>
          <div className="header-actions">
            <button className="action-btn1" onClick={() => navigate('/')}>返回首页</button>
            <button className="action-btn2" onClick={() => navigate('/login')}>登录/注册</button>
          </div>
        </header>

        {/* 2. 社团简介 */}
        <section className="intro-section">
          <div className="section-title-wrapper">
            <h2>社团简介</h2>
          </div>
          <div className="intro-content">
            <p>这里填写关于博远社团的详细介绍内容...</p>
          </div>
        </section>

        {/* 3. 部门介绍 */}
        <section className="dept-section">
          <div className="section-title-wrapper">
            <h2>部门介绍</h2>
          </div>
          
          <div className="dept-grid">
            {deptList.map((item) => (
              <div key={item.id} className="dept-card">
                {/* 4. 在这里渲染图标 */}
                <div className="dept-icon">
                  {item.icon}
                </div>
                <div className="dept-info">
                  <h3>{item.name}</h3>
                  <p>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
};

export default ClubIntro;