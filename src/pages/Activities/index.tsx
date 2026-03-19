// 文件位置：src/pages/Activities/index.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import './index.scss';

// --- 类型定义 ---
interface Announcement {
  id: number;
  title: string;
  time: string;
  location: string;
  status: '报名中' | '即将开始' | '进行中';
  description: string;
}

interface PastActivity {
  id: number;
  title: string;
  date: string;
  imageUrl: string;
  summary: string;
}

// --- 模拟数据 ---
// 1. 最新公告数据
const announcementsData: Announcement[] = [
  {
    id: 1,
    title: " 2025-26技术分享课",
    time: "------",
    location: "----",
    status: "报名中",
    description: "---"
  }
];

// 2. 往期活动数据
const pastActivitiesData: PastActivity[] = [
  {
    id: 1,
    title: "24-25技术分享",
    date: "2023年12月",

    summary: "--"
  },
  {
    id: 2,
    title: "Owner-Pro 项目工坊",
    date: "2023年10月",
    
    summary: "从前端到后端，从设计到部署，系统学习网站制作全流程，打造属于自己的数字作品"
  },

];

const Activities: React.FC = () => {
  // 必须写在组件最顶层
  const navigate = useNavigate();

  return (
    <div className="page-wrapper">
      <div className="activities-container">
        
        {/* --- 顶部 Header --- */}
        <header className="page-header">
          <div className="title-area">
            <h1>🎉 社团活动大本营</h1>
            <p>在这里发现最新好玩的活动，回顾我们的精彩瞬间！</p>
          </div>
          <button className="back-btn" onClick={() => navigate(-1)}>返回</button>
        </header>

        {/* --- 第一部分：活动公告 --- */}
        <section className="section-block">
          <div className="section-title-wrapper">
            <h2>最新公告</h2>
          </div>
          
          <div className="announcement-list">
            {announcementsData.map(item => (
              <div className="announcement-card" key={item.id}>
                <div className="card-header">
                  <h3>{item.title}</h3>
                  <span className={`status-badge ${item.status === '报名中' ? 'pulse' : ''}`}>
                    {item.status}
                  </span>
                </div>
                <div className="card-body">
                  <p className="info-line">⏰ <strong>时间：</strong>{item.time}</p>
                  <p className="info-line">📍 <strong>地点：</strong>{item.location}</p>
                  <p className="desc">{item.description}</p>
                </div>
                <div className="card-footer">
                  <button className="action-btn">立即了解 / 报名</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* --- 第二部分：往期回顾 --- */}
        <section className="section-block">
          <div className="section-title-wrapper">
            <h2>往期精彩瞬间</h2>
          </div>
          
          <div className="past-grid">
            {pastActivitiesData.map(item => (
              <div className="past-card" key={item.id}>
                <div className="image-box">
                  <img src={item.imageUrl} alt={item.title} />
                  <div className="date-tag">{item.date}</div>
                </div>
                <div className="text-box">
                  <h3>{item.title}</h3>
                  <p>{item.summary}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
};

export default Activities;