// 文件位置：src/pages/Activities/index.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listActivities, Activity } from '@/api/manage/activityApis';
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
  imageUrl?: string;
  summary: string;
}

// --- 真实数据映射（/api/activity）---
const toAnnouncement = (a: Activity): Announcement => {
  const today = new Date().toISOString().slice(0, 10);
  let status: Announcement['status'] = '即将开始';
  if (a.signupStart && a.signupDeadline && a.signupStart <= today && today <= a.signupDeadline) status = '报名中';
  else if (a.startTime && a.endTime && a.startTime <= today && today <= a.endTime) status = '进行中';
  return {
    id: a.activityId,
    title: a.title,
    time: a.startTime ? `${a.startTime}${a.endTime && a.endTime !== a.startTime ? ` ~ ${a.endTime}` : ''}` : '时间待定',
    location: a.location || '地点待定',
    status,
    description: a.description || '',
  };
};

const toPast = (a: Activity): PastActivity => ({
  id: a.activityId,
  title: a.title,
  date: a.startTime ? a.startTime.slice(0, 7).replace('-', '年') + '月' : '',
  imageUrl: a.coverImage,
  summary: a.description || '',
});

const Activities: React.FC = () => {
  const [announcementsData, setAnnouncements] = useState<Announcement[]>([]);
  const [pastActivitiesData, setPast] = useState<PastActivity[]>([]);

  useEffect(() => {
    let cancelled = false;
    listActivities()
      .then((res: any) => {
        if (cancelled) return;
        const all: Activity[] = res?.data ?? [];
        const today = new Date().toISOString().slice(0, 10);
        const upcoming = all.filter((a) => !a.endTime || a.endTime >= today);
        const past = all.filter((a) => a.endTime && a.endTime < today);
        upcoming.sort((a, b) => String(a.startTime ?? '').localeCompare(String(b.startTime ?? '')));
        past.sort((a, b) => String(b.startTime ?? '').localeCompare(String(a.startTime ?? '')));
        setAnnouncements(upcoming.map(toAnnouncement));
        setPast(past.map(toPast));
      })
      .catch(() => { /* 加载失败时页面显示空态 */ });
    return () => { cancelled = true; };
  }, []);

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
          <p className="section-description">了解更多动态:关注公众号ECNUCoder</p>
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