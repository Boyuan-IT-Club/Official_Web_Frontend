import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CodeOutlined, CameraOutlined, AimOutlined, TeamOutlined } from '@ant-design/icons';
import './index.scss';

/**
 * 部门选择引导（方向 7）。
 *
 * 解决一个真实问题：新生进站后常常不知道自己该投哪个部门，
 * 此前只能在简历表单的下拉框里凭部门名猜。这里把四个方向摆到首页，
 * 各给一个色彩身份与一句说明，点击直达简历投递。
 *
 * 配色按「浅底 + 同色系深字」取值（底 50 档 / 标题 800 档 / 说明 600 档），
 * 保证浅底上的文字对比度足够，而不是随手挑四个饱和色。
 */
const DEPTS = [
  { key: 'tech', name: '技术部', desc: '前后端 · 算法', icon: <CodeOutlined />, bg: '#e6f1fb', title: '#0c447c', sub: '#185fa5' },
  { key: 'media', name: '媒体部', desc: '设计 · 剪辑', icon: <CameraOutlined />, bg: '#fbeaf0', title: '#72243e', sub: '#993556' },
  { key: 'project', name: '项目部', desc: '产品 · 落地', icon: <AimOutlined />, bg: '#e1f5ee', title: '#085041', sub: '#0f6e56' },
  { key: 'general', name: '综合部', desc: '运营 · 活动', icon: <TeamOutlined />, bg: '#faeeda', title: '#633806', sub: '#854f0b' },
];

const DepartmentPicker: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="dept-picker">
      <div className="dept-picker-head">
        <span className="dept-picker-title">想加入哪个方向</span>
        <span className="dept-picker-sub">四个部门，每个都从零带你上手</span>
      </div>
      <div className="dept-grid">
        {DEPTS.map((d) => (
          <button
            key={d.key}
            type="button"
            className="dept-card"
            style={{ background: d.bg }}
            onClick={() => navigate('/main/publish')}
          >
            <span className="dept-icon" style={{ color: d.title }} aria-hidden="true">{d.icon}</span>
            <span className="dept-name" style={{ color: d.title }}>{d.name}</span>
            <span className="dept-desc" style={{ color: d.sub }}>{d.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default DepartmentPicker;
