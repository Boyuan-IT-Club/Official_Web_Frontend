import React, { useState, useEffect, useRef } from 'react';
import { LogIn, Users, Rocket, Trophy, Globe } from 'lucide-react';
import './index.scss';
import { useNavigate } from 'react-router-dom';//添加路由

const Land: React.FC = () => {
  const [activeTab, setActiveTab] = useState('intro');
  const isClickScrolling = useRef(false);
  const navigate = useNavigate();//能夠跳轉


  const navItems = [
    { id: 'intro', label: '关于我们' },
    { id: 'recruit', label: '活动分享' },
    { id: 'resume', label: '优秀学长' },
    { id: 'share', label: '技术分享' },
  ];

  // 点击导航滚动逻辑
  const scrollToSection = (id: string) => {
    const section = document.getElementById(id);
    if (!section) return;

    const card = section.querySelector('.card');
    const rect = card ? card.getBoundingClientRect() : section.getBoundingClientRect();
    const cardCenter = rect.top + window.scrollY + rect.height / 2;
    const viewportCenter = window.innerHeight / 2;
    const targetScrollTop = cardCenter - viewportCenter;

    isClickScrolling.current = true;
    window.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
    setActiveTab(id);

    setTimeout(() => { isClickScrolling.current = false; }, 1000);
  };

  // 自动高亮导航项
  useEffect(() => {
    const handleScroll = () => {
      if (isClickScrolling.current) return;
      const scrollPos = window.scrollY + 250;
      for (let i = navItems.length - 1; i >= 0; i--) {
        const item = navItems[i];
        const section = document.getElementById(item.id);
        if (section && scrollPos >= section.offsetTop) {
          setActiveTab(item.id);
          break;
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 吸顶导航逻辑
  useEffect(() => {
    const nav = document.querySelector('.js-sticky-nav');
    if (!nav) return;
    const navTop = nav.getBoundingClientRect().top + window.scrollY;

    const onScroll = () => {
      if (window.scrollY >= navTop) {
        nav.classList.add('is-fixed');
      } else {
        nav.classList.remove('is-fixed');
      }
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="page-container">
      {/* Header */}
      <header className="top-header">
        <div className="container">
          <div className="logo-area">
            <img 
              src={require('../../assets/SingleLogo.png')} 
              className="logo-placeholder" 
              alt="logo" 
            />
            <div className="logo-text">
              <h1>Boyuan It Club</h1>
              <p>卓越技术 · 绝佳创意 · 实践平台</p>
            </div>
          </div>
          <button
            className="login-btn"
            onClick={() => navigate('/login')}
            >
            <LogIn size={18} />
            <span>登录 / 注册</span>
          </button>

        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-banner">
        <div className="hero-content">
          <h1>欢迎来到博远信息技术社</h1>
          <p>在这里你将获得技术提升、项目实践、团队协作和职业发展的全方位成长。</p>
        </div>
      </section>

      {/* Sticky Nav */}
      <nav className="sticky-nav js-sticky-nav">
        <div className="container">
          <ul className="nav-list">
            {navItems.map(item => (
              <li
                key={item.id}
                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => scrollToSection(item.id)}
              >
                {item.label}
                <div className="active-bar"></div>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        {/* 1. 传统的卡片布局容器 */}
        <div className="container">
          {/* Intro Section */}
          <section className="content-section left-align" id="intro">
            <div className="card info-card">
              <div className="card-image placeholder-blue">
                <span className="placeholder-text">关于我们</span>
              </div>
              <div className="card-body">
                <h2>社团成就</h2>
                <p>八年积淀，硕果累累。我们致力于打造校园内最专业的技术交流社区。</p>
                <button className="card-btn"
                  onClick={() => navigate('/club-intro')}
                >
                  查看详情</button>
              </div>
            </div>
          </section>

          {/* Recruit Section */}
          <section className="content-section right-align" id="recruit">
            <div className="card feature-card">
              <div className="card-body">
                <h2>社团活动</h2>
                <p>从技术交流分享到部门团建，丰富多彩的活动等你来参加。</p>
                <button className="card-btn"
                  onClick={() => navigate('/Activities')}
                >
                  查看详情</button>
              </div>
              <div className="card-image placeholder-green">
                <span className="placeholder-text">活动展示</span>
              </div>
            </div>
          </section>

          {/* Resume Section */}
          <section className="content-section left-align" id="resume">
            <div className="card info-card">
              <div className="card-image placeholder-purple">
                <span className="placeholder-text">优秀学长分享</span>
              </div>
              <div className="card-body">
                <h2>展现经验与成长</h2>
                <p>优秀学长将在这里分享他们的学习经历与项目实践，一起交流技术、分享经验。点击下方链接了解更多内容。</p>
                <button className="card-btn"
                  onClick={() => navigate('/Experience')}
                >
                  查看详情</button>
              </div>
            </div>
          </section>

          {/* Share Section */}
          <section className="content-section right-align" id="share">
            <div className="card feature-card">
              <div className="card-body">
                <h2>技术分享回顾</h2>
                <p>错过了现场直播？没关系，这里有往期所有干货视频的汇总。</p>
               { /*<button className="card-btn outline">往期视频</button>*/}
                <button className="card-btn" onClick={() => navigate('/Lessons')}>往期视频</button>
              </div>
              <div className="card-image placeholder-gray">
                <span className="placeholder-text">技术分享现场</span>
              </div>
            </div>
          </section>
        </div>

        {/* 2. 新增的全宽长方形统计框架 (跳出 container) */}
        <section className="full-width-stats">
          <div className="stats-inner">
            <div className="stat-item">
              <Users size={32} strokeWidth={1.5} />
              <span className="count">1000+</span>
              <span className="label">优秀成员</span>
            </div>
            <div className="stat-item">
              <Rocket size={32} strokeWidth={1.5} />
              <span className="count">50+</span>
              <span className="label">项目成果</span>
            </div>
            <div className="stat-item">
              <Trophy size={32} strokeWidth={1.5} />
              <span className="count">30+</span>
              <span className="label">荣誉奖项</span>
            </div>
            <div className="stat-item">
              <Globe size={32} strokeWidth={1.5} />
              <span className="count">8年</span>
              <span className="label">社团积淀</span>
            </div>
          </div>
        </section>

        {/* 底部额外留白 */}
        <div style={{ height: 100 }}></div>
      </main>

      {/* Footer */}
      <footer className="site-footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <h3>关于我们</h3>
              <p className="footer-desc">博远信息技术社是学生自主创办的技术性社团，无论你是技术小白还是编程高手，我们都欢迎你的加入！</p>
            </div>
            <div>
              <h3>联系我们</h3>
              <ul>
                <li>邮箱: contact@boyuan.org</li>
                <li>地址: 上海市中山北路3663号</li>
              </ul>
            </div>
            <div>
              <h3>关注我们</h3>
              <ul>
                <li>答疑QQ群：765667302</li>
                <li>官方公众号：ECNUCoder</li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            &copy; {new Date().getFullYear()} 博远信息技术社. All Rights Reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Land;