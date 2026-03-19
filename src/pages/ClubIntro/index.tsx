import React from 'react';
import './ClubIntro.scss'; // 引入 SCSS
import logoImg from"../../assets/SingleLogo.png"  ; // 引入 logo 图片
import { useNavigate } from 'react-router-dom';//添加路由



// 定义数据类型接口
interface Department {
  id: number;
  name: string;
  desc: string;
}

// 模拟数据：4个部门
const deptList: Department[] = [
  { id: 1, name: '技术部', desc: '负责技术学习、技术分享和创新实践' },
  { id: 2, name: '项目部', desc: '负责项目规划、进度管理和团队协作' },
  { id: 3, name: '媒体部', desc: '负责社团宣传、内容创作和品牌建设' },
  { id: 4, name: '综合部', desc: '负责资源整合、活动组织和内部协调' },
];

const ClubIntro: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div class="page-wrapper">
  

    <div className="boyuan-container">
      
      {/* 1. 顶部 Header */}
      <header className="header">
        <img src={logoImg} alt="社团Logo" className="app-logo" />
        <div className="app-title">Boyuan Club</div>
        <div className="header-actions">
              <button className="action-btn-admin" onClick={() => navigate('/admin')}>
              管理员入口
              </button>
            <button className="action-btn1" onClick={() => navigate('/')}>返回首页</button>
          
            <button className="action-btn2" onClick={() => navigate('/login')}>登录/注册</button>
        </div>
      </header>

      {/* 2. 社团简介 (大卡片) */}
      <section className="intro-section">
        <div className="section-title-wrapper">
          <h2>社团简介</h2>
        </div>
        <div className="intro-content">
          <p>还在思考放什么</p>
        </div>
      </section>

      {/* 3. 部门介绍 (大卡片 + 内部 Grid) */}
      <section className="dept-section">
        <div className="section-title-wrapper">
          <h2>部门介绍</h2>
        </div>
        
        <div className="dept-grid">
          {deptList.map((item) => (
            <div key={item.id} className="dept-card">
              <div className="dept-icon"></div>
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