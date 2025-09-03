// pages/Publish/components/ResumeDisplay.js
import React from 'react';
import { Card, Row, Col, Typography, Divider, Image, Tag, Space } from 'antd';
import {
  UserOutlined,
  IdcardOutlined,
  MailOutlined,
  PhoneOutlined,
  BookOutlined,
  TeamOutlined,
  CodeOutlined,
  CommentOutlined,
  GithubOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

const ResumeDisplay = ({
  fieldValues,
  fieldIdMapping,
  photoBase64,
  departments,
  techStackItems
}) => {
  const getFieldValue = (fieldKey) => {
    const fieldId = fieldIdMapping[fieldKey];
    if (!fieldId) return '';
    
    const fieldValue = fieldValues.find(fv => fv.fieldId === fieldId);
    return fieldValue ? fieldValue.fieldValue : '';
  };

  const renderField = (icon, label, value, isRequired = false) => {
    if (!value && !isRequired) return null;
    
    return (
      <div style={{ marginBottom: 12 }}>
        <Text strong>
          {React.createElement(icon, { style: { marginRight: 8 } })}
          {label}:
        </Text>
        <Text style={{ marginLeft: 8 }}>{value || '未填写'}</Text>
      </div>
    );
  };

  const renderDepartment = (label, value) => {
    if (!value) return null;
    
    return (
      <div style={{ marginBottom: 12 }}>
        <Text strong>
          <TeamOutlined style={{ marginRight: 8 }} />
          {label}:
        </Text>
        <Text style={{ marginLeft: 8 }}>{value}</Text>
      </div>
    );
  };

  return (
    <Card className="resume-display-card">
      <div className="resume-header">
        <Row gutter={24} align="middle">
          <Col xs={24} md={6}>
            {photoBase64 ? (
              <Image
                width={120}
                height={160}
                src={photoBase64}
                alt="个人照片"
                style={{ objectFit: 'cover', border: '1px solid #f0f0f0' }}
              />
            ) : (
              <div
                style={{
                  width: 120,
                  height: 160,
                  border: '1px dashed #d9d9d9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#fafafa'
                }}
              >
                <UserOutlined style={{ fontSize: 32, color: '#999' }} />
              </div>
            )}
          </Col>
          <Col xs={24} md={18}>
            <Title level={2} style={{ marginBottom: 8 }}>
              {getFieldValue('name') || '未填写姓名'}
            </Title>
            <Space direction="vertical" size="small">
              {renderField(IdcardOutlined, '学号', getFieldValue('student_id'), true)}
              {renderField(UserOutlined, '性别', getFieldValue('gender'), true)}
              {renderField(BookOutlined, '专业', getFieldValue('major'), true)}
              {renderField(UserOutlined, '年级', getFieldValue('grade'), true)}
            </Space>
          </Col>
        </Row>
      </div>

      <Divider />

      <Row gutter={24}>
        <Col xs={24} md={12}>
          <Title level={4}>联系方式</Title>
          {renderField(MailOutlined, '邮箱', getFieldValue('email'), true)}
          {renderField(PhoneOutlined, '手机号', getFieldValue('phone'), true)}
          {renderField(GithubOutlined, 'GitHub', getFieldValue('github'))}
        </Col>

        <Col xs={24} md={12}>
          <Title level={4}>志愿信息</Title>
          {renderDepartment('第一志愿', departments.first)}
          {renderDepartment('第二志愿', departments.second)}
          {renderField(TeamOutlined, '期望面试时间', getFieldValue('expected_interview_time'))}
        </Col>
      </Row>

      <Divider />

      <Row gutter={24}>
        <Col xs={24}>
          <Title level={4}>技术能力</Title>
          {techStackItems && techStackItems.length > 0 && techStackItems.some(item => item.trim()) && (
            <div style={{ marginBottom: 16 }}>
              <Text strong>
                <CodeOutlined style={{ marginRight: 8 }} />
                技术栈:
              </Text>
              <div style={{ marginTop: 8 }}>
                {techStackItems
                  .filter(item => item.trim())
                  .map((item, index) => (
                    <Tag key={index} color="blue" style={{ marginBottom: 4 }}>
                      {item}
                    </Tag>
                  ))}
              </div>
            </div>
          )}
          
          {getFieldValue('project_experience') && (
            <div style={{ marginBottom: 16 }}>
              <Text strong>
                <CodeOutlined style={{ marginRight: 8 }} />
                项目经验:
              </Text>
              <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
                {getFieldValue('project_experience')}
              </Paragraph>
            </div>
          )}
        </Col>
      </Row>

      <Divider />

      <Row gutter={24}>
        <Col xs={24}>
          <Title level={4}>自我介绍</Title>
          {getFieldValue('self_introduction') && (
            <Paragraph>
              {getFieldValue('self_introduction')}
            </Paragraph>
          )}
          
          {getFieldValue('reason') && (
            <div style={{ marginTop: 16 }}>
              <Text strong>加入理由:</Text>
              <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
                {getFieldValue('reason')}
              </Paragraph>
            </div>
          )}
        </Col>
      </Row>
    </Card>
  );
};

export default ResumeDisplay;