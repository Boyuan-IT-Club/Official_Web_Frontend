// pages/Publish/components/ResumeDisplay.js
import React from "react";
import { Card, Row, Col, Typography, Divider, Image, Tag, Space } from "antd";
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
} from "@ant-design/icons";

const { Title, Text, Paragraph } = Typography;

const ResumeDisplay = ({
  fieldValues = [],
  fieldIdMapping = {},
  photoBase64 = "",
  departments = { first: "", second: "" },
  techStackItems = [],
}) => {
  const getFieldValue = (fieldKey) => {
    const fieldId = fieldIdMapping[fieldKey];
    if (!fieldId) return "";

    const fieldValue = fieldValues.find((fv) => fv.fieldId === fieldId);
    return fieldValue ? fieldValue.fieldValue : "";
  };

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

  const parseInterviewTimes = () => {
    try {
      const interviewTimeField = fieldValues.find(
        (f) => f.fieldId === fieldIdMapping["expected_interview_time"]
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

  // 使用解析后的面试时间数据
  const interviewTimes = parseInterviewTimes();

  // 确保 techStackItems 是数组且过滤空值
  const validTechStackItems = Array.isArray(techStackItems)
    ? techStackItems.filter((item) => item && item.trim())
    : [];

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
              {getFieldValue("name") || "未填写姓名"}
            </Title>
            <Space direction="vertical" size="small">
              {renderField(
                IdcardOutlined,
                "学号",
                getFieldValue("student_id"),
                true
              )}
              {renderField(UserOutlined, "性别", getFieldValue("gender"), true)}
              {renderField(BookOutlined, "专业", getFieldValue("major"), true)}
              {renderField(UserOutlined, "年级", getFieldValue("grade"), true)}
            </Space>
          </Col>
        </Row>
      </div>

      <Divider />

      <Row gutter={24}>
        <Col xs={24} md={12}>
          <Title level={4}>联系方式</Title>
          {renderField(MailOutlined, "邮箱", getFieldValue("email"), true)}
          {renderField(PhoneOutlined, "手机号", getFieldValue("phone"), true)}
          {renderField(GithubOutlined, "GitHub", getFieldValue("github"))}
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
          {renderInterviewTime(
            "是否能参加线下面试",
            interviewTimes.canAttend === "yes" ? "能参加" : "不能参加"
          )}
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

          {getFieldValue("project_experience") && (
            <div style={{ marginBottom: 16 }}>
              <Text strong>
                <CodeOutlined style={{ marginRight: 8 }} />
                项目经验:
              </Text>
              <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
                {getFieldValue("project_experience")}
              </Paragraph>
            </div>
          )}
        </Col>
      </Row>

      <Divider />

      <Row gutter={24}>
        <Col xs={24}>
          <Title level={4}>自我介绍</Title>
          {getFieldValue("introduction") && (
            <div style={{ marginBottom: 16 }}>
              <Text strong>
                <UserOutlined style={{ marginRight: 8 }} />
                个人介绍:
              </Text>
              <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
                {getFieldValue("introduction")}
              </Paragraph>
            </div>
          )}

          {getFieldValue("self_introduction") && (
            <div style={{ marginBottom: 16 }}>
              <Text strong>
                <CommentOutlined style={{ marginRight: 8 }} />
                自我介绍:
              </Text>
              <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
                {getFieldValue("self_introduction")}
              </Paragraph>
            </div>
          )}

          {getFieldValue("reason") && (
            <div style={{ marginTop: 16 }}>
              <Text strong>
                <CommentOutlined style={{ marginRight: 8 }} />
                加入理由:
              </Text>
              <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
                {getFieldValue("reason")}
              </Paragraph>
            </div>
          )}
        </Col>
      </Row>
    </Card>
  );
};

export default ResumeDisplay;
