// pages/Publish/index.js
import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Form,
  Button,
  Spin,
  Alert,
  message,
  Typography,
  Space,
  Row,
  Col,
  Modal
} from 'antd';
import {
  SendOutlined,
  EditOutlined,
  IdcardOutlined,
  CodeOutlined,
  CommentOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';

// 导入封装的组件
import { compressImage } from '@/utils/imageCompress';
import TextInputField from './components/TextInputField';
import SelectField from './components/SelectField';
import TextAreaField from './components/TextAreaField';
import RadioGroupField from './components/RadioGroupField';
import TechStackInput from './components/TechStackInput';
import PhotoUpload from './components/PhotoUpload';
import TipsCard from './components/TipsCard';
import FormSection from './components/FormSection';
import ResumeDisplay from './components/ResumeDisplay';

import {
  fetchResumeFields,
  fetchOrCreateResume,
  saveFieldValues,
  submitResume,
  setFieldValue,
  resetError,
  updateResume,
  setFieldDefinitions,
  setResumeId
} from '@/store/modules/resume';
import './index.scss';

const { Title, Text } = Typography;

const Publish = () => {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [photoFile, setPhotoFile] = useState(null);
  const [photoBase64, setPhotoBase64] = useState('');
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isPhotoCompressing, setIsPhotoCompressing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [techStackItems, setTechStackItems] = useState(['']);
  const [departments, setDepartments] = useState({
    first: '',
    second: ''
  });

  const { 
    cycleId, 
    fieldDefinitions,
    resume, 
    fieldValues, 
    loading, 
    submitting, 
    updating,
    error 
  } = useSelector((state) => state.resume);

  // 配置常量
  const DEPARTMENT_OPTIONS = [
    { value: '技术部', label: '技术部' },
    { value: '媒体部', label: '媒体部' },
    { value: '项目部', label: '项目部' },
    { value: '综合部', label: '综合部' }
  ];

  const GRADE_OPTIONS = [
    { value: '大一', label: '大一' },
    { value: '大二', label: '大二' },
    { value: '大三', label: '大三' },
    { value: '大四', label: '大四' },
    { value: '研究生', label: '研究生' }
  ];

  const GENDER_OPTIONS = [
    { value: '男', label: '男' },
    { value: '女', label: '女' }
  ];

  const INTERVIEW_TIME_OPTIONS = [
    { value: '工作日下午', label: '工作日下午' },
    { value: '工作日晚上', label: '工作日晚上' },
    { value: '周末上午', label: '周末上午' },
    { value: '周末下午', label: '周末下午' },
    { value: '任何时间', label: '任何时间都可以' }
  ];

  const TIPS_CONTENT = [
    "请确保所有信息真实有效，我们将对信息进行核实",
    "照片请使用近期正面免冠证件照，背景简洁",
    "技术能力部分请详细填写您掌握的技术栈和项目经验",
    "自我介绍部分请突出您的个人特点和优势",
    "第一志愿为必填项，第二志愿为选填项",
    "提交前请仔细检查所有信息，提交后将无法修改"
  ];

  // 检查简历状态
  const isSubmitted = useMemo(() => {
    return resume && resume.status !== undefined && resume.status !== 1;
  }, [resume]);

  // 字段映射
  const fieldIdMapping = useMemo(() => {
    const mapping = {};
    if (fieldDefinitions && fieldDefinitions.data && fieldDefinitions.data.length > 0) {
      fieldDefinitions.data.forEach(field => {
        mapping[field.fieldKey] = field.fieldId;
      });
      return mapping;
    }
    
    return {
      'student_id': 16,
      'name': 4,
      'major': 5,
      'email': 6,
      'phone': 7,
      'grade': 8,
      'gender': 9,
      'expected_departments': 10,
      'self_introduction': 11,
      'tech_stack': 12,
      'project_experience': 13,
      'expected_interview_time': 14,
      'personal_photo': 15,
      'reason': 18,
      'github': 19
    };
  }, [fieldDefinitions]);

  useEffect(() => {
    const initData = async () => {
      try {
        // 获取字段定义
        const fieldsResult = await dispatch(fetchResumeFields(cycleId)).unwrap();
        dispatch(setFieldDefinitions(fieldsResult));
        
        // 获取或创建简历
        const resumeResult = await dispatch(fetchOrCreateResume(cycleId)).unwrap();
        
        if (resumeResult.data) {
          const resumeData = resumeResult.data;
          const resumeId = resumeData.resumeId || resumeData.resume_id || resumeData.id;
          
          // 设置简历ID
          if (resumeId) {
            dispatch(setResumeId(resumeId));
          }
          
          // 设置照片
          const photoField = resumeData.simpleFields?.find(f => f.fieldId === fieldIdMapping['personal_photo']);
          
          if (photoField && photoField.fieldValue) {
            
            setPhotoBase64(photoField.fieldValue);
          }
          
          // 设置技术栈
          const techStackField = resumeData.simpleFields?.find(f => f.fieldId === fieldIdMapping['tech_stack']);
          if (techStackField && techStackField.fieldValue) {
            try {
              const techStack = JSON.parse(techStackField.fieldValue);
              if (Array.isArray(techStack) && techStack.length > 0) {
                setTechStackItems(techStack);
              }
            } catch (e) {
              console.error('解析技术栈失败', e);
            }
          }
          
          // 设置部门志愿
          const departmentsField = resumeData.simpleFields?.find(f => f.fieldId === fieldIdMapping['expected_departments']);
          if (departmentsField && departmentsField.fieldValue) {
            try {
              const deptArray = JSON.parse(departmentsField.fieldValue);
              if (Array.isArray(deptArray) && deptArray.length > 0) {
                setDepartments({
                  first: deptArray[0] || '',
                  second: deptArray[1] || ''
                });
              }
            } catch (e) {
              console.error('解析部门志愿失败', e);
            }
          }
          
          // 根据简历状态设置编辑模式
          if (resumeData.status && resumeData.status !== 1) {
            setIsEditing(false); // 已提交，不可编辑
          } else {
            setIsEditing(true); // 草稿，可编辑
          }
        }
        
      } catch (error) {
        console.error('初始化数据失败:', error);
        message.error('加载简历信息失败: ' + (error.message || error));
      }
    };
    
    initData();
  }, [dispatch, cycleId, fieldIdMapping]);

  useEffect(() => {
    if (error) {
      message.error(error);
      dispatch(resetError());
    }
  }, [error, dispatch]);

  const handleFieldChange = (fieldKey, value) => {
    const fieldId = fieldIdMapping[fieldKey];
    if (fieldId) {
      dispatch(setFieldValue({ fieldId, value }));
    }
  };

  const getFieldValue = (fieldKey) => {
    const fieldId = fieldIdMapping[fieldKey];
    if (!fieldId) return '';
    
    const fieldValue = fieldValues.find(fv => fv.fieldId === fieldId);
    return fieldValue ? fieldValue.fieldValue : '';
  };

  const handleDepartmentChange = (type, value) => {
    const newDepartments = { ...departments, [type]: value };
    setDepartments(newDepartments);
    
    const deptArray = [];
    if (newDepartments.first) deptArray.push(newDepartments.first);
    if (newDepartments.second) deptArray.push(newDepartments.second);
    
    handleFieldChange('expected_departments', JSON.stringify(deptArray));
  };

  const handleTechStackChange = (index, value) => {
    const newTechStackItems = [...techStackItems];
    newTechStackItems[index] = value;
    setTechStackItems(newTechStackItems);
    
    const filteredItems = newTechStackItems.filter(item => item.trim() !== '');
    handleFieldChange('tech_stack', JSON.stringify(filteredItems));
  };

  const addTechStackItem = () => {
    setTechStackItems([...techStackItems, '']);
  };

  const removeTechStackItem = (index) => {
    if (techStackItems.length <= 1) return;
    
    const newTechStackItems = [...techStackItems];
    newTechStackItems.splice(index, 1);
    setTechStackItems(newTechStackItems);
    
    const filteredItems = newTechStackItems.filter(item => item.trim() !== '');
    handleFieldChange('tech_stack', JSON.stringify(filteredItems));
  };

  const handlePhotoUpload = async (file) => {
    setIsPhotoCompressing(true);
    try {
      if (file.size > 2 * 1024 * 1024) {
        message.error('照片大小不能超过2MB');
        return false;
      }

      if (!file.type.startsWith('image/')) {
        message.error('请上传图片文件');
        return false;
      }

      const compressedBase64 = await compressImage(file);
      
      setPhotoBase64(compressedBase64);
      setPhotoFile(file);
      
      handleFieldChange('personal_photo', compressedBase64);
      message.success('照片上传成功');
      
      return true;
    } catch (error) {
      message.error('照片处理失败');
      return false;
    } finally {
      setIsPhotoCompressing(false);
    }
  };

  const handleSubmit = async () => {
    try {
      // 检查必要的字段是否填写完整
      const requiredFields = ['student_id', 'name', 'major', 'email', 'phone', 'grade', 'gender'];
      const missingFields = requiredFields.filter(field => {
        const value = getFieldValue(field);
        return !value || value.trim() === '';
      });

      if (missingFields.length > 0) {
        message.error(`请完善以下信息: ${missingFields.join(', ')}`);
        return;
      }

      let currentResumeId = resume?.resume_id || resume?.id;

      if (!currentResumeId) {
        message.error('简历ID不存在，请刷新页面重试');
        return;
      }

      const fieldValuesToSave = fieldValues.map(item => ({
        fieldId: item.fieldId,
        fieldValue: item.fieldValue,
        valueId: item.valueId
      }));

      // 先保存字段值
      try {
        await dispatch(saveFieldValues({ 
          cycleId, 
          fieldValues: fieldValuesToSave,
          resumeId: currentResumeId
        })).unwrap();
      } catch (saveError) {
        console.error('保存字段值错误:', saveError);
        message.error('保存字段值失败: ' + (saveError.message || saveError));
        return;
      }

      if (isSubmitted) {
        // 更新已提交的简历
        try {
          await dispatch(updateResume({ 
            cycleId, 
            fieldValues: fieldValuesToSave,
            resumeId: currentResumeId
          })).unwrap();
          message.success('简历更新成功！');
          setIsEditing(false);
        } catch (updateError) {
          console.error('更新简历错误:', updateError);
          message.error('更新简历失败: ' + (updateError.message || updateError));
        }
      } else {
        // 提交新简历
        try {
          await dispatch(submitResume({ 
            cycleId, 
            resumeId: currentResumeId 
          })).unwrap();
          message.success('简历提交成功！');
          setIsEditing(false);
        } catch (submitError) {
          console.error('提交简历错误:', submitError);
          if (submitError.includes('已经提交过简历')) {
            message.warning(submitError);
            await dispatch(fetchOrCreateResume(cycleId));
            setIsEditing(false);
          } else {
            message.error('提交失败: ' + (submitError.message || submitError));
          }
        }
      }
      
      setShowSubmitConfirm(false);
      
      // 刷新数据
      try {
        await dispatch(fetchOrCreateResume(cycleId));
      } catch (refreshError) {
        console.error('刷新数据错误:', refreshError);
      }
      
    } catch (error) {
      console.error('提交错误:', error);
      message.error('操作失败，请检查网络连接或联系管理员: ' + (error.message || error));
    }
  };

  const isEditable = useMemo(() => {
    return !isSubmitted || isEditing;
  }, [isSubmitted, isEditing]);

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
      {loading && !resume ? (
        <div className="publish-loading">
          <Spin size="large" />
          <Text>加载简历信息中...</Text>
        </div>
      ) : isSubmitted && !isEditing ? (
        // 已提交状态 - 显示简历查看界面
        <div>
          <div className="questionnaire-header">
            <Title level={2} style={{ textAlign: 'center', marginBottom: 8 }}>
              博远信息技术社招新申请表
            </Title>
            
            {isSubmitted && !isEditing && (
              <Alert
                message="简历已提交"
                description={`您的简历已于 ${resume?.submittedAt ? new Date(resume.submittedAt).toLocaleString() : '未知时间'} 提交，状态：${
                  resume?.status === 2 ? '已提交' : 
                  resume?.status === 3 ? '评审中' : 
                  resume?.status === 4 ? '通过' : 
                  resume?.status === 5 ? '未通过' : '草稿'
                }。提交后无法修改，如需修改请联系管理员`}
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}
          </div>
          <ResumeDisplay
            fieldValues={fieldValues}
            fieldIdMapping={fieldIdMapping}
            photoBase64={fieldIdMapping['personal_photo'] ? getFieldValue('personal_photo') : ''}
            departments={fieldIdMapping['expected_departments'] ? JSON.parse(getFieldValue('departments') || '[]') : []}
            techStackItems={techStackItems}
          />

        </div>
      ) : (
        // 编辑状态 - 显示表单
        <div>
          <div className="questionnaire-header">
            <Title level={2} style={{ textAlign: 'center', marginBottom: 8 }}>
              博远信息技术社招新申请表
            </Title>
            <Text type="secondary" style={{ textAlign: 'center', display: 'block', marginBottom: 24 }}>
              欢迎加入博远信息技术社，请填写以下信息完成申请
            </Text>
            
            {isSubmitted && isEditing && (
              <Alert
                message="编辑模式"
                description="您正在修改已提交的简历，修改完成后请点击'更新简历'保存更改。"
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}
          </div>

          <div className="content-wrapper">
            <Card className="questionnaire-card">
              <Form form={form} layout="vertical" className="questionnaire-form">
                <Row gutter={24}>
                  <Col xs={24} lg={18}>
                    {/* 基本信息区域 */}
                    <FormSection title="基本信息" icon={<IdcardOutlined />}>
                      <Row gutter={16}>
                        <Col xs={24} md={12}>
                          <TextInputField
                            label="学号"
                            name="student_id"
                            placeholder="请输入您的学号"
                            value={getFieldValue('student_id')}
                            onChange={(e) => handleFieldChange('student_id', e.target.value)}
                            disabled={!isEditable}
                            required
                          />
                        </Col>
                        <Col xs={24} md={12}>
                          <TextInputField
                            label="姓名"
                            name="name"
                            placeholder="请输入您的姓名"
                            value={getFieldValue('name')}
                            onChange={(e) => handleFieldChange('name', e.target.value)}
                            disabled={!isEditable}
                            required
                          />
                        </Col>
                      </Row>

                      <Row gutter={16}>
                        <Col xs={24} md={12}>
                          <RadioGroupField
                            label="性别"
                            name="gender"
                            value={getFieldValue('gender')}
                            onChange={(e) => handleFieldChange('gender', e.target.value)}
                            options={GENDER_OPTIONS}
                            disabled={!isEditable}
                            required
                          />
                        </Col>
                        <Col xs={24} md={12}>
                          <TextInputField
                            label="专业"
                            name="major"
                            placeholder="请输入您的专业"
                            value={getFieldValue('major')}
                            onChange={(e) => handleFieldChange('major', e.target.value)}
                            disabled={!isEditable}
                            required
                          />
                        </Col>
                      </Row>

                      <Row gutter={16}>
                        <Col xs={24} md={12}>
                          <SelectField
                            label="年级"
                            name="grade"
                            placeholder="请选择年级"
                            value={getFieldValue('grade')}
                            onChange={(value) => handleFieldChange('grade', value)}
                            options={GRADE_OPTIONS}
                            disabled={!isEditable}
                            required
                            className="black-text-select"
                          />
                        </Col>
                        <Col xs={24} md={12}>
                          <TextInputField
                            label="邮箱"
                            name="email"
                            placeholder="请输入您的邮箱"
                            value={getFieldValue('email')}
                            onChange={(e) => handleFieldChange('email', e.target.value)}
                            disabled={!isEditable}
                            required
                          />
                        </Col>
                      </Row>

                      <Row gutter={16}>
                        <Col xs={24} md={12}>
                          <TextInputField
                            label="手机号"
                            name="phone"
                            placeholder="请输入您的手机号"
                            value={getFieldValue('phone')}
                            onChange={(e) => handleFieldChange('phone', e.target.value)}
                            disabled={!isEditable}
                            required
                          />
                        </Col>
                        <Col xs={24} md={12}>
                          <TextInputField
                            label="GitHub地址"
                            name="github"
                            placeholder="请输入您的GitHub地址（选填）"
                            value={getFieldValue('github')}
                            onChange={(e) => handleFieldChange('github', e.target.value)}
                            disabled={!isEditable}
                          />
                        </Col>
                      </Row>
                    </FormSection>

                    {/* 志愿选择区域 */}
                    <FormSection title="志愿选择" icon={<TeamOutlined />}>
                      <SelectField
                        label="第一志愿"
                        name="first_department"
                        placeholder="请选择您想加入的第一志愿部门"
                        value={departments.first}
                        onChange={(value) => handleDepartmentChange('first', value)}
                        options={DEPARTMENT_OPTIONS}
                        disabled={!isEditable}
                        required
                      />

                      <SelectField
                        label="第二志愿"
                        name="second_department"
                        placeholder="请选择您想加入的第二志愿部门（选填）"
                        value={departments.second}
                        onChange={(value) => handleDepartmentChange('second', value)}
                        options={DEPARTMENT_OPTIONS}
                        disabled={!isEditable}
                      />

                      <SelectField
                        label="期望的面试时间"
                        name="expected_interview_time"
                        placeholder="请选择您方便的面试时间段（选填）"
                        value={getFieldValue('expected_interview_time')}
                        onChange={(value) => handleFieldChange('expected_interview_time', value)}
                        options={INTERVIEW_TIME_OPTIONS}
                        disabled={!isEditable}
                      />
                    </FormSection>

                    {/* 技术能力区域 */}
                    <FormSection title="技术能力" icon={<CodeOutlined />}>
                      <Form.Item label="技术栈" name="tech_stack">
                        <TechStackInput
                          items={techStackItems}
                          onChange={handleTechStackChange}
                          onAdd={addTechStackItem}
                          onRemove={removeTechStackItem}
                          disabled={!isEditable}
                          placeholder="请输入技术栈"
                        />
                      </Form.Item>

                      <TextAreaField
                        label="项目经验"
                        name="project_experience"
                        placeholder="请描述您参与过的项目，包括项目角色、使用的技术、取得的成果等..."
                        value={getFieldValue('project_experience')}
                        onChange={(e) => handleFieldChange('project_experience', e.target.value)}
                        disabled={!isEditable}
                        rows={4}
                      />
                    </FormSection>

                    {/* 自我介绍区域 */}
                    <FormSection title="自我介绍" icon={<CommentOutlined />}>
                      <TextAreaField
                        label="自我介绍"
                        name="self_introduction"
                        placeholder="请介绍一下您的个人特点、兴趣爱好、技能特长等..."
                        value={getFieldValue('self_introduction')}
                        onChange={(e) => handleFieldChange('self_introduction', e.target.value)}
                        disabled={!isEditable}
                        rows={4}
                      />

                      <TextAreaField
                        label="加入理由"
                        name="reason"
                        placeholder="为什么想加入我们社团？您期望获得什么？..."
                        value={getFieldValue('reason')}
                        onChange={(e) => handleFieldChange('reason', e.target.value)}
                        disabled={!isEditable}
                        rows={4}
                      />
                    </FormSection>

                    {/* 提交按钮 */}
                    <div className="form-actions">
                      <Space>
                        <Button 
                          type="primary" 
                          icon={isSubmitted ? <EditOutlined /> : <SendOutlined />} 
                          loading={submitting || updating} 
                          onClick={() => setShowSubmitConfirm(true)} 
                          size="large"
                        >
                          {isSubmitted ? '更新简历' : '提交申请'}
                        </Button>
                        
                        {isEditing && isSubmitted && (
                          <Button 
                            icon={<EditOutlined />} 
                            onClick={() => setIsEditing(false)} 
                            size="large"
                          >
                            取消修改
                          </Button>
                        )}
                      </Space>
                    </div>
                  </Col>
                  
                  <Col xs={24} lg={6}>
                    <div className="photo-section" style={{ position: 'static' }}>
                      <PhotoUpload
                        photoBase64={photoBase64}
                        onUpload={handlePhotoUpload}
                        isCompressing={isPhotoCompressing}
                        disabled={!isEditable}
                        label="个人照片"
                      />
                    </div>
                    
                    <div className="tips-section" style={{ position: 'sticky', top: '24px' }}>
                      <TipsCard
                        tips={TIPS_CONTENT}
                        showTips={showTips}
                        onToggleTips={() => setShowTips(!showTips)}
                      />
                    </div>
                  </Col>
                </Row>
              </Form>
            </Card>
          </div>
        </div>
      )}

      {/* 提交确认弹窗 */}
      <Modal
        title={isSubmitted ? "确认更新简历" : "确认提交申请"}
        open={showSubmitConfirm}
        onOk={handleSubmit}
        onCancel={() => setShowSubmitConfirm(false)}
        okText={isSubmitted ? "确认更新" : "确认提交"}
        cancelText="取消"
        confirmLoading={submitting || updating}
        className="submit-confirm-modal"
      >
        <div className="modal-content">
          <p className="modal-text">
            {isSubmitted ? "您确定要更新已提交的简历吗？" : "您确定要提交申请吗？提交后将无法修改。"}
          </p>
          {!isSubmitted && (
            <p className="modal-warning">
              请确保所有信息填写正确，提交后将无法修改。
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Publish;