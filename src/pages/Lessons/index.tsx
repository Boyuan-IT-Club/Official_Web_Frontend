
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './index.scss'; 


const mockData = [
  {
    id: 1,
    title: "计算机教育中缺失的学期",
    speaker: "博远技术部 - ",
    date: "2024-10-15",
    filterTerm: "24-25年",
    imageUrl: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=800&auto=format&fit=crop",
    videoUrl: "https://space.bilibili.com/695281681/lists/4245283?type=season"
  },
  {
    id: 2,
    title: "2025还不会AI？带你上手现代AI应用",
    speaker: "博远设计部 - ",
    date: "2025-11-20",
    filterTerm: "25-26年",
    imageUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=800&auto=format&fit=crop",
    videoUrl: "https://space.bilibili.com/695281681/lists/7009246?type=season"
  }
];

const Lessons: React.FC = () => {
  // ✅ 正确做法：所有的 Hook 必须放在组件函数体内部的第一层！
  const navigate = useNavigate(); 
  const [selectedTerm, setSelectedTerm] = useState<string>('全部');

  const filterOptions = ['全部', ...Array.from(new Set(mockData.map(item => item.filterTerm)))];

  const filteredData = selectedTerm === '全部' 
    ? mockData 
    : mockData.filter(item => item.filterTerm === selectedTerm);

  return (
    <div className="page-wrapper">
      <div className="tech-share-container">
        
        <header className="share-header">
          <div className="title-area">
            <h1>📼 技术分享回放库</h1>
            <p>在这里重温博远社团的精彩技术讲座吧！</p>
          </div>
          {/* 这里点击返回上一页或主页 */}
          <button className="back-btn" onClick={() => navigate(-1)}>返回</button>
        </header>

        <div className="filter-section">
          {filterOptions.map(term => (
            <button
              key={term}
              className={`filter-btn ${selectedTerm === term ? 'active' : ''}`}
              onClick={() => setSelectedTerm(term)}
            >
              {term}
            </button>
          ))}
        </div>

        <div className="replay-grid">
          {filteredData.map(item => (
            <div className="replay-card" key={item.id}>
              <div className="card-image-wrapper">
                <img src={item.imageUrl} alt={item.title} className="card-image" />
                <span className="date-badge">{item.date}</span>
              </div>
              <div className="card-content">
                <h3 className="card-title">{item.title}</h3>
                <p className="card-speaker">🎤 主讲人：{item.speaker}</p>
                <a href={item.videoUrl} target="_blank" rel="noopener noreferrer" className="watch-btn">
                  ▶ 观看回放
                </a>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default Lessons;