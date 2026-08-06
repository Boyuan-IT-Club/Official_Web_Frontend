// 我的面试：展示本人面试志愿与分配结果（真实接口）。
// 历史说明：此页原为「方案A自主抢时段」的 mock 预约流程；方案B 上线后，
// 志愿填写已并入简历表单（/main/publish 的「面试意向」区），本页保留为状态查看页。
import React from 'react';
import { Card, Typography, Button, Space } from 'antd';
import { ArrowLeftOutlined, FormOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import InterviewStatusCard from '@/components/InterviewStatusCard';
import './index.scss';

const { Title, Text } = Typography;

const InterviewAppointment: React.FC = () => {
  const navigate = useNavigate();
  const resumeState = useSelector((state: any) => state.resume);
  const cycleId: number = resumeState?.resume?.cycle_id ?? resumeState?.cycleId ?? 2;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 16 }}>
      <Card>
        <Title level={3} style={{ marginTop: 0 }}>我的面试</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          面试志愿（志愿部门 + 可面试时间）在简历表单中填写并随简历提交；
          管理员完成安排后，本页与首页进度卡会显示你的面试时间和地点，同时发送邮件通知。
        </Text>
        <InterviewStatusCard cycleId={cycleId} />
        <Space style={{ marginTop: 16 }}>
          <Button icon={<FormOutlined />} type="primary" onClick={() => navigate('/main/publish')}>
            去填写/修改面试意向
          </Button>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/main/dashboard')}>
            返回首页
          </Button>
        </Space>
      </Card>
    </div>
  );
};

export default InterviewAppointment;
