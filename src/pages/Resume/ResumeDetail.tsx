import React from 'react';
import { Card, Row, Col, Typography, Divider, Image, Tag, Space, Button, Modal } from 'antd';
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
  ArrowLeftOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

type SimpleField = {
  fieldId?: number;
  fieldLabel?: string;
  fieldKey?: string;
  fieldValue?: string;
};

type Resume = {
  resumeId: string | number;
  status: number;
  simpleFields?: SimpleField[];
  [key: string]: any; // 不改后端结构：放行其它字段
};

// --- 复用 ResumeList 中的解析函数（保持原逻辑不变） ---
const parseExpectedDepartments = (rawValue: unknown): string => {
  if (!rawValue) return '';
  const str = String(rawValue);

  try {
    const parsedValue: unknown = JSON.parse(str);
    if (Array.isArray(parsedValue)) {
      return (parsedValue as unknown[])
        .filter((dept) => typeof dept === 'string' && dept.trim() && dept !== '无')
        .join(', ');
    } else if (typeof parsedValue === 'string') {
      return parsedValue;
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log('不是 JSON 格式，使用备用解析方法');
  }

  let cleanedValue = str.replace(/["'()[\]]/g, '');
  cleanedValue = cleanedValue.trim();
  const departments = cleanedValue
    .split(',')
    .map((dep) => dep.trim())
    .filter((dep) => dep && dep !== '无');

  if (departments.length === 0) return '';
  return departments.join(', ');
};

// --- 保留原有的辅助函数（只加类型） ---
const renderField = (
  icon: any,
  label: string,
  value: string,
  isRequired = false
): React.ReactNode => {
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

const renderDepartment = (label: string, value: string): React.ReactNode => {
  if (!value || value === '无') return null;
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

const renderInterviewTime = (label: string, value: string): React.ReactNode => {
  if (!value || value === '无') return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <Text strong>
        <TeamOutlined style={{ marginRight: 8 }} />
        {label}:
      </Text>
      <Text style={{ marginLeft: 8 }}>{value || '未填写'}</Text>
    </div>
  );
};

const parseInterviewTimes = (resume: Resume): { first: string; second: string; canAttend: string; customTime: string } => {
  try {
    const interviewTimeField = resume.simpleFields?.find((f) => f.fieldId === 14);
    if (interviewTimeField && interviewTimeField.fieldValue) {
      const timesData = JSON.parse(interviewTimeField.fieldValue) as any;
      return {
        first: timesData.first || '',
        second: timesData.second || '',
        canAttend: timesData.canAttend || 'yes',
        customTime: timesData.customTime || '',
      };
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('解析面试时间失败', e);
  }
  return { first: '', second: '', canAttend: 'yes', customTime: '' };
};

// --- 新增：获取字段值的辅助函数（只加类型）---
const getFieldValueFromResume = (resume: Resume, fieldLabel: string): string => {
  if (!resume.simpleFields || !Array.isArray(resume.simpleFields)) return '';
  const field = resume.simpleFields.find((f) => f.fieldLabel === fieldLabel);
  return field ? field.fieldValue || '' : '';
};

type ResumeDetailProps = {
  resume?: Resume | null;
  onBack?: () => void;
  onApprove?: (resumeId: string | number) => void;
  onReject?: (resumeId: string | number) => void;
  onDownload?: (resumeId: string | number) => void;
};

// --- 主要组件 ---
const ResumeDetail: React.FC<ResumeDetailProps> = ({ resume, onBack, onApprove, onReject, onDownload }) => {
  if (!resume) {
    return <div className="coming-soon">请选择要查看的简历</div>;
  }

  const handleApproveWithConfirm = (): void => {
    Modal.confirm({
      title: '确认通过简历',
      content: `确定要通过 ${getFieldValueFromResume(resume, '姓名') || '该'} 的简历吗？`,
      okText: '通过',
      cancelText: '取消',
      okType: 'primary',
      onOk: () => onApprove?.(resume.resumeId),
    });
  };

  const handleRejectWithConfirm = (): void => {
    Modal.confirm({
      title: '确认拒绝简历',
      content: `确定要拒绝 ${getFieldValueFromResume(resume, '姓名') || '该'} 的简历吗？`,
      okText: '拒绝',
      cancelText: '取消',
      okType: 'danger',
      onOk: () => onReject?.(resume.resumeId),
    });
  };

  // 提取数据
  const photoBase64 = getFieldValueFromResume(resume, '个人照片');
  const departments = {
    first: getFieldValueFromResume(resume, '第一志愿'),
    second: getFieldValueFromResume(resume, '第二志愿'),
  };

  const interviewTimes = parseInterviewTimes(resume);

  // 获取技术栈（保持原逻辑不变）
  let techStackItems: any[] = [];
  try {
    const techStackField = resume.simpleFields?.find((f) => f.fieldLabel === '技术栈');
    if (techStackField && techStackField.fieldValue) {
      techStackItems = JSON.parse(techStackField.fieldValue);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('解析技术栈失败', e);
  }

  const validTechStackItems = Array.isArray(techStackItems)
    ? techStackItems.filter((item) => item && String(item).trim())
    : [];

  // 获取状态信息
  const getStatusInfo = (status: number) => {
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

  // 解析期望部门（保持原逻辑不变）
  const rawExpectedDeptValue = getFieldValueFromResume(resume, '期望部门');
  const expectedDepartments = parseExpectedDepartments(rawExpectedDeptValue);

  return (
    <div className="resume-detail-container">
      <div className="detail-header">
        <Button icon={<ArrowLeftOutlined />} onClick={() => onBack?.()} type="primary" ghost>
          返回列表
        </Button>
        <Space>
          {resume.status === 3 && (
            <>
              <Button type="primary" icon={<CheckCircleOutlined />} onClick={handleApproveWithConfirm}>
                通过
              </Button>
              <Button danger icon={<CloseCircleOutlined />} onClick={handleRejectWithConfirm}>
                拒绝
              </Button>
            </>
          )}
          <Button type="default" icon={<DownloadOutlined />} onClick={() => onDownload?.(resume.resumeId)}>
            下载PDF
          </Button>
        </Space>
      </div>

      <div className="resume-detail-content">
        <Card
          className="resume-display-card"
          extra={
            <Tag icon={statusInfo.icon} color={statusInfo.color} style={{ fontSize: '14px' }}>
              {statusInfo.text}
            </Tag>
          }
        >
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
                      backgroundColor: '#fafafa',
                    }}
                  >
                    <UserOutlined style={{ fontSize: 32, color: '#999' }} />
                  </div>
                )}
              </Col>

              <Col xs={24} md={18}>
                <Title level={2} style={{ marginBottom: 8 }}>
                  {getFieldValueFromResume(resume, '姓名') || '未填写姓名'}
                </Title>
                <Space direction="vertical" size="small">
                  {renderField(IdcardOutlined, '学号', getFieldValueFromResume(resume, '学号'), true)}
                  {renderField(UserOutlined, '性别', getFieldValueFromResume(resume, '性别'), true)}
                  {renderField(BookOutlined, '专业', getFieldValueFromResume(resume, '专业'), true)}
                  {renderField(UserOutlined, '年级', getFieldValueFromResume(resume, '年级'), true)}
                </Space>
              </Col>
            </Row>
          </div>

          <Divider />

          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Title level={4}>联系方式</Title>
              {renderField(MailOutlined, '邮箱', getFieldValueFromResume(resume, '邮箱'), true)}
              {renderField(PhoneOutlined, '手机号', getFieldValueFromResume(resume, '手机号'), true)}
              {renderField(GithubOutlined, 'GitHub', getFieldValueFromResume(resume, 'GitHub地址'))}
            </Col>

            <Col xs={24} md={12}>
              <Title level={4}>志愿信息</Title>
              {renderField(TeamOutlined, '期望部门', expectedDepartments)}
              {renderDepartment('第一志愿', departments.first)}
              {renderDepartment('第二志愿', departments.second)}

              {interviewTimes.canAttend === 'yes' ? (
                <>
                  {renderInterviewTime('第一面试时间', interviewTimes.first)}
                  {renderInterviewTime('第二面试时间', interviewTimes.second)}
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
                '是否能参加线下面试',
                interviewTimes.canAttend === 'yes' ? '能参加' : '不能参加'
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
                        {String(item)}
                      </Tag>
                    ))}
                  </div>
                </div>
              )}

              {getFieldValueFromResume(resume, '项目经验') && (
                <div style={{ marginBottom: 16 }}>
                  <Text strong>
                    <CodeOutlined style={{ marginRight: 8 }} />
                    项目经验:
                  </Text>
                  <Paragraph style={{ marginTop: 8, marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                    {getFieldValueFromResume(resume, '项目经验')}
                  </Paragraph>
                </div>
              )}
            </Col>
          </Row>

          <Divider />

          <Row gutter={24}>
            <Col xs={24}>
              <Title level={4}>自我介绍</Title>

              {getFieldValueFromResume(resume, '自我介绍') && (
                <div style={{ marginBottom: 16 }}>
                  <Text strong>
                    <CommentOutlined style={{ marginRight: 8 }} />
                    自我介绍:
                  </Text>
                  <Paragraph style={{ marginTop: 8, marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                    {getFieldValueFromResume(resume, '自我介绍')}
                  </Paragraph>
                </div>
              )}

              {getFieldValueFromResume(resume, '加入理由') && (
                <div style={{ marginTop: 16 }}>
                  <Text strong>
                    <CommentOutlined style={{ marginRight: 8 }} />
                    加入理由:
                  </Text>
                  <Paragraph style={{ marginTop: 8, marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                    {getFieldValueFromResume(resume, '加入理由')}
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
