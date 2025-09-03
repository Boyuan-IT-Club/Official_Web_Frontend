// pages/Publish/components/ResumeView.js
import React from 'react';
import {
  Card,
  Button,
  Typography,
  Space,
  Result,
  Alert,
  Tag
} from 'antd';
import {
  EyeOutlined,
  EditOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

const ResumeView = ({ resume, fieldValues, fieldIdMapping, photoBase64, onEdit, onView }) => {
  
  const getStatusInfo = (status) => {
    switch (status) {
      case 1:
        return { text: '草稿', color: 'default', icon: <EditOutlined /> };
      case 2:
        return { text: '已提交', color: 'processing', icon: <ClockCircleOutlined /> };
      case 3:
        return { text: '评审中', color: 'warning', icon: <ClockCircleOutlined /> };
      case 4:
        return { text: '通过', color: 'success', icon: <CheckCircleOutlined /> };
      case 5:
        return { text: '未通过', color: 'error', icon: <CloseCircleOutlined /> };
      default:
        return { text: '未知', color: 'default', icon: <EditOutlined /> };
    }
  };

  const statusInfo = getStatusInfo(resume?.status);

  return (
    <div className="resume-view">
      <Card>
        <div className="resume-status">
          <div className="status-icon" style={{ color: statusInfo.color }}>
            {statusInfo.icon}
          </div>
          <Title level={3} className="status-text">
            简历状态: <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
          </Title>
          {resume?.submittedAt && (
            <Text type="secondary">
              提交时间: {new Date(resume.submittedAt).toLocaleString()}
            </Text>
          )}
        </div>

        {resume?.status === 2 && (
          <Alert
            message="简历已提交"
            description="您的简历已成功提交，请等待审核。审核结果将通过邮件通知您。"
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        {resume?.status === 3 && (
          <Alert
            message="评审中"
            description="您的简历正在评审中，请耐心等待结果。"
            type="warning"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        {resume?.status === 4 && (
          <Alert
            message="恭喜！简历已通过"
            description="您的简历已通过初步筛选，请等待后续面试通知。"
            type="success"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        {resume?.status === 5 && (
          <Alert
            message="简历未通过"
            description="很遗憾，您的简历未通过筛选。感谢您的申请，欢迎下次再试。"
            type="error"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        <div className="action-buttons">
          <Space>
            <Button
              type="primary"
              icon={<EyeOutlined />}
              onClick={onView}
              size="large"
            >
              查看我的简历
            </Button>
            
            {resume?.status === 1 && (
              <Button
                icon={<EditOutlined />}
                onClick={onEdit}
                size="large"
              >
                继续编辑
              </Button>
            )}
            
            {resume?.status !== 1 && resume?.status !== 3 && resume?.status !== 4 && (
              <Button
                icon={<EditOutlined />}
                onClick={onEdit}
                size="large"
              >
                修改简历
              </Button>
            )}
          </Space>
        </div>

        {resume?.status === 4 && (
          <Result
            status="success"
            title="恭喜您通过简历筛选！"
            subTitle="我们将在近期通过邮件通知您面试安排，请保持关注。"
            style={{ marginTop: 32 }}
          />
        )}

        {resume?.status === 5 && (
          <Result
            status="error"
            title="很遗憾，您的简历未通过筛选"
            subTitle="感谢您的申请，欢迎关注我们后续的招新活动。"
            style={{ marginTop: 32 }}
          />
        )}
      </Card>
    </div>
  );
};

export default ResumeView;