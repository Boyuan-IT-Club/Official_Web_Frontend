// 文件位置：src/pages/Experiences/index.tsx
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './index.scss';

// --- 类型定义 ---
interface ExperienceItem {
  id: number;
  name: string;
  topic: string;
  date: string; // 格式 YYYY-MM-DD，方便排序
  summary: string;
  avatar: string; // 头像，增加可爱感
}

// --- 模拟数据 ---
const mockData: ExperienceItem[] = [
  {
    id: 1,
    name: "---",
    topic: "-----",
    date: "2023-11-15",
    avatar: "https://api.dicebear.com/7.x/micah/svg?seed=Felix", // 随机可爱头像
    summary: "-----"
  },
  {
    id: 2,
    name: "----",
    topic: "---",
    date: "2024-01-20",
    avatar: "https://api.dicebear.com/7.x/micah/svg?seed=Lily",
    summary: "---"
  }
]; // ✅ 修复：在这里加上 ]; 闭合数组


function Experiences() {
  const navigate = useNavigate();

  // --- 状态管理 ---
  const [searchTerm, setSearchTerm] = useState<string>(''); // 搜索词
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc'); // 排序方式：desc(最新) | asc(最早)

  // --- 核心逻辑：搜索过滤 + 时间排序 ---
  const filteredAndSortedData = useMemo(() => {
    // 1. 先过滤（支持搜名字、搜主题）
    let result = mockData.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.topic.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // 2. 再排序
    result.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [searchTerm, sortOrder]);

  return (
    <div className="page-wrapper">
      <div className="experiences-container">

        {/* --- 顶部 Header --- */}
        <header className="page-header">
          <div className="title-area">
            <h1>学长学姐经验分享</h1>
            <p>————听听他们怎么说</p>
          </div>
          <button className="back-btn" onClick={() => navigate(-1)}>返回</button>
        </header>

        {/* --- 控制栏：搜索与排序 --- */}
        <div className="controls-section">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="搜名字，或者感兴趣的主题..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>

          <button
            className="sort-btn"
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
          >
            {sortOrder === 'desc' ? '📅 最新分享优先 ↓' : '⏳ 往期分享优先 ↑'}
          </button>
        </div>

        {/* --- 经验卡片列表 --- */}
        <div className="experience-list">
          {filteredAndSortedData.map(item => (
            <div className="experience-card" key={item.id}>
              {/* 左侧头像区 */}
              <div className="card-left">
                <img src={item.avatar} alt={item.name} className="avatar" />
                <span className="senior-name">{item.name}</span>
              </div>

              {/* 右侧内容区 */}
              <div className="card-right">
                <div className="info-header">
                  <h3 className="topic">{item.topic}</h3>
                  <span className="date-badge">{item.date}</span>
                </div>

                <div className="summary-box">
                  <span className="quote-mark">❝</span>
                  <p>{item.summary}</p>
                </div>
              </div>
            </div>
          ))}

          {/* 无搜索结果时的提示 */}
          {filteredAndSortedData.length === 0 && (
            <div className="empty-state">
              哎呀，没有找到相关的经验分享哦 🧐
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default Experiences;