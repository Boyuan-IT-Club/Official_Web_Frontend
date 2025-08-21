// pages/Publish/index.js
import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Spin,
  Alert,
  message,
  Typography,
  Space,
  Steps,
  Modal
} from 'antd';
import {
  SaveOutlined,
  SendOutlined,
  EditOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchResumeFields,
  fetchOrCreateResume,
  fetchFieldValues,
  saveFieldValues,
  submitResume,
  setFieldValue,
  resetError
} from '@/store/modules/resume';
import './index.scss';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Step } = Steps;

const Publish = () => {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  const { cycleId, fields, resume, fieldValues, loading, saving, submitting, error } = useSelector(
    (state) => state.resume
  );
  const { userInfo } = useSelector((state) => state.user);

  // 修复：使用 useMemo 创建排序后的字段数组
  const sortedFields = useMemo(() => {
    return [...fields].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [fields]);

  useEffect(() => {
    dispatch(fetchResumeFields(cycleId));
    dispatch(fetchOrCreateResume(cycleId));
    dispatch(fetchFieldValues(cycleId));
  }, [dispatch, cycleId]);

  useEffect(() => {
    if (error) {
      message.error(error);
      dispatch(resetError());
    }
  }, [error, dispatch]);

  const handleFieldChange = (fieldId, value) => {
    dispatch(setFieldValue({ fieldId, value }));
  };

  const handleSaveDraft = async () => {
    try {
      await dispatch(saveFieldValues({ cycleId, fieldValues })).unwrap();
      message.success('保存成功');
    } catch (error) {
      message.error('保存失败');
    }
  };

  const handleSubmit = async () => {
    try {
      await dispatch(submitResume(cycleId)).unwrap();
      message.success('简历提交成功！');
      setShowSubmitConfirm(false);
      setCurrentStep(2); // 跳转到完成页面
    } catch (error) {
      message.error('提交失败');
    }
  };

  const isAllRequiredFieldsFilled = () => {
    const requiredFields = fields.filter(field => field.isRequired);
    return requiredFields.every(requiredField => {
      const fieldValue = fieldValues.find(fv => fv.fieldId === requiredField.fieldId);
      return fieldValue && fieldValue.fieldValue && fieldValue.fieldValue.trim() !== '';
    });
  };

  const getFieldValue = (fieldId) => {
    const fieldValue = fieldValues.find(fv => fv.fieldId === fieldId);
    return fieldValue ? fieldValue.fieldValue : '';
  };

  const renderStatusTag = () => {
    if (!resume) return null;

    const statusConfig = {
      1: { text: '草稿', color: 'orange' },
      2: { text: '审核中', color: 'blue' },
      3: { text: '已提交', color: 'green' },
      4: { text: '已拒绝', color: 'red' }
    };

    const config = statusConfig[resume.status] || { text: '未知', color: 'gray' };

    return (
      <span style={{ color: config.color, fontWeight: 'bold', marginLeft: 8 }}>
        {config.text}
      </span>
    );
  };

  if (loading && !resume) {
    return (
      <div className="publish-loading">
        <Spin size="large" />
        <Text>加载简历信息中...</Text>
      </div>
    );
  }

  return (
    <div className="publish-page">
      <Card>
        <div className="resume-header">
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Title level={2}>
              2024年度招新简历投递
              {resume && renderStatusTag()}
            </Title>
            <Text type="secondary">
              欢迎 {userInfo?.name}，请填写以下信息完成简历投递
            </Text>
          </Space>
        </div>

        {resume?.status === 3 && (
          <Alert
            message="简历已提交"
            description="您的简历已经成功提交，请等待审核结果。如需修改，请联系管理员。"
            type="success"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        <Steps current={currentStep} onChange={setCurrentStep} style={{ marginBottom: 32 }}>
          <Step title="填写基本信息" />
          <Step title="预览确认" />
          <Step title="完成提交" />
        </Steps>

        {currentStep === 0 && (
          <div className="resume-form">
            <Form form={form} layout="vertical">
              {sortedFields.map((field) => (
                <Form.Item
                  key={field.fieldId}
                  label={
                    <span>
                      {field.fieldLabel}
                      {field.isRequired && <span style={{ color: 'red' }}> *</span>}
                    </span>
                  }
                  name={`field_${field.fieldId}`}
                  initialValue={getFieldValue(field.fieldId)}
                  rules={[
                    {
                      required: field.isRequired,
                      message: `请输入${field.fieldLabel}`
                    },
                    {
                      min: field.isRequired ? 10 : 0,
                      message: `${field.fieldLabel}至少需要10个字符`
                    }
                  ]}
                >
                  <TextArea
                    rows={6}
                    placeholder={`请详细填写${field.fieldLabel}...`}
                    onChange={(e) => handleFieldChange(field.fieldId, e.target.value)}
                    disabled={resume?.status === 3}
                  />
                </Form.Item>
              ))}
            </Form>

            <div className="form-actions">
              <Space>
                <Button
                  icon={<SaveOutlined />}
                  loading={saving}
                  onClick={handleSaveDraft}
                  disabled={resume?.status === 3}
                >
                  保存草稿
                </Button>
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={() => setCurrentStep(1)}
                  disabled={!isAllRequiredFieldsFilled() || resume?.status === 3}
                >
                  预览简历
                </Button>
              </Space>
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="resume-preview">
            <Card title="简历预览" bordered={false}>
              {sortedFields.map((field) => {
                const value = getFieldValue(field.fieldId);
                return (
                  <div key={field.fieldId} className="preview-item">
                    <Text strong>{field.fieldLabel}:</Text>
                    <div className="preview-content">
                      {value || <Text type="secondary">未填写</Text>}
                    </div>
                  </div>
                );
              })}
            </Card>

            <div className="preview-actions">
              <Space>
                <Button onClick={() => setCurrentStep(0)}>返回修改</Button>
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  loading={submitting}
                  onClick={() => setShowSubmitConfirm(true)}
                  disabled={resume?.status === 3}
                >
                  提交简历
                </Button>
              </Space>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="submit-success">
            <div className="success-content">
              <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a' }} />
              <Title level={3}>简历提交成功！</Title>
              <Text type="secondary">
                您的简历已经成功提交，我们会尽快审核。请保持联系方式畅通。
              </Text>
              <Button
                type="primary"
                style={{ marginTop: 24 }}
                onClick={() => setCurrentStep(0)}
              >
                返回查看
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Modal
        title="确认提交"
        open={showSubmitConfirm}
        onOk={handleSubmit}
        onCancel={() => setShowSubmitConfirm(false)}
        okText="确认提交"
        cancelText="再检查一下"
        okButtonProps={{ loading: submitting }}
      >
        <p>确定要提交简历吗？提交后将无法修改。</p>
        <p style={{ color: 'red' }}>请确保所有信息准确无误。</p>
      </Modal>
    </div>
  );
};

export default Publish;