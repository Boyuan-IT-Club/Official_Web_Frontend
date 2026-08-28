import React, { useState } from 'react';
import './ClubIntro.scss';
import logoImg from "../../assets/SingleLogo.png";
import { useNavigate } from 'react-router-dom';
import { Modal } from 'antd';
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
  desc: string;      // 简要描述：显示在名片上
  detail: string;    // 基本职务：点击名片后的具体介绍
  icon: React.ReactNode; // 允许存放 React 组件
}

// 3. 在模拟数据中加入对应的图标
const deptList: Department[] = [
  {
    id: 1,
    name: '技术部',
    desc: '拔高专业素养，分享各类技术',
    detail: '负责组织技术分享活动，促进社员间知识交流。邀请行业人士、学长学姐进行交流，帮助社员拓宽技术视野；同时分享缺失而又必要的知识，打牢基础弥补空白。',
    icon: <CodeOutlined />
  },
  {
    id: 2,
    name: '项目部',
    desc: 'PM 职业体验，精进管理能力',
    detail: '负责社团项目的统筹安排，获得 PM 的职业体验。与学校和社会企业合作，制定项目规划，整理需求，与团队成员沟通协作，确保项目高效、有序地进行，收获项目管理与团队合作能力。',
    icon: <ProjectOutlined />
  },
  {
    id: 3,
    name: '综合部',
    desc: '提高综合能力，筹划各类活动',
    detail: '负责社团各类活动的组织与策划，如招新活动、集体团建、头脑风暴及全员大会等。综合部旨在营造积极的社团氛围，让每位社员都能积极参与和体验社团生活的乐趣，增进彼此间的联系与合作。',
    icon: <CoffeeOutlined />
  },
  {
    id: 4,
    name: '媒体部',
    desc: '负责媒体运营，提升设计水平',
    detail: '负责社团的媒体运营，包括各大平台的内容创作与管理。媒体部通过发布优质的文章与视频，记录社团的日常活动和重要成就，宣传社团的形象与文化，收获良好的设计与传播学习机会。',
    icon: <VideoCameraOutlined />
  },
];

const ClubIntro: React.FC = () => {
  const navigate = useNavigate();
  const [activeDept, setActiveDept] = useState<Department | null>(null);
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
          <div className="intro-text">
            <p>
              社团的发展根基是<span className="hl">唐博远学姐</span>（现为学校教师）牵头创立的
              <span className="hl">博远工作室</span>——这一<span className="hl">深厚渊源</span>，
              不仅为我们积淀了扎实的<span className="hl">技术底蕴</span>，更带来了丰富的
              <span className="hl">资源储备</span>。社团与学校各级组织及多家社会企业保持着
              <span className="hl">紧密联动</span>，从校内信息化项目开发到企业真实业务案例实训，
              为社员提供了多元而宝贵的<span className="hl">实践机会</span>。
            </p>
            <p>
              自<span className="hl">2016</span>年创立以来，社团已积累起丰富的
              <span className="hl">人脉</span>与<span className="hl">资源</span>，无论你是瞄准
              <span className="hl">就业</span>，还是备战<span className="hl">竞赛</span>，
              亦或是准备深耕<span className="hl">科研</span>，都有优秀学长学姐为你答疑解惑、指引方向。
            </p>
          </div>

          <div className="intro-cards">
            <div className="intro-card">
              <h3 className="intro-card-title">实践机会</h3>
              <p className="intro-card-desc">社团与信息办、关工委等学校组织有着长久的合作；同时也有许多和社会企业的合作外包项目，为社员提供了大量实践机会。</p>
            </div>
            <div className="intro-card">
              <h3 className="intro-card-title">人脉资源</h3>
              <p className="intro-card-desc">在蚂蚁、字节、小红书、美团都有着社团的前辈，无论读研、科研、就业方向都有着学长学姐提供指导、分享经验。</p>
            </div>
            <div className="intro-card">
              <h3 className="intro-card-title">社会资源</h3>
              <p className="intro-card-desc">2021 年与华为建立合作关系，加入「鲲鹏校园行」活动；同时也是华为基座社团；2021 年与字节跳动建立合作关系，加入字学平台，参加 bytecamp 字节跳动夏令营。</p>
            </div>
          </div>
        </section>

        {/* 3. 部门介绍 */}
        <section className="dept-section">
          <div className="section-title-wrapper">
            <h2>部门介绍</h2>
          </div>
          
          <div className="dept-grid">
            {deptList.map((item) => (
              <div key={item.id} className="dept-card" onClick={() => setActiveDept(item)}>
                {/* 4. 在这里渲染图标 */}
                <div className="dept-icon">
                  {item.icon}
                </div>
                <div className="dept-info">
                  <h3>{item.name}</h3>
                  <p>{item.desc}</p>
                  <span className="dept-more">点击查看详情 →</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 部门详情弹窗 */}
        <Modal
          open={!!activeDept}
          onCancel={() => setActiveDept(null)}
          footer={null}
          width={520}
          centered
          title={null}
          closable={false}
        >
          {activeDept && (
            <div className="dept-detail">
              <div className="dept-detail-head">
                <div className="dept-detail-icon">{activeDept.icon}</div>
                <div className="dept-detail-heading">
                  <h3>{activeDept.name}</h3>
                  <span>{activeDept.desc}</span>
                </div>
                <button
                  className="dept-detail-close"
                  onClick={() => setActiveDept(null)}
                  aria-label="关闭"
                >
                  ×
                </button>
              </div>
              <div className="dept-detail-body">{activeDept.detail}</div>
            </div>
          )}
        </Modal>

      </div>
    </div>
  );
};

export default ClubIntro;