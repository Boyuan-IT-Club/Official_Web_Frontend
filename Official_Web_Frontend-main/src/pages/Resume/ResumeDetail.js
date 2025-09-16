// src/pages/Resume/ResumeDetail.js
import React from 'react';
import { Card, Row, Col, Typography, Divider, Image, Tag, Space, Button } from 'antd';
import {
  UserOutlined,
  IdcardOutlined,
  MailOutlined,
  PhoneOutlined,
  BookOutlined,
  TeamOutlined,
  CodeOutlined,
  CommentOutlined,
  GithubOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  DownloadOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
const { Title, Text, Paragraph } = Typography;

// --- 新增：从 ResumeDisplay.js 复制的核心函数 ---
const renderField = (icon, label, value, isRequired = false) => {
  if (!value && !isRequired) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <Text strong>
        {React.createElement(icon, { style: { marginRight: 8 } })}
        {label}:
      </Text>
      <Text style={{ marginLeft: 8 }}>{value || "未填写"}</Text>
    </div>
  );
};

const renderDepartment = (label, value) => {
  if (!value || value === "无") return null; // 添加对"无"值的检查
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

const renderInterviewTime = (label, value) => {
  if (!value || value === "无") return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <Text strong>
        <TeamOutlined style={{ marginRight: 8 }} />
        {label}:
      </Text>
      <Text style={{ marginLeft: 8 }}>{value || "未填写"}</Text>
    </div>
  );
};

const parseInterviewTimes = (resume) => {
  try {
    const interviewTimeField = resume.simpleFields?.find(
      (f) => f.fieldId === 14 // 假设 expected_interview_time 的 fieldId 是 14，或根据实际字段名查找
    );
    if (interviewTimeField && interviewTimeField.fieldValue) {
      const timesData = JSON.parse(interviewTimeField.fieldValue);
      return {
        first: timesData.first || "",
        second: timesData.second || "",
        canAttend: timesData.canAttend || "yes",
        customTime: timesData.customTime || "",
      };
    }
  } catch (e) {
    console.error("解析面试时间失败", e);
  }
  return { first: "", second: "", canAttend: "yes", customTime: "" };
};

// --- 新增：获取字段值的辅助函数 ---
const getFieldValueFromResume = (resume, fieldLabel) => {
  if (!resume.simpleFields || !Array.isArray(resume.simpleFields)) return '';
  const field = resume.simpleFields.find(f => f.fieldLabel === fieldLabel);
  return field ? field.fieldValue : '';
};

// --- 主要组件 ---
const ResumeDetail = ({ resume, onBack, onApprove, onReject, onDownload }) => {
  // 如果 `resume` 是 null 或 undefined，显示提示
  if (!resume) {
    return <div className="coming-soon">请选择要查看的简历</div>;
  }

  // 提取数据
  const photoBase64 = getFieldValueFromResume(resume, "个人照片"); // 注意：这里假设是 "个人照片" 字段，或使用 fieldId
  const departments = {
    first: getFieldValueFromResume(resume, "第一志愿"),
    second: getFieldValueFromResume(resume, "第二志愿")
  };

  // 解析面试时间
  const interviewTimes = parseInterviewTimes(resume);

  // 获取技术栈（需要解析 JSON）
  let techStackItems = [];
  try {
    const techStackField = resume.simpleFields?.find((f) => f.fieldLabel === "技术栈");
    if (techStackField && techStackField.fieldValue) {
      techStackItems = JSON.parse(techStackField.fieldValue);
    }
  } catch (e) {
    console.error("解析技术栈失败", e);
  }

  // 过滤掉空的技术栈项
  const validTechStackItems = Array.isArray(techStackItems)
    ? techStackItems.filter((item) => item && item.trim())
    : [];

  // 获取状态信息
  const getStatusInfo = (status) => {
    switch (status) {
      case 5:
        return { text: '已拒绝', color: 'red', icon: <CloseCircleOutlined /> };
      case 4:
        return { text: '已录取', color: 'green', icon: <CheckCircleOutlined /> };
      case 3:
        return { text: '评审中', color: 'blue', icon: <ClockCircleOutlined /> };
      case 2:
        return { text: '已提交', color: 'cyan', icon: <ClockCircleOutlined /> };
      case 1:
      default:
        return { text: '草稿', color: 'default', icon: <ClockCircleOutlined /> };
    }
  };
  const statusInfo = getStatusInfo(resume.status);

  return (
    <div className="resume-detail-container">
      {/* 顶部操作栏 */}
      <div className="detail-header">
        <Button icon={<ArrowLeftOutlined />} onClick={onBack} type="primary" ghost>
          返回列表
        </Button>
        <Space>
          {(resume.status === 1 || resume.status === 2 || resume.status === 3) && (
            <>
              <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => onApprove(resume.resumeId)}>
                通过
              </Button>
              <Button danger icon={<CloseCircleOutlined />} onClick={() => onReject(resume.resumeId)}>
                拒绝
              </Button>
            </>
          )}
          <Button type="default" icon={<DownloadOutlined />} onClick={() => onDownload(resume.resumeId)}>
            下载PDF
          </Button>
          {(resume.status !== 1 && resume.status !== 2) && (
            <Tag icon={statusInfo.icon} color={statusInfo.color}>
              当前状态: {statusInfo.text}
            </Tag>
          )}
        </Space>
      </div>
      {/* 简历主体内容 */}
      <div className="resume-detail-content">
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
                    style={{ objectFit: "cover", border: "1px solid #f0f0f0" }}
                  />
                ) : (
                  <div
                    style={{
                      width: 120,
                      height: 160,
                      border: "1px dashed #d9d9d9",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "#fafafa",
                    }}
                  >
                    <UserOutlined style={{ fontSize: 32, color: "#999" }} />
                  </div>
                )}
              </Col>
              <Col xs={24} md={18}>
                <Title level={2} style={{ marginBottom: 8 }}>
                  {getFieldValueFromResume(resume, "姓名") || "未填写姓名"}
                </Title>
                <Space direction="vertical" size="small">
                  {renderField(IdcardOutlined, "学号", getFieldValueFromResume(resume, "学号"), true)}
                  {renderField(UserOutlined, "性别", getFieldValueFromResume(resume, "性别"), true)}
                  {renderField(BookOutlined, "专业", getFieldValueFromResume(resume, "专业"), true)}
                  {renderField(UserOutlined, "年级", getFieldValueFromResume(resume, "年级"), true)}
                </Space>
              </Col>
            </Row>
          </div>
          <Divider />
          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Title level={4}>联系方式</Title>
              {renderField(MailOutlined, "邮箱", getFieldValueFromResume(resume, "邮箱"), true)}
              {renderField(PhoneOutlined, "手机号", getFieldValueFromResume(resume, "手机号"), true)}
              {renderField(GithubOutlined, "GitHub", getFieldValueFromResume(resume, "GitHub主页"))}
            </Col>
            <Col xs={24} md={12}>
              <Title level={4}>志愿信息</Title>
              {renderDepartment("第一志愿", departments.first)}
              {renderDepartment("第二志愿", departments.second)}
              {interviewTimes.canAttend === "yes" ? (
                <>
                  {renderInterviewTime("第一面试时间", interviewTimes.first)}
                  {renderInterviewTime("第二面试时间", interviewTimes.second)}
                </>
              ) : (
                <div style={{ marginBottom: 12 }}>
                  <Text strong>
                    <TeamOutlined style={{ marginRight: 8 }} />
                    面试安排:
                  </Text>
                  <Text style={{ marginLeft: 8 }}>线上面试（时间待通知）</Text>
                </div>
              )}
              {renderInterviewTime("是否能参加线下面试", interviewTimes.canAttend === "yes" ? "能参加" : "不能参加")}
            </Col>
          </Row>
          <Divider />
          <Row gutter={24}>
            <Col xs={24}>
              <Title level={4}>技术能力</Title>
              {validTechStackItems.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <Text strong>
                    <CodeOutlined style={{ marginRight: 8 }} />
                    技术栈:
                  </Text>
                  <div style={{ marginTop: 8 }}>
                    {validTechStackItems.map((item, index) => (
                      <Tag key={index} color="blue" style={{ marginBottom: 4 }}>
                        {item}
                      </Tag>
                    ))}
                  </div>
                </div>
              )}
              {getFieldValueFromResume(resume, "项目经验") && (
                <div style={{ marginBottom: 16 }}>
                  <Text strong>
                    <CodeOutlined style={{ marginRight: 8 }} />
                    项目经验:
                  </Text>
                  <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
                    {getFieldValueFromResume(resume, "项目经验")}
                  </Paragraph>
                </div>
              )}
            </Col>
          </Row>
          <Divider />
          <Row gutter={24}>
            <Col xs={24}>
              <Title level={4}>自我介绍</Title>
              {getFieldValueFromResume(resume, "自我介绍") && (
                <div style={{ marginBottom: 16 }}>
                  <Text strong>
                    <CommentOutlined style={{ marginRight: 8 }} />
                    自我介绍:
                  </Text>
                  <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
                    {getFieldValueFromResume(resume, "自我介绍")}
                  </Paragraph>
                </div>
              )}
              {getFieldValueFromResume(resume, "加入理由") && (
                <div style={{ marginTop: 16 }}>
                  <Text strong>
                    <CommentOutlined style={{ marginRight: 8 }} />
                    加入理由:
                  </Text>
                  <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
                    {getFieldValueFromResume(resume, "加入理由")}
                  </Paragraph>
                </div>
              )}
            </Col>
          </Row>
        </Card>
      </div>
    </div>
  );
};

export default ResumeDetail;