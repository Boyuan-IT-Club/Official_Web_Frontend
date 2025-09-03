// pages/Publish/components/ResumePreview.js
import React from 'react';
import {
  Card,
  Typography,
  Row,
  Col,
  Avatar,
  Tag,
  Divider
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

const ResumePreview = ({ fieldValues, fieldIdMapping, photoBase64, departments, techStackItems }) => {
  
  const getFieldValue = (fieldKey) => {
    const fieldId = fieldIdMapping[fieldKey];
    if (!fieldId) return '';
    
    const fieldValue = fieldValues.find(fv => fv.fieldId === fieldId);
    return fieldValue ? fieldValue.fieldValue : '';
  };


  return (
    <div className="resume-preview">
      <Card>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3}>简历预览</Title>
          <Text type="secondary">请仔细核对以下信息，提交后将无法修改</Text>
        </div>

        <Row gutter={24}>
          <Col xs={24} lg={18}>
            {/* 个人信息 */}
            <div style={{ marginBottom: 24 }}>
              <Title level={4}>个人信息</Title>
              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <div style={{ marginBottom: 12 }}>
                    <Text strong>学号:</Text>
                    <Text> {getFieldValue('student_id') || '未填写'}</Text>
                  </div>
                </Col>
                <Col xs={24} md={8}>
                  <div style={{ marginBottom: 12 }}>
                    <Text strong>姓名:</Text>
                    <Text> {getFieldValue('name') || '未填写'}</Text>
                  </div>
                </Col>
                <Col xs={24} md={8}>
                  <div style={{ marginBottom: 12 }}>
                    <Text strong>性别:</Text>
                    <Text> {getFieldValue('gender') || '未填写'}</Text>
                  </div>
                </Col>
              </Row>
              
              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <div style={{ marginBottom: 12 }}>
                    <Text strong>专业:</Text>
                    <Text> {getFieldValue('major') || '未填写'}</Text>
                  </div>
                </Col>
                <Col xs={24} md={8}>
                  <div style={{ marginBottom: 12 }}>
                    <Text strong>年级:</Text>
                    <Text> {getFieldValue('grade') || '未填写'}</Text>
                  </div>
                </Col>
                <Col xs={24} md={8}>
                  <div style={{ marginBottom: 12 }}>
                    <Text strong>GitHub:</Text>
                    <Text> {getFieldValue('github') || '未填写'}</Text>
                  </div>
                </Col>
              </Row>
              
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <div style={{ marginBottom: 12 }}>
                    <Text strong><MailOutlined /> 邮箱:</Text>
                    <Text> {getFieldValue('email') || '未填写'}</Text>
                  </div>
                </Col>
                <Col xs={24} md={12}>
                  <div style={{ marginBottom: 12 }}>
                    <Text strong><PhoneOutlined /> 手机号:</Text>
                    <Text> {getFieldValue('phone') || '未填写'}</Text>
                  </div>
                </Col>
              </Row>
            </div>

            <Divider />

            {/* 志愿信息 */}
            <div style={{ marginBottom: 24 }}>
              <Title level={4}>志愿信息</Title>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <div style={{ marginBottom: 12 }}>
                    <Text strong>第一志愿:</Text>
                    <Text> {departments.first || '未填写'}</Text>
                  </div>
                </Col>
                <Col xs={24} md={12}>
                  <div style={{ marginBottom: 12 }}>
                    <Text strong>第二志愿:</Text>
                    <Text> {departments.second || '未填写'}</Text>
                  </div>
                </Col>
              </Row>
              <div style={{ marginBottom: 12 }}>
                <Text strong>期望面试时间:</Text>
                <Text> {getFieldValue('expected_interview_time') || '未填写'}</Text>
              </div>
            </div>

            <Divider />

            {/* 技术能力 */}
            <div style={{ marginBottom: 24 }}>
              <Title level={4}>技术能力</Title>
              <div style={{ marginBottom: 16 }}>
                <Text strong>技术栈:</Text>
                <div style={{ marginTop: 8 }}>
                  {techStackItems.filter(item => item.trim() !== '').map((tech, index) => (
                    <Tag key={index} color="blue" style={{ marginBottom: 4 }}>{tech}</Tag>
                  ))}
                  {techStackItems.filter(item => item.trim() !== '').length === 0 && 
                    <Text type="secondary">未填写</Text>
                  }
                </div>
              </div>
              
              <div style={{ marginBottom: 16 }}>
                <Text strong>项目经验:</Text>
                <Text style={{ display: 'block', marginTop: 8, whiteSpace: 'pre-wrap' }}>
                  {getFieldValue('project_experience') || '未填写'}
                </Text>
              </div>
            </div>

            <Divider />

            {/* 自我介绍 */}
            <div style={{ marginBottom: 24 }}>
              <Title level={4}>自我介绍</Title>
              <div style={{ marginBottom: 16 }}>
                <Text strong>个人简介:</Text>
                <Text style={{ display: 'block', marginTop: 8, whiteSpace: 'pre-wrap' }}>
                  {getFieldValue('introduction') || '未填写'}
                </Text>
              </div>
              
              <div style={{ marginBottom: 16 }}>
                <Text strong>自我介绍:</Text>
                <Text style={{ display: 'block', marginTop: 8, whiteSpace: 'pre-wrap' }}>
                  {getFieldValue('self_introduction') || '未填写'}
                </Text>
              </div>
              
              <div style={{ marginBottom: 16 }}>
                <Text strong>加入理由:</Text>
                <Text style={{ display: 'block', marginTop: 8, whiteSpace: 'pre-wrap' }}>
                  {getFieldValue('reason') || '未填写'}
                </Text>
              </div>
            </div>
          </Col>

          <Col xs={24} lg={6}>
            <div style={{ textAlign: 'center' }}>
              <Avatar
                size={100}
                src={photoBase64 ? `data:image/jpeg;base64,${photoBase64}` : null}
                icon={<UserOutlined />}
                style={{ marginBottom: 16 }}
              />
              <Text strong style={{ display: 'block' }}>个人照片</Text>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default ResumePreview;