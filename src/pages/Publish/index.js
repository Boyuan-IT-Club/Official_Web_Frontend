// pages/Publish/index.js
import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Spin,
  message,
  Typography,
  Space,
  Upload,
  Select,
  Row,
  Col,
  Radio,
  Modal
} from 'antd';
import {
  SaveOutlined,
  SendOutlined,
  UploadOutlined,
  UserOutlined,
  IdcardOutlined,
  MailOutlined,
  PhoneOutlined,
  BookOutlined,
  ManOutlined,
  TeamOutlined,
  CommentOutlined,
  CodeOutlined,
  ProjectOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchResumeFields,
  fetchOrCreateResume,
  fetchFieldValues,
  saveFieldValues,
  submitResume,
  setFieldValue,
  resetError} from '@/store/modules/resume';
import './index.scss';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const Publish = () => {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [photoFile, setPhotoFile] = useState(null);
  const [photoBase64, setPhotoBase64] = useState('');
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isPhotoCompressing, setIsPhotoCompressing] = useState(false);

  const { cycleId, fields, resume, fieldValues, loading, saving, submitting, error } = useSelector(
    (state) => state.resume
  );
  const { userInfo } = useSelector((state) => state.user);

  // 预定义的字段配置
  const predefinedFields = useMemo(() => [
    { fieldId: 'name', fieldLabel: '姓名', isRequired: true, sortOrder: 1, icon: <UserOutlined /> },
    { fieldId: 'major', fieldLabel: '专业', isRequired: true, sortOrder: 2, icon: <BookOutlined /> },
    { fieldId: 'email', fieldLabel: '邮箱', isRequired: true, sortOrder: 3, icon: <MailOutlined /> },
    { fieldId: 'phone', fieldLabel: '手机号', isRequired: true, sortOrder: 4, icon: <PhoneOutlined /> },
    { fieldId: 'grade', fieldLabel: '年级', isRequired: true, sortOrder: 5, icon: <IdcardOutlined /> },
    { fieldId: 'gender', fieldLabel: '性别', isRequired: true, sortOrder: 6, icon: <ManOutlined /> },
    { fieldId: 'personal_photo', fieldLabel: '个人照片', isRequired: true, sortOrder: 7, icon: <UserOutlined /> },
    { fieldId: 'self_introduction', fieldLabel: '自我介绍', isRequired: true, sortOrder: 8, icon: <CommentOutlined /> },
    { fieldId: 'tech_stack', fieldLabel: '技术栈', isRequired: true, sortOrder: 9, icon: <CodeOutlined /> },
    { fieldId: 'project_experience', fieldLabel: '项目经验', isRequired: true, sortOrder: 10, icon: <ProjectOutlined /> },
    { fieldId: 'expected_interview_time', fieldLabel: '期望的面试时间', isRequired: true, sortOrder: 11, icon: <CalendarOutlined /> },
    { fieldId: 'expected_department', fieldLabel: '期望部门', isRequired: true, sortOrder: 12, icon: <TeamOutlined /> }
  ], []);

  // 部门选项
  const DEPARTMENT_OPTIONS = [
    { value: 'media', label: '媒体部' },
    { value: 'project', label: '项目部' },
    { value: 'tech', label: '技术部' },
    { value: 'general', label: '综合部' }
  ];

  // 年级选项
  const GRADE_OPTIONS = [
    { value: 'freshman', label: '大一' },
    { value: 'sophomore', label: '大二' },
    { value: 'junior', label: '大三' },
    { value: 'senior', label: '大四' },
    { value: 'graduate', label: '研究生' }
  ];

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

  // 从字段值中获取照片数据
  useEffect(() => {
    const photoValue = getFieldValue('personal_photo');
    if (photoValue && photoValue.startsWith('data:image')) {
      setPhotoBase64(photoValue);
    }
  }, [fieldValues]);

  // 处理字段变化的函数
  const handleFieldChange = (fieldId, value) => {
    dispatch(setFieldValue({ fieldId, value }));
  };

  // 压缩图片函数
  const compressImage = (file, maxWidth = 800, maxHeight = 800, quality = 0.7) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // 计算缩放比例
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // 转换为base64
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoUpload = async (file) => {
    setIsPhotoCompressing(true);
    try {
      // 检查文件大小（限制为2MB）
      if (file.size > 2 * 1024 * 1024) {
        message.error('照片大小不能超过2MB');
        return false;
      }

      // 检查文件类型
      if (!file.type.startsWith('image/')) {
        message.error('请上传图片文件');
        return false;
      }

      // 压缩图片
      const compressedBase64 = await compressImage(file);
      
      setPhotoBase64(compressedBase64);
      setPhotoFile(file);
      
      // 将压缩后的base64图片数据保存到字段值中
      dispatch(setFieldValue({ fieldId: 'personal_photo', value: compressedBase64 }));
      message.success('照片上传成功');
      
      return true;
    } catch (error) {
      message.error('照片处理失败');
      return false;
    } finally {
      setIsPhotoCompressing(false);
    }
  };

  const beforeUpload = (file) => {
    handlePhotoUpload(file);
    return false; // 阻止默认上传行为
  };

  const handleSaveDraft = async () => {
    try {
      // 创建不包含照片数据的字段值副本
      const fieldValuesWithoutPhoto = fieldValues.map(item => {
        if (item.fieldId === 'personal_photo') {
          // 对于照片字段，只保存一个标记，不保存实际的base64数据
          return { 
            fieldId: item.fieldId, 
            fieldValue: photoBase64 ? 'photo_uploaded' : '' 
          };
        }
        return { ...item };
      });

      // 修改：直接传递 fieldValuesWithoutPhoto 数组
      await dispatch(saveFieldValues({ 
        cycleId, 
        fieldValues: fieldValuesWithoutPhoto 
      })).unwrap();
      
      message.success('保存成功');
    } catch (error) {
      console.error('保存错误:', error);
      message.error('保存失败，请检查网络连接或联系管理员');
    }
  };

  const handleSubmit = async () => {
    try {
      // 提交时也使用不包含照片数据的字段值
      const fieldValuesWithoutPhoto = fieldValues.map(item => {
        if (item.fieldId === 'personal_photo') {
          return { 
            fieldId: item.fieldId, 
            fieldValue: photoBase64 ? 'photo_uploaded' : '' 
          };
        }
        return { ...item };
      });

      // 修改：直接传递 fieldValuesWithoutPhoto 数组
      await dispatch(saveFieldValues({ 
        cycleId, 
        fieldValues: fieldValuesWithoutPhoto 
      })).unwrap();
      
      // 然后提交简历
      await dispatch(submitResume(cycleId)).unwrap();
      message.success('简历提交成功！');
      setShowSubmitConfirm(false);
      
      // 重新加载简历数据
      dispatch(fetchOrCreateResume(cycleId));
      dispatch(fetchFieldValues(cycleId));
    } catch (error) {
      console.error('提交错误:', error);
      message.error('提交失败，请检查网络连接或联系管理员');
    }
  };

  const getFieldValue = (fieldId) => {
    const fieldValue = fieldValues.find(fv => fv.fieldId === fieldId);
    return fieldValue ? fieldValue.fieldValue : '';
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
      <div className="questionnaire-header">
        <Title level={2} style={{ textAlign: 'center', marginBottom: 8 }}>
          博远信息技术社招新申请表
        </Title>
        <Text type="secondary" style={{ textAlign: 'center', display: 'block', marginBottom: 24 }}>
          欢迎加入博远信息技术社，请填写以下信息完成申请
        </Text>
      </div>

      <Card className="questionnaire-card">
        <Form
          form={form}
          layout="vertical"
          className="questionnaire-form"
        >
          {/* 基本信息区域 */}
          <div className="form-section">
            <Title level={4} className="section-title">
              <IdcardOutlined /> 基本信息
            </Title>
            
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="姓名"
                  name="name"
                  rules={[{ required: true, message: '请输入姓名' }]}
                  initialValue={getFieldValue('name')}
                >
                  <Input
                    prefix={<UserOutlined />}
                    placeholder="请输入您的姓名"
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="性别"
                  name="gender"
                  rules={[{ required: true, message: '请选择性别' }]}
                  initialValue={getFieldValue('gender')}
                >
                  <Radio.Group 
                    onChange={(e) => handleFieldChange('gender', e.target.value)}
                  >
                    <Radio value="male">男</Radio>
                    <Radio value="female">女</Radio>
                  </Radio.Group>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="专业"
                  name="major"
                  rules={[{ required: true, message: '请输入专业' }]}
                  initialValue={getFieldValue('major')}
                >
                  <Input
                    prefix={<BookOutlined />}
                    placeholder="请输入您的专业"
                    onChange={(e) => handleFieldChange('major', e.target.value)}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="年级"
                  name="grade"
                  rules={[{ required: true, message: '请选择年级' }]}
                  initialValue={getFieldValue('grade')}
                >
                  <Select
                    placeholder="请选择年级"
                    onChange={(value) => handleFieldChange('grade', value)}
                  >
                    {GRADE_OPTIONS.map(grade => (
                      <Option key={grade.value} value={grade.value}>{grade.label}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="邮箱"
                  name="email"
                  rules={[
                    { required: true, message: '请输入邮箱' },
                    { type: 'email', message: '请输入有效的邮箱地址' }
                  ]}
                  initialValue={getFieldValue('email')}
                >
                  <Input
                    prefix={<MailOutlined />}
                    placeholder="请输入您的邮箱"
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="手机号"
                  name="phone"
                  rules={[
                    { required: true, message: '请输入手机号' },
                    { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号码' }
                  ]}
                  initialValue={getFieldValue('phone')}
                >
                  <Input
                    prefix={<PhoneOutlined />}
                    placeholder="请输入您的手机号"
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              label="个人照片"
              name="personal_photo"
              rules={[{ required: true, message: '请上传个人照片' }]}
            >
              <div style={{ textAlign: 'center' }}>
                <Upload
                  name="personal_photo"
                  listType="picture-card"
                  showUploadList={false}
                  beforeUpload={beforeUpload}
                  accept="image/*"
                  disabled={isPhotoCompressing}
                >
                  {isPhotoCompressing ? (
                    <Spin />
                  ) : photoBase64 ? (
                    <img 
                      src={photoBase64} 
                      alt="个人照片" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div>
                      <UploadOutlined />
                      <div style={{ marginTop: 8 }}>上传照片</div>
                    </div>
                  )}
                </Upload>
                <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                  建议上传正面免冠照片，大小不超过2MB
                </Text>
                {photoBase64 && (
                  <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
                    照片已上传（已压缩）
                  </Text>
                )}
              </div>
            </Form.Item>
          </div>

          {/* 技术能力区域 */}
          <div className="form-section">
            <Title level={4} className="section-title">
              <CodeOutlined /> 技术能力
            </Title>

            <Form.Item
              label="技术栈"
              name="tech_stack"
              rules={[{ required: true, message: '请输入您掌握的技术栈' }]}
              initialValue={getFieldValue('tech_stack')}
            >
              <TextArea
                rows={4}
                placeholder="例如：JavaScript, React, Node.js, Python, Java..."
                onChange={(e) => handleFieldChange('tech_stack', e.target.value)}
              />
            </Form.Item>

            <Form.Item
              label="项目经验"
              name="project_experience"
              rules={[{ required: true, message: '请简要描述您的项目经验' }]}
              initialValue={getFieldValue('project_experience')}
            >
              <TextArea
                rows={4}
                placeholder="请描述您参与过的项目，包括项目角色、使用的技术、取得的成果等..."
                onChange={(e) => handleFieldChange('project_experience', e.target.value)}
              />
            </Form.Item>
          </div>

          {/* 自我介绍区域 */}
          <div className="form-section">
            <Title level={4} className="section-title">
              <CommentOutlined /> 自我介绍
            </Title>

            <Form.Item
              label="自我介绍"
              name="self_introduction"
              rules={[{ required: true, message: '请输入自我介绍' }]}
              initialValue={getFieldValue('self_introduction')}
            >
              <TextArea
                rows={6}
                placeholder="请介绍一下您的个人特点、兴趣爱好、为什么想加入我们社团等..."
                onChange={(e) => handleFieldChange('self_introduction', e.target.value)}
              />
            </Form.Item>
          </div>

          {/* 志愿选择区域 */}
          <div className="form-section">
            <Title level={4} className="section-title">
              <TeamOutlined /> 志愿选择
            </Title>

            <Form.Item
              label="期望部门"
              name="expected_department"
              rules={[{ required: true, message: '请选择期望部门' }]}
              initialValue={getFieldValue('expected_department')}
            >
              <Select
                placeholder="请选择您想加入的部门"
                onChange={(value) => handleFieldChange('expected_department', value)}
              >
                {DEPARTMENT_OPTIONS.map(dept => (
                  <Option key={dept.value} value={dept.value}>
                    <strong>{dept.label}</strong> - 
                    {dept.value === 'media' && ' 负责社团宣传、活动摄影、推文制作等'}
                    {dept.value === 'project' && ' 负责项目策划、活动组织、资源协调等'}
                    {dept.value === 'tech' && ' 负责技术支持、网站维护、技术培训等'}
                    {dept.value === 'general' && ' 负责日常事务、人员管理、文档整理等'}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="期望的面试时间"
              name="expected_interview_time"
              rules={[{ required: true, message: '请选择期望的面试时间' }]}
              initialValue={getFieldValue('expected_interview_time')}
            >
              <Select
                placeholder="请选择您方便的面试时间段"
                onChange={(value) => handleFieldChange('expected_interview_time', value)}
              >
                <Option value="weekday_evening">工作日晚上</Option>
                <Option value="weekend_morning">周末上午</Option>
                <Option value="weekend_afternoon">周末下午</Option>
                <Option value="weekend_evening">周末晚上</Option>
                <Option value="anytime">任何时间都可以</Option>
              </Select>
            </Form.Item>
          </div>

          {/* 提交按钮 */}
          <div className="form-actions">
            <Space>
              <Button
                icon={<SaveOutlined />}
                loading={saving}
                onClick={handleSaveDraft}
                size="large"
              >
                保存草稿
              </Button>
              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={submitting}
                onClick={() => setShowSubmitConfirm(true)}
                size="large"
              >
                提交申请
              </Button>
            </Space>
          </div>
        </Form>
      </Card>

      <Modal
        title="提交申请"
        open={showSubmitConfirm}
        onOk={handleSubmit}
        onCancel={() => setShowSubmitConfirm(false)}
        okText="确认提交"
        cancelText="再检查一下"
        okButtonProps={{ loading: submitting }}
      >
        <p>确定要提交申请吗？</p>
        {photoBase64 && (
          <p style={{ color: 'orange' }}>
            注意：照片数据将在最终提交时处理
          </p>
        )}
      </Modal>
    </div>
  );
};

export default Publish;