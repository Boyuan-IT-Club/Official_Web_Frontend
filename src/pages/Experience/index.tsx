// 文件位置：src/pages/Experiences/index.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import './index.scss';
import seniorJinjiabao from '../../assets/senior-jinjiabao.png';
import seniorShixiaolei from '../../assets/senior-shixiaolei.png';
import seniorLishuai from '../../assets/senior-lishuai.png';
import seniorAnyi from '../../assets/senior-anyi.png';

// --- 类型定义 ---
interface ExperienceItem {
  id: number;
  name: string;
  intro: string;  // 学长学姐介绍（履历）
  share: string;  // 分享语（鼓励）
  avatar?: string; // 头像（缺省时使用默认头像）
}

// --- 学长学姐经验分享数据 ---
const mockData: ExperienceItem[] = [
  {
    id: 1,
    name: '17级 金加宝',
    avatar: seniorJinjiabao,
    intro: '17 级软件工程本科、21 级软件工程研究生，曾获全国软件创新大赛一等奖（全国第二），保研第三，荣获国家奖学金和特等奖学金、优秀学生干部，专利两份，二十一世纪人才学院成员、首届卓越班成员，负责过多次国创项目。目前在蚂蚁金服从事数据库研发相关工作。',
    share: '多动手、多尝试，把每一个想法都做出来。别怕起点低，坚持走下去，你会发现自己远比想象中强大。',
  },
  {
    id: 2,
    name: '21级 史晓磊',
    avatar: seniorShixiaolei,
    intro: '21 级软件工程本科，博远信息技术社 22 届秘书长，专业课绩点位于年级前列，曾获本科生国家奖学金、华东师范大学特等奖学金。目前北京大学研究生在读。',
    share: '保持好奇，踏实积累。每一天的小进步，都会在未来某一天连成你意想不到的风景。',
  },
  {
    id: 3,
    name: '20级 李帅',
    avatar: seniorLishuai,
    intro: '20 级软件工程本科，校级优秀学生，共获得两个国创、两个市创，曾获中国计算机设计大赛全国二等奖，华实创赛平台创始人。曾于摩根士丹利、阿里淘天实习，目前在小红书从事推荐引擎架构相关工作。',
    share: '找到你真正热爱的事，然后勇敢地投入进去。热爱是最好的老师，行动会给你答案。',
  },
  {
    id: 4,
    name: '17级 安一',
    avatar: seniorAnyi,
    intro: '17 级软件工程本科，曾获中国计算机设计大赛一等奖、上海市汇创青春一等奖等，首届卓越班成员。目前在字节跳动从事服务端工作，有丰富的工程开发经验。',
    share: '代码之外，多去看看世界，多和人交流。技术会过时，但学习和思考的能力会一直陪伴你。',
  },
  {
    id: 5,
    name: '2024级 陈睿',
    intro: '2024 级，博远信息技术社 2025-2026 学年社长。',
    share: '主动一点、大胆一点，多去尝试、多去交流。你在这里留下的每一份努力，都会变成照亮别人的光。',
  },
  {
    id: 6,
    name: '2025级 欧阳天贻',
    intro: '2025 级，博远信息技术社 2026-2027 学年社长。',
    share: '接过接力棒，也接过一份热爱。希望你在这里找到归属，也找到更好的自己。',
  },
];

function Experiences() {
  const navigate = useNavigate();

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

        {/* --- 经验卡片列表 --- */}
        <div className="experience-list">
          {mockData.map(item => (
            <div className="experience-card" key={item.id}>
              {/* 左侧头像区 */}
              <div className="card-left">
                {item.avatar ? (
                  <img src={item.avatar} alt={item.name} className="avatar" />
                ) : (
                  <Avatar size={70} icon={<UserOutlined />} className="avatar avatar-default" />
                )}
                <span className="senior-name">{item.name}</span>
              </div>

              {/* 右侧内容区 */}
              <div className="card-right">
                <div className="intro-box">
                  <p>{item.intro}</p>
                </div>

                <div className="summary-box">
                  <span className="quote-mark">❝</span>
                  <p>{item.share}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

export default Experiences;