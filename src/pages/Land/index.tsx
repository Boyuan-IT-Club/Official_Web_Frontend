// src/pages/Land/index.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginOutlined, ArrowRightOutlined } from '@ant-design/icons';
import './index.scss';
import SingleLogo from '../../assets/SingleLogo.png';

type NavItem = {
  id: 'intro' | 'recruit' | 'resume' | 'share';
  label: string;
};

const Index: React.FC = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<NavItem['id']>('intro');
  const isClickScrolling = useRef<boolean>(false); // 点击滚动锁

  const navItems: NavItem[] = [
    { id: 'intro', label: '社团简介' },
    { id: 'recruit', label: '社团招新' },
    { id: 'resume', label: '简历投递' },
    { id: 'share', label: '技术分享' },
  ];

  // ========== 旧版行为：页面跳转 ==========
  const handleLoginClick = (): void => {
    navigate('/login');
  };

  const handleLogoClick = (): void => {
    navigate('/');
  };
  // =======================================

  // 点击导航滚动
  const scrollToSection = (id: NavItem['id']): void => {
    const section = document.getElementById(id);
    if (!section) return;

    const card = section.querySelector('.card');
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const cardCenter = rect.top + window.scrollY + rect.height / 2;
    const viewportCenter = window.innerHeight / 2;
    const targetScrollTop = cardCenter - viewportCenter;

    isClickScrolling.current = true;
    window.scrollTo({ top: targetScrollTop, behavior: 'smooth' });

    setActiveTab(id);

    // 1 秒后解锁，让自动高亮生效
    window.setTimeout(() => {
      isClickScrolling.current = false;
    }, 1000);
  };

  // 自动高亮
  useEffect(() => {
    const handleScroll = (): void => {
      if (isClickScrolling.current) return;

      const scrollPos = window.scrollY + 200;
      for (let i = navItems.length - 1; i >= 0; i--) {
        const item = navItems[i];
        const section = document.getElementById(item.id);
        if (!section) continue;

        if (scrollPos >= section.offsetTop) {
          setActiveTab(item.id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 吸顶导航
  useEffect(() => {
    const nav = document.querySelector('.js-sticky-nav') as HTMLElement | null;
    if (!nav) return;

    const navTop = nav.getBoundingClientRect().top + window.scrollY;

    const onScroll = (): void => {
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
          {/* logo 点击回首页 */}
          <div
            className="logo-area"
            onClick={handleLogoClick}
            style={{ cursor: 'pointer' }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') handleLogoClick();
            }}
          >
            <img src={SingleLogo} className="logo-placeholder" alt="logo" />
            <div className="logo-text">
              <h1>Boyuan Club</h1>
              <p>卓越技术 · 绝佳创意 · 实践平台</p>
            </div>
          </div>

          {/* 登录按钮跳转 */}
          <button className="login-btn" onClick={handleLoginClick}>
            <LoginOutlined style={{ fontSize: 18 }} />
            <span>登录 / 注册</span>
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="hero-banner">
        <div className="hero-content">
          <h1>欢迎来到博远信息技术社</h1>
          <p> 在这里你将获得技术提升、项目实践、团队协作和职业发展的全方位成长。</p>
        </div>
      </section>

      {/* Sticky Nav */}
      <nav className="sticky-nav js-sticky-nav">
        <div className="container">
          <ul className="nav-list">
            {navItems.map((item) => (
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

      {/* Main */}
      <main className="main-content">
        <div className="container">
          {/* Intro */}
          <section className="content-section left-align" id="intro">
            <div className="card info-card">
              <div className="card-image placeholder-blue">
                <span className="placeholder-text">社团活动展示</span>
              </div>
              <div className="card-body">
                <h2>了解我们</h2>
                <p>不知道写啥。</p>
                <button className="card-btn">查看详情</button>
              </div>
            </div>
          </section>

          {/* Recruit */}
          <section className="content-section right-align" id="recruit">
            <div className="card feature-card">
              <div className="card-body">
                <h2>寻找未来的合伙人</h2>
                <p>无论你是代码大神还是设计新星，只要你对技术充满热情，这里就是你的舞台。</p>
                <button className="card-btn">
                  立即申请 <ArrowRightOutlined style={{ fontSize: 14, marginLeft: 4 }} />
                </button>
              </div>
              <div className="card-image placeholder-green">
                <span className="placeholder-text">招新计划启动</span>
              </div>
            </div>
          </section>

          {/* Resume */}
          <section className="content-section left-align" id="resume">
            <div className="card info-card">
              <div className="card-image placeholder-purple">
                <span className="placeholder-text">简历投递通道</span>
              </div>
              <div className="card-body">
                <h2>展现你的才华</h2>
                <p>和上一个好像有点重合了，没关系先这样吧</p>
                <button className="card-btn">上传简历</button>
              </div>
            </div>
          </section>

          {/* Share */}
          <section className="content-section right-align" id="share">
            <div className="card feature-card">
              <div className="card-body">
                <h2>技术分享回顾</h2>
                <p>技术扫盲回放</p>
                <button className="card-btn outline">往期视频</button>
              </div>
              <div className="card-image placeholder-gray">
                <span className="placeholder-text">技术分享现场</span>
              </div>
            </div>
          </section>

          {/* 页面底部空白 */}
          <div style={{ height: 300 }}></div>
        </div>
      </main>

      {/* Footer */}
      <footer className="site-footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <h3>关于我们</h3>
              <li>博远信息技术社 </li>
              <p className="footer-desc">
                无论你是技术小白还是编程高手，只要对IT技术充满热情，都欢迎加入我们！
              </p>
            </div>
            <div>
              <h3>联系我们</h3>
              <ul>
                <li>邮箱: 有吗</li>
                
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
          <div className="footer-bottom">&copy; 这里一般写什么来着</div>
        </div>
      </footer>
    </div>
  );
};

export default Index;