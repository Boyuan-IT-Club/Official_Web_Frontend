// 文件位置：src/pages/Activities/index.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Carousel } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
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
  cover?: string;
  /** 有图文详情才显示「查看详情」，纯占位活动没有可看的 */
  hasDetail: boolean;
}

interface SummarySlide {
  key: string;
  image?: string;
  title: string;
  subtitle: string;
  date: string;
  /** 有图文详情时点击进入 /Activities/:id */
  activityId?: number;
  hasDetail?: boolean;
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
    cover: a.coverImage || undefined,
    hasDetail: Boolean(a.detailContent),
  };
};

// 已结束的活动 → 「往期精彩瞬间」轮播。最新公告只放未结束的，
// 往期的从这里回顾——否则办完的活动在两个标签页都无处安放
const toSlide = (a: Activity): SummarySlide => ({
  key: String(a.activityId),
  image: a.coverImage || undefined,
  title: a.title,
  subtitle: a.description || '',
  date: a.startTime ? a.startTime.slice(0, 7).replace('-', ' 年 ') + ' 月' : '',
  activityId: a.activityId,
  hasDetail: Boolean(a.detailContent),
});

const tabOptions = [
  { key: 'announcement', label: '最新公告' },
  { key: 'summary', label: '往期精彩瞬间' },
] as const;

type TabKey = (typeof tabOptions)[number]['key'];

const Activities: React.FC = () => {
  const navigate = useNavigate();
  const carouselRef = useRef<any>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('announcement');
  const [announcementsData, setAnnouncements] = useState<Announcement[]>([]);
  const [summarySlides, setSummarySlides] = useState<SummarySlide[]>([]);

  useEffect(() => {
    let cancelled = false;
    listActivities()
      .then((res: any) => {
        if (cancelled) return;
        const all: Activity[] = res?.data ?? [];
        const today = new Date().toISOString().slice(0, 10);
        const upcoming = all.filter((a) => !a.endTime || a.endTime >= today);
        upcoming.sort((a, b) => String(a.startTime ?? '').localeCompare(String(b.startTime ?? '')));
        setAnnouncements(upcoming.map(toAnnouncement));
        // 已结束的进「往期精彩瞬间」，新近的排前面
        const past = all.filter((a) => a.endTime && a.endTime < today);
        past.sort((a, b) => String(b.endTime ?? '').localeCompare(String(a.endTime ?? '')));
        setSummarySlides(past.map(toSlide));
      })
      .catch(() => { /* 加载失败时页面显示空态 */ });
    return () => { cancelled = true; };
  }, []);

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

        {/* --- 分类切换按钮 --- */}
        <div className="filter-section">
          {tabOptions.map((tab) => (
            <button
              key={tab.key}
              className={`filter-btn ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* --- 最新公告 --- */}
        {activeTab === 'announcement' && (
          <div className="announcement-list">
            {announcementsData.map((item) => (
              <div className="announcement-card" key={item.id}>
                {item.cover && (
                  <img
                    className="card-cover"
                    src={item.cover}
                    alt={item.title}
                    onClick={() => item.hasDetail && navigate(`/Activities/${item.id}`)}
                    style={item.hasDetail ? { cursor: 'pointer' } : undefined}
                  />
                )}
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
                {item.hasDetail && (
                  <div className="card-footer">
                    <button
                      className="action-btn"
                      onClick={() => navigate(`/Activities/${item.id}`)}
                    >
                      查看图文详情
                    </button>
                  </div>
                )}
              </div>
            ))}
            {announcementsData.length === 0 && (
              <div className="empty-state">暂无最新公告，敬请期待 🎈</div>
            )}
          </div>
        )}

        {/* --- 往期精彩瞬间：活动总结轮播 --- */}
        {activeTab === 'summary' && (
          <div className="carousel-wrap">
            {summarySlides.length === 0 ? (
              <div className="empty-state">暂无精彩瞬间，敬请期待 📸</div>
            ) : (
              <>
                <Carousel
                  ref={carouselRef}
                  className="summary-carousel"
                  autoplay
                  autoplaySpeed={5000}
                  dots
                >
                  {summarySlides.map((slide) => (
                    <div className="summary-slide" key={slide.key}>
                      <div
                        className="summary-link"
                        style={slide.hasDetail ? { cursor: 'pointer' } : undefined}
                        onClick={() => slide.hasDetail && navigate(`/Activities/${slide.activityId}`)}
                      >
                        <div className="slide-image">
                          {slide.image
                            ? <img src={slide.image} alt={slide.title} />
                            : <div className="slide-image-placeholder">{slide.title.slice(0, 8)}</div>}
                        </div>
                        <div className="slide-caption">
                          <h3 className="slide-title">{slide.title}</h3>
                          <p className="slide-subtitle">{slide.subtitle}</p>
                          <span className="slide-date">
                            {slide.date}
                            {slide.hasDetail && <span className="slide-more">查看图文详情 →</span>}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </Carousel>

                <button
                  type="button"
                  className="carousel-nav carousel-nav--prev"
                  aria-label="上一张"
                  onClick={() => carouselRef.current?.prev()}
                >
                  <LeftOutlined />
                </button>
                <button
                  type="button"
                  className="carousel-nav carousel-nav--next"
                  aria-label="下一张"
                  onClick={() => carouselRef.current?.next()}
                >
                  <RightOutlined />
                </button>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default Activities;
