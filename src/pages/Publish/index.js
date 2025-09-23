// pages/Publish/index.js
import React, { useState, useEffect, useMemo } from "react";
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
  Modal,
  Collapse,
} from "antd";
import {
  SendOutlined,
  EditOutlined,
  IdcardOutlined,
  CodeOutlined,
  CommentOutlined,
  TeamOutlined,
  QuestionCircleOutlined,
  CaretDownOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";

// 导入封装的组件
import { compressImage } from "@/utils/imageCompress";
import TextInputField from "./components/TextInputField";
import SelectField from "./components/SelectField";
import TextAreaField from "./components/TextAreaField";
import RadioGroupField from "./components/RadioGroupField";
import TechStackInput from "./components/TechStackInput";
import PhotoUpload from "./components/PhotoUpload";
import FormSection from "./components/FormSection";
import ResumeDisplay from "@/components/ResumeDisplay";

import {
  fetchResumeFields,
  fetchOrCreateResume,
  saveFieldValues,
  submitResume,
  setFieldValue,
  resetError,
  updateResume,
  setFieldDefinitions,
  setResumeId,
  fetchFieldValues,
  clearFieldValues,
} from "@/store/modules/resume";
import "./index.scss";

const { Title, Text } = Typography;
const { Panel } = Collapse;

const Publish = () => {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [photoFile, setPhotoFile] = useState(null);
  const [photoBase64, setPhotoBase64] = useState("");
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isPhotoCompressing, setIsPhotoCompressing] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [techStackItems, setTechStackItems] = useState([""]);
  const [departments, setDepartments] = useState({
    first: "",
    second: "",
  });
  const [interviewTimes, setInterviewTimes] = useState({
    first: "",
    second: "",
    canAttend: "yes",
    customTime: "",
  });

  // 修改：添加初始化状态，默认为 true（显示加载）
  const [isInitializing, setIsInitializing] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const {
    cycleId,
    fieldDefinitions,
    resume,
    fieldValues,
    loading,
    submitting,
    updating,
    error,
  } = useSelector((state) => state.resume);

  // 配置常量
  const FIRST_DEPARTMENT_OPTIONS = [
    { value: "技术部", label: "技术部" },
    { value: "媒体部", label: "媒体部" },
    { value: "项目部", label: "项目部" },
    { value: "综合部", label: "综合部" },
  ];

  const SECOND_DEPARTMENT_OPTIONS = [
    { value: "无", label: "无" },
    { value: "技术部", label: "技术部" },
    { value: "媒体部", label: "媒体部" },
    { value: "项目部", label: "项目部" },
    { value: "综合部", label: "综合部" },
  ];

  const GRADE_OPTIONS = [
    { value: "大一", label: "大一" },
    { value: "大二", label: "大二" },
    { value: "大三", label: "大三" },
    { value: "大四", label: "大四" },
    { value: "研究生", label: "研究生" },
  ];

  const GENDER_OPTIONS = [
    { value: "男", label: "男" },
    { value: "女", label: "女" },
  ];

  // 第一面试时间选项（不包含"无"）
  const FIRST_INTERVIEW_TIME_OPTIONS = [
    { value: "Day 1 上午", label: "Day 1 上午" },
    { value: "Day 1 下午", label: "Day 1 下午" },
    { value: "Day 1 晚上", label: "Day 1 晚上" },
  ];

  // 第二面试时间选项（包含"无"")
  const SECOND_INTERVIEW_TIME_OPTIONS = [
    { value: "无", label: "无" }, // 无选项放在最前面
    { value: "Day 1 上午", label: "Day 1 上午" },
    { value: "Day 1 下午", label: "Day 1 下午" },
    { value: "Day 1 晚上", label: "Day 1 晚上" },
  ];

  const CAN_ATTEND_OPTIONS = [
    { value: "yes", label: "能参加" },
    { value: "no", label: "不能参加" },
  ];

  const TIPS_CONTENT = [
    {
      title: "隐私保护",
      content:
        "本报名表所提供的所有信息将严格保密，我们承诺对您的个人信息采取必要的保护措施，确保其安全性。所有带红色星号的字段为必填项，其它为选填项。",
    },
    {
      title: "邮箱",
      content: "可填写华东师范大学学生邮箱或其它常用邮箱",
    },
    {
      title: "照片",
      content:
        "请上传个人免冠正面照片，建议使用近期证件照，背景简洁，大小不超过5MB，以便于招新工作的审核和身份确认。",
    },
    {
      title: "GitHub主页",
      content: "有GitHub账号的同学可以填写，没有则可以不填",
    },
    {
      title: "个人简介",
      content:
        "请提供详细的个人介绍，可包括但不限于个人特长、兴趣爱好、学习或个人经历，以及对社团的期望和建议等内容。全面的自我介绍有利于面试官快速了解您。",
    },
    {
      title: "意愿加入部门",
      content:
        "本社团设有综合部、项目部、技术部和媒体部四个部门。请选择1至2个意愿加入的部门，最终录取将安排到其中一个部门。",
    },
    {
      title: "面试时间",
      content:
        "请选择您方便的面试时间段，Day 1为9月27日（9月28日因调休暂不设为面试）。如无法参加指定时间的面试，请联系管理员进行沟通参与线上面试。",
    },
    {
      title: "技术栈",
      content:
        "请填写您熟悉的技术栈，如Java、Python、C、C++、Go、MySQL、Spring Boot、Vue等编程语言、技术框架或掌握的算法",
    },
    {
      title: "项目经验",
      content: "有计算机相关项目经历者可详细填写，若没有可简要说明或不填",
    },
  ];

  // 检查简历状态
  const isSubmitted = useMemo(() => {
    return resume && resume.status !== undefined && resume.status !== 1;
  }, [resume]);

  // 是否可以编辑
  const canEdit = useMemo(() => {
    return resume?.status === 1 || resume?.status === 2;
  }, [resume]);

  // 字段映射
  const fieldIdMapping = useMemo(() => {
    const mapping = {};
    if (
      fieldDefinitions &&
      fieldDefinitions.data &&
      fieldDefinitions.data.length > 0
    ) {
      fieldDefinitions.data.forEach((field) => {
        mapping[field.fieldKey] = field.fieldId;
      });
      return mapping;
    }

    return {
      student_id: 16,
      name: 4,
      major: 5,
      email: 6,
      phone: 7,
      grade: 8,
      gender: 9,
      expected_departments: 10,
      self_introduction: 11,
      tech_stack: 12,
      project_experience: 13,
      expected_interview_time: 14,
      personal_photo: 15,
      reason: 18,
      github: 19,
    };
  }, [fieldDefinitions]);

  // 初始化数据
  const initData = async () => {
    try {
      setIsInitializing(true);
      
      // 1. 获取字段定义
      const fieldsResult = await dispatch(fetchResumeFields(cycleId)).unwrap();
      dispatch(setFieldDefinitions(fieldsResult));

      // 2. 获取或创建简历
      const resumeResult = await dispatch(
        fetchOrCreateResume(cycleId)
      ).unwrap();
      const resumeData = resumeResult.data || resumeResult;

      if (resumeData) {
        // 3. 设置简历ID
        const resumeId =
          resumeData.resumeId || resumeData.resume_id || resumeData.id;
        if (resumeId) {
          dispatch(setResumeId(resumeId));
        }

        // 4. 获取字段值
        await dispatch(fetchFieldValues(cycleId)).unwrap();

        // 5. 初始化照片
        const photoField = resumeData.simpleFields?.find(
          (f) => f.fieldId === (fieldIdMapping["personal_photo"] || 15)
        );
        if (photoField?.fieldValue) {
          setPhotoBase64(photoField.fieldValue);
        }

        // 6. 初始化技术栈
        const techStackField = resumeData.simpleFields?.find(
          (f) => f.fieldId === (fieldIdMapping["tech_stack"] || 12)
        );
        if (techStackField?.fieldValue) {
          try {
            const techStack = JSON.parse(techStackField.fieldValue);
            setTechStackItems(Array.isArray(techStack) ? techStack : [""]);
          } catch (e) {
            console.error("解析技术栈失败", e);
            setTechStackItems([""]);
          }
        } else {
          setTechStackItems([""]);
        }

        // 7. 初始化部门志愿
        const departmentsField = resumeData.simpleFields?.find(
          (f) => f.fieldId === (fieldIdMapping["expected_departments"] || 10)
        );
        if (departmentsField?.fieldValue) {
          try {
            const deptArray = JSON.parse(departmentsField.fieldValue);
            setDepartments({
              first: deptArray[0] || "",
              second: deptArray[1] || "",
            });
          } catch (e) {
            console.error("解析部门志愿失败", e);
            setDepartments({ first: "", second: "" });
          }
        } else {
          setDepartments({ first: "", second: "" });
        }

        // 8. 初始化面试时间
        const interviewTimeField = fieldValues.find(
          (f) => f.fieldId === (fieldIdMapping["expected_interview_time"] || 14)
        );
        if (interviewTimeField?.fieldValue) {
          try {
            const timesData = JSON.parse(interviewTimeField.fieldValue);
            setInterviewTimes({
              first: timesData.first || "",
              second: timesData.second || "",
              canAttend: timesData.canAttend || "yes",
              customTime: timesData.customTime || "",
            });
          } catch (e) {
            console.error("解析面试时间失败", e);
            setInterviewTimes({
              first: "",
              second: "",
              canAttend: "yes",
              customTime: "",
            });
          }
        } else {
          setInterviewTimes({
            first: "",
            second: "",
            canAttend: "yes",
            customTime: "",
          });
        }

        // 9. 设置初始显示模式：已提交的简历显示查看页面，草稿显示编辑页面
        if (resumeData.status === 1) {
          setIsEditing(true); // 草稿状态显示编辑页面
        } else {
          setIsEditing(false); // 已提交状态显示查看页面
        }
      }
    } catch (error) {
      console.error("初始化数据失败:", error);
      message.error("加载简历信息失败: " + (error.message || error));

      // 初始化默认值
      setTechStackItems([""]);
      setDepartments({ first: "", second: "" });
      setPhotoBase64("");
      // 默认显示编辑模式
      setIsEditing(true);
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    initData();

    return () => {
      // 清理函数
    };
  }, [dispatch, cycleId]);

  // 错误处理 useEffect
  useEffect(() => {
    if (error) {
      message.error(error);
      dispatch(resetError());
    }
  }, [error, dispatch]);

  // 当字段值变化时更新表单
  useEffect(() => {
    if (fieldValues.length > 0 && isEditing) {
      // 设置表单字段值
      const formValues = {};
      Object.keys(fieldIdMapping).forEach((key) => {
        const fieldValue = getFieldValue(key);
        if (fieldValue !== undefined && fieldValue !== null) {
          formValues[key] = fieldValue;
        }
      });

      // 设置表单值
      form.setFieldsValue(formValues);

      // 设置特殊字段
      if (formValues.gender) {
        form.setFieldsValue({ gender: formValues.gender });
      }
    }
  }, [fieldValues, isEditing, fieldIdMapping]);

  const handleFieldChange = (fieldKey, value) => {
    const fieldId = fieldIdMapping[fieldKey];
    if (fieldId) {
      dispatch(setFieldValue({ fieldId, value }));
    }
  };

  const getFieldValue = (fieldKey) => {
    const fieldId = fieldIdMapping[fieldKey];
    if (!fieldId) return "";

    const fieldValue = fieldValues.find((fv) => fv.fieldId === fieldId);
    return fieldValue ? fieldValue.fieldValue : "";
  };

  const handleDepartmentChange = (type, value) => {
    const newDepartments = { ...departments, [type]: value };
    setDepartments(newDepartments);

    const deptArray = [];
    if (newDepartments.first && newDepartments.first !== "无")
      deptArray.push(newDepartments.first);
    if (newDepartments.second && newDepartments.second !== "无")
      deptArray.push(newDepartments.second);

    handleFieldChange("expected_departments", JSON.stringify(deptArray));
  };

  const handleInterviewTimeChange = (type, value) => {
    const newInterviewTimes = { ...interviewTimes, [type]: value };
    setInterviewTimes(newInterviewTimes);

    // 如果不能参加线下面试，则将面试时间设为空
    const timesData = {
      first:
        newInterviewTimes.canAttend === "yes" &&
        newInterviewTimes.first !== "无"
          ? newInterviewTimes.first
          : "",
      second:
        newInterviewTimes.canAttend === "yes" &&
        newInterviewTimes.second !== "无"
          ? newInterviewTimes.second
          : "",
      canAttend: newInterviewTimes.canAttend,
      customTime: newInterviewTimes.customTime,
    };

    handleFieldChange("expected_interview_time", JSON.stringify(timesData));
  };

  // 计算第二志愿的禁用选项
const getDisabledSecondDepartments = () => {
  if (!departments.first || departments.first === "无") {
    return [];
  }
  return [departments.first]; // 禁用第一志愿选择的部门
};

// 计算第二面试时间的禁用选项
const getDisabledSecondInterviewTimes = () => {
  if (!interviewTimes.first || interviewTimes.first === "无") {
    return [];
  }
  return [interviewTimes.first]; // 禁用第一面试时间选择的时间
};

  const handleTechStackChange = (index, value) => {
    const newTechStackItems = [...techStackItems];
    newTechStackItems[index] = value;
    setTechStackItems(newTechStackItems);

    const filteredItems = newTechStackItems.filter(
      (item) => item.trim() !== ""
    );
    handleFieldChange("tech_stack", JSON.stringify(filteredItems));
  };

  const addTechStackItem = () => {
    setTechStackItems([...techStackItems, ""]);
  };

  const removeTechStackItem = (index) => {
    if (techStackItems.length <= 1) return;

    const newTechStackItems = [...techStackItems];
    newTechStackItems.splice(index, 1);
    setTechStackItems(newTechStackItems);

    const filteredItems = newTechStackItems.filter(
      (item) => item.trim() !== ""
    );
    handleFieldChange("tech_stack", JSON.stringify(filteredItems));
  };

  const handlePhotoUpload = async (file) => {
    setIsPhotoCompressing(true);
    try {
      if (file.size > 5 * 1024 * 1024) {
        message.error("照片大小不能超过5MB");
        return false;
      }

      if (!file.type.startsWith("image/")) {
        message.error("请上传图片文件");
        return false;
      }

      const compressedBase64 = await compressImage(file);

      setPhotoBase64(compressedBase64);
      setPhotoFile(file);

      handleFieldChange("personal_photo", compressedBase64);
      message.success("照片上传成功");

      return true;
    } catch (error) {
      message.error("照片处理失败");
      return false;
    } finally {
      setIsPhotoCompressing(false);
    }
  };

  const handleUpdateResume = async () => {
    try {
      await form.validateFields();

      const deptArray = [];
      if (departments.first && departments.first !== "无")
        deptArray.push(departments.first);
      if (departments.second && departments.second !== "无")
        deptArray.push(departments.second);

      const filteredTechItems = techStackItems.filter(
        (item) => item && item.trim()
      );

      if (deptArray.length > 0) {
        handleFieldChange("expected_departments", JSON.stringify(deptArray));
      }

      if (filteredTechItems.length > 0) {
        handleFieldChange("tech_stack", JSON.stringify(filteredTechItems));
      }

      const currentResumeId = resume?.resume_id || resume?.id;
      if (!currentResumeId) {
        message.error("简历ID不存在，请刷新页面重试");
        return;
      }

      const fieldValuesToUpdate = [];

      const fieldsToUpdate = [
        "name",
        "student_id",
        "gender",
        "major",
        "email",
        "phone",
        "grade",
        "expected_departments",
        "self_introduction",
        "tech_stack",
        "project_experience",
        "expected_interview_time",
        "personal_photo",
        "reason",
        "github",
      ];

      fieldsToUpdate.forEach((fieldKey) => {
        const fieldId = fieldIdMapping[fieldKey];
        if (fieldId) {
          const existingValue = fieldValues.find(
            (fv) => fv.fieldId === fieldId
          );
          if (existingValue) {
            fieldValuesToUpdate.push({
              fieldId: fieldId,
              fieldValue: existingValue.fieldValue,
              valueId: existingValue.valueId,
              resumeId: currentResumeId,
            });
          }
        }
      });

      console.log("更新简历字段值:", fieldValuesToUpdate);

      await dispatch(
        updateResume({
          cycleId,
          fieldValues: fieldValuesToUpdate,
          resumeId: currentResumeId,
        })
      ).unwrap();

      message.success("简历更新成功！");
      setShowSubmitConfirm(false);

      // 刷新数据并切换到查看模式
      await dispatch(fetchOrCreateResume(cycleId));
      setIsEditing(false); // 切换到查看模式
    } catch (error) {
      console.error("更新简历错误:", error);
      if (error.errorFields && error.errorFields.length > 0) {
        message.error("请完善必填信息");
      } else {
        message.error(`更新失败: ${error.message || error}`);
      }
    }
  };

  const handleSubmit = async () => {
    try {
      await form.validateFields();

      const deptArray = [];
      if (departments.first && departments.first !== "无")
        deptArray.push(departments.first);
      if (departments.second && departments.second !== "无")
        deptArray.push(departments.second);

      const filteredTechItems = techStackItems.filter(
        (item) => item && item.trim()
      );

      if (deptArray.length > 0) {
        handleFieldChange("expected_departments", JSON.stringify(deptArray));
      }

      if (filteredTechItems.length > 0) {
        handleFieldChange("tech_stack", JSON.stringify(filteredTechItems));
      }

      const currentResumeId = resume?.resume_id || resume?.id;
      if (!currentResumeId) {
        message.error("简历ID不存在，请刷新页面重试");
        return;
      }

      const fieldValuesToSave = [];

      const fieldsToSave = [
        "name",
        "student_id",
        "gender",
        "major",
        "email",
        "phone",
        "grade",
        "expected_departments",
        "self_introduction",
        "tech_stack",
        "project_experience",
        "expected_interview_time",
        "personal_photo",
        "reason",
        "github",
      ];

      fieldsToSave.forEach((fieldKey) => {
        const fieldId = fieldIdMapping[fieldKey];
        if (fieldId) {
          const existingValue = fieldValues.find(
            (fv) => fv.fieldId === fieldId
          );
          if (
            existingValue &&
            existingValue.fieldValue !== null &&
            existingValue.fieldValue !== undefined
          ) {
            fieldValuesToSave.push({
              fieldId: fieldId,
              fieldValue: existingValue.fieldValue,
              valueId: existingValue.valueId,
              resumeId: currentResumeId,
            });
          }
        }
      });

      await dispatch(
        saveFieldValues({
          cycleId,
          fieldValues: fieldValuesToSave,
          resumeId: currentResumeId,
        })
      ).unwrap();

      await dispatch(
        submitResume({
          cycleId,
          resumeId: currentResumeId,
        })
      ).unwrap();

      message.success("简历提交成功！");
      setShowSubmitConfirm(false);

      await dispatch(fetchOrCreateResume(cycleId));
      setIsEditing(false); // 提交后切换到查看模式
    } catch (error) {
      console.error("提交错误:", error);
      if (error.errorFields && error.errorFields.length > 0) {
        message.error("请完善必填信息");
      } else if (error.includes("已经提交过简历")) {
        message.warning(error);
        await dispatch(fetchOrCreateResume(cycleId));
        setIsEditing(false);
      } else {
        message.error(`操作失败: ${error.message || error}`);
      }
    }
  };

  const handleEdit = async () => {
    try {
      // 重新获取最新的简历数据
      const resumeResult = await dispatch(
        fetchOrCreateResume(cycleId)
      ).unwrap();
      const resumeData = resumeResult.data || resumeResult;

      if (resumeData) {
        // 重新获取字段值
        await dispatch(fetchFieldValues(cycleId)).unwrap();

        // 重新初始化技术栈
        const techStackField = fieldValues.find(
          (f) => f.fieldId === (fieldIdMapping["tech_stack"] || 12)
        );
        if (techStackField?.fieldValue) {
          try {
            const techStack = JSON.parse(techStackField.fieldValue);
            setTechStackItems(Array.isArray(techStack) ? techStack : [""]);
          } catch (e) {
            console.error("解析技术栈失败", e);
            setTechStackItems([""]);
          }
        } else {
          setTechStackItems([""]);
        }

        // 重新初始化部门志愿
        const departmentsField = fieldValues.find(
          (f) => f.fieldId === (fieldIdMapping["expected_departments"] || 10)
        );
        if (departmentsField?.fieldValue) {
          try {
            const deptArray = JSON.parse(departmentsField.fieldValue);
            setDepartments({
              first: deptArray[0] || "",
              second: deptArray[1] || "",
            });
          } catch (e) {
            console.error("解析部门志愿失败", e);
            setDepartments({ first: "", second: "" });
          }
        } else {
          setDepartments({ first: "", second: "" });
        }

        // 重新初始化面试时间
        const interviewTimeField = fieldValues.find(
          (f) => f.fieldId === (fieldIdMapping["expected_interview_time"] || 14)
        );
        if (interviewTimeField?.fieldValue) {
          try {
            const timesData = JSON.parse(interviewTimeField.fieldValue);
            setInterviewTimes({
              first: timesData.first || "",
              second: timesData.second || "",
              canAttend: timesData.canAttend || "yes",
              customTime: timesData.customTime || "",
            });
          } catch (e) {
            console.error("解析面试时间失败", e);
            setInterviewTimes({
              first: "",
              second: "",
              canAttend: "yes",
              customTime: "",
            });
          }
        } else {
          setInterviewTimes({
            first: "",
            second: "",
            canAttend: "yes",
            customTime: "",
          });
        }
      }

      // 切换到编辑模式
      setIsEditing(true);
    } catch (error) {
      console.error("进入编辑模式失败:", error);
      message.error("加载简历数据失败，请刷新页面重试");
    }
  };

  // 修改 useEffect，确保在编辑模式下正确设置表单值
  useEffect(() => {
    if (fieldValues.length > 0 && isEditing) {
      // 设置表单字段值
      const formValues = {};
      Object.keys(fieldIdMapping).forEach((key) => {
        const fieldValue = getFieldValue(key);
        if (fieldValue !== undefined && fieldValue !== null) {
          formValues[key] = fieldValue;
        }
      });

      // 设置表单值
      form.setFieldsValue(formValues);

      // 设置特殊字段
      if (formValues.gender) {
        form.setFieldsValue({ gender: formValues.gender });
      }

      // 设置部门志愿（需要单独处理，因为不是直接的表单字段）
      form.setFieldsValue({
        first_department: departments.first,
        second_department: departments.second,
      });

      // 设置面试时间（需要单独处理）
      form.setFieldsValue({
        first_interview_time: interviewTimes.first,
        second_interview_time: interviewTimes.second,
        can_attend_interview: interviewTimes.canAttend,
        custom_interview_time: interviewTimes.customTime,
      });
    }
  }, [fieldValues, isEditing, fieldIdMapping, departments, interviewTimes]);

  const handleCancelEdit = async () => {
    try {
      // 显示加载状态
      message.loading("正在恢复数据...", 0);

      // 清除当前字段值
      dispatch(clearFieldValues());

      // 重新获取简历数据
      const resumeResult = await dispatch(
        fetchOrCreateResume(cycleId)
      ).unwrap();
      const resumeData = resumeResult.data || resumeResult;

      if (resumeData) {
        // 重新获取字段值
        await dispatch(fetchFieldValues(cycleId)).unwrap();

        // 重置技术栈
        const techStackField = fieldValues.find(
          (f) => f.fieldId === (fieldIdMapping["tech_stack"] || 12)
        );
        if (techStackField?.fieldValue) {
          try {
            const techStack = JSON.parse(techStackField.fieldValue);
            setTechStackItems(Array.isArray(techStack) ? techStack : [""]);
          } catch (e) {
            setTechStackItems([""]);
          }
        } else {
          setTechStackItems([""]);
        }

        // 重置部门志愿
        const departmentsField = fieldValues.find(
          (f) => f.fieldId === (fieldIdMapping["expected_departments"] || 10)
        );
        if (departmentsField?.fieldValue) {
          try {
            const deptArray = JSON.parse(departmentsField.fieldValue);
            setDepartments({
              first: deptArray[0] || "",
              second: deptArray[1] || "",
            });
          } catch (e) {
            setDepartments({ first: "", second: "" });
          }
        } else {
          setDepartments({ first: "", second: "" });
        }

        // 重置面试时间
        const interviewTimeField = fieldValues.find(
          (f) => f.fieldId === (fieldIdMapping["expected_interview_time"] || 14)
        );
        if (interviewTimeField?.fieldValue) {
          try {
            const timesData = JSON.parse(interviewTimeField.fieldValue);
            setInterviewTimes({
              first: timesData.first || "",
              second: timesData.second || "",
              canAttend: timesData.canAttend || "yes",
              customTime: timesData.customTime || "",
            });
          } catch (e) {
            setInterviewTimes({
              first: "",
              second: "",
              canAttend: "yes",
              customTime: "",
            });
          }
        } else {
          setInterviewTimes({
            first: "",
            second: "",
            canAttend: "yes",
            customTime: "",
          });
        }

        // 重置照片
        const photoField = fieldValues.find(
          (f) => f.fieldId === (fieldIdMapping["personal_photo"] || 15)
        );
        if (photoField?.fieldValue) {
          setPhotoBase64(photoField.fieldValue);
        } else {
          setPhotoBase64("");
        }
      }

      // 重置表单
      form.resetFields();

      // 隐藏加载消息并显示成功消息
      message.destroy();
      message.success("已取消修改");

      // 切换到查看模式
      setIsEditing(false);
    } catch (error) {
      message.destroy();
      console.error("取消修改失败:", error);
      message.error("取消修改失败，请刷新页面");
    }
  };

  // 修改：在初始化完成前显示加载状态
  if (isInitializing) {
    return (
      <div className="publish-loading">
        <Spin size="large" />
        <Text>加载简历信息中...</Text>
      </div>
    );
  }

  return (
    <div className="publish-page">
      {!isEditing ? (
        // 查看模式 - 显示简历
        <div>
          <div className="questionnaire-header">
            <Title level={2} style={{ textAlign: "center", marginBottom: 8 }}>
              博远信息技术社招新申请表
            </Title>

            <Alert
              message="简历信息"
              description={`您的简历状态：${
                resume?.status === 2
                  ? "已提交（可修改）"
                  : resume?.status === 3
                  ? "评审中（不可修改）"
                  : resume?.status === 4
                  ? "通过（不可修改）"
                  : resume?.status === 5
                  ? "未通过（不可修改）"
                  : "草稿"
              }。${
                resume?.status === 2
                  ? "在审核开始前您可以修改简历。"
                  : "当前状态无法修改，如需修改请联系管理员。"
              }`}
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          </div>

          <ResumeDisplay
            fieldValues={fieldValues}
            fieldIdMapping={fieldIdMapping}
            photoBase64={photoBase64}
            departments={departments}
            techStackItems={techStackItems}
          />

          {/* 操作按钮 */}
          <div
            style={{
              marginTop: 24,
              textAlign: "center",
              padding: "16px",
              borderTop: "1px solid #f0f0f0",
            }}
          >
            <Space>
              {canEdit && (
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={handleEdit}
                  size="large"
                >
                  修改简历
                </Button>
              )}
            </Space>
          </div>

          {resume?.status === 3 && (
            <Alert
              message="简历正在审核中"
              description="您的简历已进入审核阶段，暂时无法修改。"
              type="warning"
              showIcon
              style={{ marginTop: 24 }}
            />
          )}

          {resume?.status === 4 && (
            <Alert
              message="简历已通过"
              description="恭喜！您的简历已通过审核，无法修改。"
              type="success"
              showIcon
              style={{ marginTop: 24 }}
            />
          )}

          {resume?.status === 5 && (
            <Alert
              message="简历未通过"
              description="很遗憾，您的简历未通过审核，无法修改。"
              type="error"
              showIcon
              style={{ marginTop: 24 }}
            />
          )}
        </div>
      ) : (
        // 编辑模式 - 显示表单
        <div>
          <div className="questionnaire-header">
            <Title level={2} style={{ textAlign: "center", marginBottom: 8 }}>
              博远信息技术社招新申请表
            </Title>
            <Text
              type="secondary"
              style={{
                textAlign: "center",
                display: "block",
                marginBottom: 24,
              }}
            >
              {isSubmitted
                ? "修改简历信息"
                : "欢迎加入博远信息技术社，请填写以下信息完成申请"}
            </Text>

            {isSubmitted && (
              <Alert
                message="编辑模式"
                description="您正在修改已提交的简历。所有修改将在点击'更新简历'后生效。"
                type="success"
                showIcon
                className="edit-mode-alert"
                style={{ marginBottom: 24 }}
              />
            )}
          </div>

          {/* 填写提示按钮 */}
          <div
            className="tips-button-container"
            style={{ marginBottom: 16, textAlign: "center" }}
          >
            <Button
              type="default"
              icon={<QuestionCircleOutlined />}
              onClick={() => setShowTips(!showTips)}
              className="tips-toggle-button"
            >
              填写提示{" "}
              {showTips ? (
                <CaretDownOutlined />
              ) : (
                <CaretDownOutlined rotate={-90} />
              )}
            </Button>
          </div>

          {/* 填写提示内容 */}
          {showTips && (
            <Card
              size="small"
              className="tips-card"
              style={{ marginBottom: 24, background: "#fafafa" }}
            >
              <div
                className="tips-header"
                style={{
                  color: "#1f3a60",
                  fontWeight: "bold",
                  marginBottom: 12,
                }}
              >
                填写注意事项
              </div>
              <div className="tips-content">
                {TIPS_CONTENT.map((tip, index) => (
                  <div
                    key={index}
                    className="tip-item"
                    style={{ marginBottom: "12px" }}
                  >
                    <strong style={{ color: "#1f3a60", display: "block" }}>
                      {tip.title}:
                    </strong>
                    <span style={{ color: "#595959", lineHeight: "1.6" }}>
                      {tip.content}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div className="content-wrapper">
            <Card className="questionnaire-card">
              <Form
                form={form}
                layout="vertical"
                className="questionnaire-form"
                validateTrigger="onSubmit"
              >
                <Row gutter={24}>
                  <Col xs={24}>
                    {/* 基本信息区域 */}
                    <FormSection title="基本信息" icon={<IdcardOutlined />}>
                      <Row gutter={24}>
                        <Col xs={24} md={16}>
                          <Row gutter={16}>
                            <Col xs={24} md={12}>
                              <TextInputField
                                label="姓名"
                                name="name"
                                placeholder="请输入您的姓名"
                                value={getFieldValue("name")}
                                onChange={(e) =>
                                  handleFieldChange("name", e.target.value)
                                }
                                disabled={!canEdit}
                                required
                                className="compact-input"
                              />
                            </Col>
                            <Col xs={24} md={12}>
                              <TextInputField
                                label="学号"
                                name="student_id"
                                placeholder="请输入您的学号"
                                value={getFieldValue("student_id")}
                                onChange={(e) =>
                                  handleFieldChange(
                                    "student_id",
                                    e.target.value
                                  )
                                }
                                disabled={!canEdit}
                                required
                                className="compact-input"
                              />
                            </Col>
                          </Row>

                          <Row gutter={16}>
                            <Col xs={24} md={12}>
                              <RadioGroupField
                                label="性别"
                                name="gender"
                                value={getFieldValue("gender")}
                                onChange={(e) =>
                                  handleFieldChange("gender", e.target.value)
                                }
                                options={GENDER_OPTIONS}
                                disabled={!canEdit}
                                required
                              />
                            </Col>
                            <Col xs={24} md={12}>
                              <SelectField
                                label="年级"
                                name="grade"
                                placeholder="请选择年级"
                                value={getFieldValue("grade")}
                                onChange={(value) =>
                                  handleFieldChange("grade", value)
                                }
                                options={GRADE_OPTIONS}
                                disabled={!canEdit}
                                required
                                className="compact-input"
                              />
                            </Col>
                          </Row>

                          <Row gutter={16}>
                            <Col xs={24} md={12}>
                              <TextInputField
                                label="专业"
                                name="major"
                                placeholder="请输入您的专业"
                                value={getFieldValue("major")}
                                onChange={(e) =>
                                  handleFieldChange("major", e.target.value)
                                }
                                disabled={!canEdit}
                                required
                                className="compact-input"
                              />
                            </Col>
                            <Col xs={24} md={12}>
                              <TextInputField
                                label="邮箱"
                                name="email"
                                placeholder="请输入您的邮箱"
                                value={getFieldValue("email")}
                                onChange={(e) =>
                                  handleFieldChange("email", e.target.value)
                                }
                                disabled={!canEdit}
                                required
                                className="compact-input"
                              />
                            </Col>
                          </Row>

                          <Row gutter={16}>
                            <Col xs={24} md={12}>
                              <TextInputField
                                label="手机号"
                                name="phone"
                                placeholder="请输入您的手机号"
                                value={getFieldValue("phone")}
                                onChange={(e) =>
                                  handleFieldChange("phone", e.target.value)
                                }
                                disabled={!canEdit}
                                required
                                className="compact-input"
                              />
                            </Col>
                            <Col xs={24} md={12}>
                              <TextInputField
                                label="GitHub主页"
                                name="github"
                                placeholder="请输入您的GitHub主页（选填）"
                                value={getFieldValue("github")}
                                onChange={(e) =>
                                  handleFieldChange("github", e.target.value)
                                }
                                disabled={!canEdit}
                                className="compact-input"
                              />
                            </Col>
                          </Row>
                        </Col>

                        <Col xs={24} md={8}>
                          <div className="photo-container">
                            <PhotoUpload
                              photoBase64={photoBase64}
                              onUpload={handlePhotoUpload}
                              isCompressing={isPhotoCompressing}
                              disabled={!canEdit}
                              required
                              label="个人照片"
                            />
                          </div>
                        </Col>
                      </Row>
                    </FormSection>

                    {/* 自我介绍区域 */}
                    <FormSection title="自我介绍" icon={<CommentOutlined />}>
                      <TextAreaField
                        label="自我介绍"
                        name="self_introduction"
                        placeholder="请介绍一下您的个人特点、兴趣爱好、技能特长等..."
                        value={getFieldValue("self_introduction")}
                        onChange={(e) =>
                          handleFieldChange("self_introduction", e.target.value)
                        }
                        disabled={!canEdit}
                        required
                        rows={4}
                      />

                      <TextAreaField
                        label="加入理由"
                        name="reason"
                        placeholder="为什么想加入我们社团？您期望获得什么？..."
                        value={getFieldValue("reason")}
                        onChange={(e) =>
                          handleFieldChange("reason", e.target.value)
                        }
                        disabled={!canEdit}
                        required
                        rows={4}
                      />
                    </FormSection>

                    {/* 志愿选择区域 */}
                    <FormSection title="志愿选择" icon={<TeamOutlined />}>
                      <SelectField
  label="第一志愿"
  name="first_department"
  placeholder="请选择您想加入的第一志愿部门"
  value={departments.first}
  onChange={(value) => {
    handleDepartmentChange("first", value);
    // 如果第一志愿和第二志愿相同，清空第二志愿
    if (value === departments.second) {
      handleDepartmentChange("second", "");
    }
  }}
  options={FIRST_DEPARTMENT_OPTIONS}
  disabled={!canEdit}
  required
  className="compact-input"
/>

{ /* 修改第二志愿部门的选择 */ }
<SelectField
  label="第二志愿"
  name="second_department"
  placeholder="请选择您想加入的第二志愿部门"
  value={departments.second}
  onChange={(value) => handleDepartmentChange("second", value)}
  options={SECOND_DEPARTMENT_OPTIONS}
  disabled={!canEdit}
  disabledOptions={getDisabledSecondDepartments()} // 添加禁用选项
  className="compact-input"
/>
                    </FormSection>

                    <FormSection title="面试时间安排" icon={<TeamOutlined />}>
                      <RadioGroupField
                        label="是否能参加线下面试"
                        name="can_attend_interview"
                        value={interviewTimes.canAttend}
                        onChange={(e) =>
                          handleInterviewTimeChange("canAttend", e.target.value)
                        }
                        options={CAN_ATTEND_OPTIONS}
                        disabled={!canEdit}
                        required
                      />

                      {interviewTimes.canAttend === "yes" ? (
                        <>
                          {/* 修改第一面试时间的选择处理 */}
<SelectField
  label="第一面试时间"
  name="first_interview_time"
  placeholder="请选择第一面试时间"
  value={interviewTimes.first}
  onChange={(value) => {
    handleInterviewTimeChange("first", value);
    // 如果第一时间和第二时间相同，清空第二时间
    if (value === interviewTimes.second) {
      handleInterviewTimeChange("second", "");
    }
  }}
  options={FIRST_INTERVIEW_TIME_OPTIONS}
  disabled={!canEdit || interviewTimes.canAttend !== "yes"}
  required
  className="compact-input"
/>
{ /* 修改第二面试时间的选择 */ }
<SelectField
  label="第二面试时间"
  name="second_interview_time"
  placeholder="请选择第二面试时间"
  value={interviewTimes.second}
  onChange={(value) => handleInterviewTimeChange("second", value)}
  options={SECOND_INTERVIEW_TIME_OPTIONS}
  disabled={!canEdit || interviewTimes.canAttend !== "yes"}
  disabledOptions={getDisabledSecondInterviewTimes()} // 添加禁用选项
  className="compact-input"
/>
                        </>
                      ) : (
                        <div
                          style={{
                            backgroundColor: "#f9f9f9",
                            padding: "12px",
                            borderRadius: "4px",
                            border: "1px solid #e8e8e8",
                            marginTop: "8px",
                          }}
                        >
                          <Text type="secondary">
                            若不能参加线下面试，请联系管理员安排线上面试时间。面试时间将由管理员另行通知。
                          </Text>
                        </div>
                      )}
                    </FormSection>

                    {/* 技术能力区域 */}
                    <FormSection title="技术能力" icon={<CodeOutlined />}>
                      <Form.Item label="技术栈" name="tech_stack">
                        <TechStackInput
                          items={techStackItems}
                          onChange={handleTechStackChange}
                          onAdd={addTechStackItem}
                          onRemove={removeTechStackItem}
                          disabled={!canEdit}
                          placeholder="请输入技术栈"
                        />
                      </Form.Item>

                      <TextAreaField
                        label="项目经验"
                        name="project_experience"
                        placeholder="请描述您参与过的项目，包括项目角色、使用的技术、取得的成果等..."
                        value={getFieldValue("project_experience")}
                        onChange={(e) =>
                          handleFieldChange(
                            "project_experience",
                            e.target.value
                          )
                        }
                        disabled={!canEdit}
                        rows={4}
                      />
                    </FormSection>

                    {/* 提交按钮 */}
                    <div className="form-actions">
                      <Space>
                        <Button
                          type="primary"
                          icon={
                            isSubmitted ? <EditOutlined /> : <SendOutlined />
                          }
                          loading={submitting || updating}
                          onClick={() => setShowSubmitConfirm(true)}
                          size="large"
                        >
                          {isSubmitted ? "更新简历" : "提交申请"}
                        </Button>

                        {/* 只有已提交的简历才显示取消编辑按钮 */}
                        {isSubmitted && (
                          <Button
                            icon={<EyeOutlined />}
                            onClick={handleCancelEdit}
                            size="large"
                          >
                            取消修改
                          </Button>
                        )}
                      </Space>
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
        title={
          <div style={{ display: "flex", alignItems: "center" }}>
            {isSubmitted ? (
              <EditOutlined style={{ color: "#1890ff", marginRight: "8px" }} />
            ) : (
              <SendOutlined style={{ color: "#1890ff", marginRight: "8px" }} />
            )}
            {isSubmitted ? "确认更新简历" : "确认提交申请"}
          </div>
        }
        open={showSubmitConfirm}
        onOk={isSubmitted ? handleUpdateResume : handleSubmit}
        onCancel={() => setShowSubmitConfirm(false)}
        okText={isSubmitted ? "确认更新" : "确认提交"}
        cancelText="再检查一下"
        confirmLoading={submitting || updating}
        className="submit-confirm-modal"
        width={500}
      >
        <div className="modal-content">
          <p
            style={{
              color: "#333",
              marginBottom: "20px",
              lineHeight: "1.6",
              fontSize: "14px",
            }}
          >
            {isSubmitted
              ? "您即将更新简历信息，更新后的信息将用于后续流程。"
              : "您即将提交申请，提交后可以继续修改直到审核开始。"}
          </p>

          <div
            style={{
              backgroundColor: "#fafafa",
              border: "1px solid #e8e8e8",
              borderRadius: "6px",
              padding: "16px",
              marginBottom: "8px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "12px",
                color: "#262626",
              }}
            >
              <ExclamationCircleOutlined
                style={{
                  color: "#faad14",
                  marginRight: "8px",
                }}
              />
              <span style={{ fontWeight: "500" }}>重要提醒</span>
            </div>

            <div
              style={{
                color: "#595959",
                fontSize: "13px",
                lineHeight: "1.6",
              }}
            >
              <div style={{ marginBottom: "6px" }}>
                • 请确保填写的信息真实有效
              </div>
              <div style={{ marginBottom: "6px" }}>• 核对联系方式是否正确</div>
              <div style={{ marginBottom: "6px" }}>• 确认照片清晰可辨认</div>
              <div style={{ marginBottom: "6px" }}>
                • 技术能力和项目经验如实反映
              </div>
              {!isSubmitted && <div>• 提交后仍可修改，直到审核开始</div>}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Publish;
