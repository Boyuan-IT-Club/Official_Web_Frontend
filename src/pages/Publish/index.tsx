// src/pages/Publish/index.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Table,
  Upload,
  Select,
} from 'antd';
import {
  SendOutlined,
  EditOutlined,
  SaveOutlined,
  IdcardOutlined,
  CodeOutlined,
  CommentOutlined,
  TeamOutlined,
  QuestionCircleOutlined,
  CaretDownOutlined,
  EyeOutlined,
  ExclamationCircleOutlined,
  ImportOutlined,
  FileWordOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';

import { compressImage } from '@/utils/imageCompress';
import TextInputField from './components/TextInputField';
import SelectField from './components/SelectField';
import TextAreaField from './components/TextAreaField';
import RadioGroupField from './components/RadioGroupField';
import TechStackInput from './components/TechStackInput';
import PhotoUpload from './components/PhotoUpload';
import FormSection from './components/FormSection';
import ResumeDisplay from '@/components/ResumeDisplay';
import CycleSwitcher from '@/components/CycleSwitcher';
import InterviewStatusCard from '@/components/InterviewStatusCard';
import {
  PreferenceTimeSlot,
  getMyPreference,
  getMySchedule,
  listOpenTimeSlots,
  submitPreference,
} from '@/api/interviewPreference';
import { getValidDept } from '@/api/manage/deptManage';

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
  fetchOpenCycles,
  setSelectedCycle,
} from '@/store/modules/resume';
import { fetchResumeFieldsConfig, ResumeField } from '@/store/modules/resumeFields';
import type { UserInfo } from '@/store/modules/user';
import {
  buildExportData,
  exportResumeAsDOCX,
} from '@/utils/exportResume';
import {
  importResumeFile,
  extractFieldsFromText,
  hasAnyExtractedField,
} from '@/utils/importResume';
import type { ExtractedFields } from '@/utils/importResume';
import './index.scss';

const { Title, Text } = Typography;

/** 类型约束 */
type OptionItem = { value: string; label: string };

type FieldDefinitionItem = {
  fieldId: number;
  fieldKey: string;
  [key: string]: any;
};

type ResumeLike = {
  status?: number;
  resumeId?: string | number;
  resume_id?: string | number;
  id?: string | number;
  simpleFields?: Array<{ fieldId: number; fieldValue?: string; [key: string]: any }>;
  [key: string]: any;
};

type FieldValueLike = {
  fieldId: number;
  fieldValue: any;
  valueId?: any;
  resumeId?: any;
  [key: string]: any;
};

type ResumeSliceState = {
  cycleId: any;
  fieldDefinitions: any;
  resume: ResumeLike | null;
  fieldValues: FieldValueLike[];
  loading: boolean;
  submitting: boolean;
  updating: boolean;
  error?: string | null;
  [key: string]: any;
};

type ResumeFieldsSliceState = {
  fields: ResumeField[];
  loading: boolean;
  error: string | null;
};

type RootStateLike = {
  resume: ResumeSliceState;
  resumeFields: ResumeFieldsSliceState;
  user: { userInfo: UserInfo };
};

type DepartmentsState = { first: string; second: string };

type InterviewTimesState = {
  first: string;
  second: string;
  canAttend: 'yes' | 'no';
  customTime: string;
};

type ValidationErrorLike = {
  errorFields?: unknown[];
  [key: string]: any;
};

const isValidationError = (err: unknown): err is ValidationErrorLike => {
  return typeof err === 'object' && err !== null && 'errorFields' in err;
};

// 常量移出组件，避免每次渲染重新创建
/**
 * 从后端返回的字段定义列表构造 fieldKey -> fieldId 映射。
 *
 * 这里原先是一张写死的表（name: 4, major: 5, grade: 8 …），那是**某一个周期**的
 * 自增 ID。别的周期 resume_field_definition 是另一批 ID，照那张表写入会把值
 * 存到错的字段上 —— 线上表现是简历详情里「姓名」空着、而「年级」显示成了人名。
 *
 * 拿不到定义时返回空映射，而不是猜 ID：写到错字段是不可逆的数据损坏，
 * 什么都不写反而可以重填。此时投递页会显示「该周期还没有配置报名表单」。
 */
const buildFieldIdMapping = (list: unknown): Record<string, number> => {
  // store 里存的就是数组本身：fetchResumeFields 返回 res.data，而 axios 拦截器
  // 已经把响应解到业务体，所以这里拿到的是 data 数组。兼容一下信封形状以防调用方不同。
  const arr = Array.isArray(list) ? list : (list as any)?.data;
  if (!Array.isArray(arr) || arr.length === 0) return {};
  const mapping: Record<string, number> = {};
  arr.forEach((f: FieldDefinitionItem) => {
    if (f?.fieldKey != null && f?.fieldId != null) mapping[f.fieldKey] = Number(f.fieldId);
  });
  return mapping;
};


const DEFAULT_FIRST_DEPT: OptionItem[] = [
  { value: '技术部', label: '技术部' }, { value: '媒体部', label: '媒体部' },
  { value: '项目部', label: '项目部' }, { value: '综合部', label: '综合部' },
];
const DEFAULT_GRADE: OptionItem[] = [
  { value: '大一', label: '大一' }, { value: '大二', label: '大二' },
  { value: '大三', label: '大三' }, { value: '大四', label: '大四' },
  { value: '研究生', label: '研究生' },
];
const DEFAULT_GENDER: OptionItem[] = [
  { value: '男', label: '男' }, { value: '女', label: '女' },
];
const DEFAULT_INTERVIEW_TIMES: OptionItem[] = [
  { value: 'Day 1 上午', label: 'Day 1 上午' },
  { value: 'Day 1 下午', label: 'Day 1 下午' },
  { value: 'Day 1 晚上', label: 'Day 1 晚上' },
];
const DEFAULT_ATTEND: OptionItem[] = [
  { value: 'yes', label: '能参加' }, { value: 'no', label: '不能参加' },
];

const TIPS_CONTENT: Array<{ title: string; content: string }> = [
  { title: '隐私保护', content: '本报名表所提供的所有信息将严格保密，我们承诺对您的个人信息采取必要的保护措施，确保其安全性。所有带红色星号的字段为必填项，其它为选填项。' },
  { title: '邮箱', content: '可填写华东师范大学学生邮箱或其它常用邮箱' },
  { title: '照片', content: '请上传个人免冠正面照片，建议使用近期证件照，背景简洁，大小不超过5MB，以便于招新工作的审核和身份确认。' },
  { title: 'GitHub主页', content: '有GitHub账号的同学可以填写，没有则可以不填' },
  { title: '个人简介', content: '请提供详细的个人介绍，可包括但不限于个人特长、兴趣爱好、学习或个人经历，以及对社团的期望和建议等内容。全面的自我介绍有利于面试官快速了解您。' },
  { title: '意愿加入部门', content: '本社团设有综合部、项目部、技术部和媒体部四个部门。请选择1至2个意愿加入的部门，最终录取将安排到其中一个部门。' },
  { title: '面试时间', content: '请选择您方便的面试时间段，Day 1为9月27日（9月28日因调休暂不设为面试）。如无法参加指定时间的面试，请联系管理员进行沟通参与线上面试。' },
  { title: '技术栈', content: '请填写您熟悉的技术栈，如Java、Python、C、C++、Go、MySQL、Spring Boot、Vue等编程语言、技术框架或掌握的算法' },
  { title: '项目经验', content: '有计算机相关项目经历者可详细填写，若没有可简要说明或不填' },
];

const parseJsonField = <T,>(raw: any, fallback: T): T => {
  try { return JSON.parse(String(raw)) as T; } catch { return fallback; }
};

/**
 * 解析存成 JSON 的字段值，并**保证**结果是字符串数组。
 *
 * parseJsonField 的 <T> 只是类型断言 —— JSON.parse 运行时可能返回数字、对象、null，
 * 而 TypeScript 挡不住脏数据。线上就因此整页崩过：某字段存的值是 123，
 * JSON.parse 得到数字 123，塞进 techStackItems 后 exportResume 里的
 * techStackItems.filter(Boolean) 直接 TypeError（TypeError: s.filter is not a function）。
 *
 * 凡是要喂给「按数组用」的 state，都必须走这里，不能只标个 <string[]> 就当数组。
 */
/** 同上，但保证结果是普通对象（非数组、非 null）。拿到数字虽然不崩，但字段会全变 undefined */
const parseObjectField = <T extends object>(raw: unknown, fallback: T): T => {
  try {
    const parsed = JSON.parse(String(raw));
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
};

const parseStringArray = (raw: unknown, fallback: string[]): string[] => {
  try {
    const parsed = JSON.parse(String(raw));
    if (!Array.isArray(parsed)) return fallback;
    return parsed.map((x) => (x == null ? '' : String(x)));
  } catch {
    return fallback;
  }
};

const Publish: React.FC = () => {
  const dispatch = useDispatch<any>();
  const [form] = Form.useForm<any>();

  const [photoBase64, setPhotoBase64] = useState<string>('');
  const [showSubmitConfirm, setShowSubmitConfirm] = useState<boolean>(false);
  const [isPhotoCompressing, setIsPhotoCompressing] = useState<boolean>(false);
  const [showTips, setShowTips] = useState<boolean>(false);
  const [techStackItems, setTechStackItems] = useState<string[]>(['']);
  const [departments, setDepartments] = useState<DepartmentsState>({ first: '', second: '' });
  const [interviewTimes, setInterviewTimes] = useState<InterviewTimesState>({
    first: '', second: '', canAttend: 'yes', customTime: '',
  });
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  // 已按哪个周期初始化过（见 initData 里的去重说明）
  const initedCidRef = useRef<number | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // ---- 导入导出相关状态 ----
  const [importModalOpen, setImportModalOpen] = useState<boolean>(false);
  const [extractedFields, setExtractedFields] = useState<ExtractedFields | null>(null);
  const [importLoading, setImportLoading] = useState<boolean>(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const {
    cycleId, openCycles, fieldDefinitions, resume, fieldValues, submitting, updating, error,
  } = useSelector((state: RootStateLike) => state.resume);

  const { fields: configFields, loading: configLoading } = useSelector(
    (state: RootStateLike) => state.resumeFields
  );

  const userInfo = useSelector((state: RootStateLike) => state.user.userInfo);

  // ---- O(1) Map 查找替代 O(n) array.find() ----
  const fieldIdMapping = useMemo<Record<string, number>>(
    () => buildFieldIdMapping(fieldDefinitions),
    [fieldDefinitions],
  );

  const fieldValueMap = useMemo<Map<number, FieldValueLike>>(() => {
    const map = new Map<number, FieldValueLike>();
    fieldValues.forEach((fv) => { if (fv.fieldId != null) map.set(Number(fv.fieldId), fv); });
    return map;
  }, [fieldValues]);

  const configFieldMap = useMemo<Map<string, ResumeField>>(() => {
    const map = new Map<string, ResumeField>();
    configFields.forEach((f) => { if (f.key) map.set(f.key, f); });
    return map;
  }, [configFields]);

  // ---- useMemo 选项派生，替代 7 个 useState ----
  const firstDeptOptions = useMemo<OptionItem[]>(() => {
    const cf = configFieldMap.get('first_department');
    if (cf?.options?.length) return cf.options.map(o => ({ value: o, label: o }));
    return DEFAULT_FIRST_DEPT;
  }, [configFieldMap]);
  const secondDeptOptions = useMemo<OptionItem[]>(() => {
    const base = firstDeptOptions;
    return [{ value: '无', label: '无' }, ...base];
  }, [firstDeptOptions]);
  const gradeOptions = useMemo<OptionItem[]>(() => {
    const cf = configFieldMap.get('grade');
    if (cf?.options?.length) return cf.options.map(o => ({ value: o, label: o }));
    return DEFAULT_GRADE;
  }, [configFieldMap]);
  const genderOptions = useMemo<OptionItem[]>(() => {
    const cf = configFieldMap.get('gender');
    if (cf?.options?.length) return cf.options.map(o => ({ value: o, label: o }));
    return DEFAULT_GENDER;
  }, [configFieldMap]);
  const firstInterviewTimeOptions = useMemo<OptionItem[]>(() => {
    const cf = configFieldMap.get('first_interview_time');
    if (cf?.options?.length) return cf.options.map(o => ({ value: o, label: o }));
    return DEFAULT_INTERVIEW_TIMES;
  }, [configFieldMap]);
  const secondInterviewTimeOptions = useMemo<OptionItem[]>(() => {
    const base = firstInterviewTimeOptions;
    return [{ value: '无', label: '无' }, ...base];
  }, [firstInterviewTimeOptions]);
  const canAttendOptions = useMemo<OptionItem[]>(() => {
    const cf = configFieldMap.get('can_attend_interview');
    if (cf?.options?.length) return cf.options.map(o => ({ value: o, label: o }));
    return DEFAULT_ATTEND;
  }, [configFieldMap]);

  // ---- O(1) 辅助函数 ----
  const getFieldValue = useCallback((fieldKey: string): any => {
    const fieldId = fieldIdMapping[fieldKey];
    if (!fieldId) return '';
    const fv = fieldValueMap.get(fieldId);
    return fv ? fv.fieldValue : '';
  }, [fieldIdMapping, fieldValueMap]);

  const isFieldEnabled = useCallback((fieldKey: string): boolean => {
    const cf = configFieldMap.get(fieldKey);
    return cf ? cf.enabled !== false : true;
  }, [configFieldMap]);

  const isFieldRequired = useCallback((fieldKey: string): boolean => {
    const cf = configFieldMap.get(fieldKey);
    return cf ? cf.required : true;
  }, [configFieldMap]);

  const getFieldLabel = useCallback((fieldKey: string, defaultLabel: string): string => {
    const cf = configFieldMap.get(fieldKey);
    return cf?.label || defaultLabel;
  }, [configFieldMap]);

  const getFieldPlaceholder = useCallback((fieldKey: string, defaultPlaceholder: string): string => {
    const cf = configFieldMap.get(fieldKey);
    return cf?.placeholder || defaultPlaceholder;
  }, [configFieldMap]);

  // ---- useCallback 稳定回调 ----
  const handleFieldChange = useCallback((fieldKey: string, value: any): void => {
    const fieldId = fieldIdMapping[fieldKey];
    if (fieldId) dispatch(setFieldValue({ fieldId, value }));
  }, [dispatch, fieldIdMapping]);

  const handleDepartmentChange = useCallback((type: keyof DepartmentsState, value: string): void => {
    setDepartments(prev => {
      const next = { ...prev, [type]: value };
      const deptArray: string[] = [];
      if (next.first && next.first !== '无') deptArray.push(next.first);
      if (next.second && next.second !== '无') deptArray.push(next.second);
      handleFieldChange('expected_departments', JSON.stringify(deptArray));
      return next;
    });
  }, [handleFieldChange]);

  const handleInterviewTimeChange = useCallback((type: keyof InterviewTimesState, value: string): void => {
    setInterviewTimes(prev => {
      const next: InterviewTimesState = { ...prev, [type]: value } as any;
      const timesData = {
        first: next.canAttend === 'yes' && next.first !== '无' ? next.first : '',
        second: next.canAttend === 'yes' && next.second !== '无' ? next.second : '',
        canAttend: next.canAttend,
        customTime: next.customTime,
      };
      handleFieldChange('expected_interview_time', JSON.stringify(timesData));
      return next;
    });
  }, [handleFieldChange]);

  const handleTechStackChange = useCallback((index: number, value: string): void => {
    setTechStackItems(prev => {
      const next = [...prev];
      next[index] = value;
      const filtered = next.filter((item) => item.trim() !== '');
      handleFieldChange('tech_stack', JSON.stringify(filtered));
      return next;
    });
  }, [handleFieldChange]);

  const addTechStackItem = useCallback((): void => {
    setTechStackItems(prev => [...prev, '']);
  }, []);

  const removeTechStackItem = useCallback((index: number): void => {
    setTechStackItems(prev => {
      if (prev.length <= 1) return prev;
      const next = [...prev];
      next.splice(index, 1);
      const filtered = next.filter((item) => item.trim() !== '');
      handleFieldChange('tech_stack', JSON.stringify(filtered));
      return next;
    });
  }, [handleFieldChange]);

  const handlePhotoUpload = useCallback(async (file: File): Promise<boolean> => {
    setIsPhotoCompressing(true);
    try {
      if (file.size > 5 * 1024 * 1024) { message.error('照片大小不能超过5MB'); return false; }
      if (!file.type.startsWith('image/')) { message.error('请上传图片文件'); return false; }
      const compressedBase64 = await compressImage(file);
      setPhotoBase64(compressedBase64);
      handleFieldChange('personal_photo', compressedBase64);
      message.success('照片上传成功');
      return true;
    } catch {
      message.error('照片处理失败');
      return false;
    } finally {
      setIsPhotoCompressing(false);
    }
  }, [handleFieldChange]);

  // 简历状态
  const isSubmitted = useMemo<boolean>(() => {
    return !!(resume && resume.status !== undefined && resume.status !== 1);
  }, [resume]);

  const canEdit = useMemo<boolean>(() => {
    return resume?.status === 1 || resume?.status === 2;
  }, [resume]);

  const disabledSecondDepts = useMemo<string[]>(() => {
    if (!departments.first || departments.first === '无') return [];
    return [departments.first];
  }, [departments.first]);

  const disabledSecondInterviewTimes = useMemo<string[]>(() => {
    if (!interviewTimes.first || interviewTimes.first === '无') return [];
    return [interviewTimes.first];
  }, [interviewTimes.first]);

  // ---- 数据初始化（并行API调用） ----
  const initData = useCallback(async (): Promise<void> => {
    try {
      setIsInitializing(true);

      // 解析本次要投的周期：可能同时有多个周期开放，用户选中的那个优先，
      // 选中项不在开放列表里（首次进入、或上次选的周期已截止）才回退到最新一个
      const open = await dispatch(fetchOpenCycles()).unwrap().catch(() => [] as typeof openCycles);
      const openIds = (open ?? []).map((c) => Number(c.cycleId));
      const cid = openIds.includes(Number(cycleId))
        ? Number(cycleId)
        : (openIds.length > 0 ? openIds[0] : cycleId);

      // fetchOpenCycles 的 reducer 也会把 store 里的 cycleId 校正到开放列表内，
      // 那会让本 effect 因 cycleId 变化再跑一次。这里记下已初始化的周期，
      // 同一个周期不重复拉一遍全部接口。
      if (initedCidRef.current === cid) {
        setIsInitializing(false);
        return;
      }
      // 切换周期（不是首次进入）时先清空表单与已加载的字段值。
      // 必须显式清：下面填表单用的是 form.setFieldsValue(部分对象)，它只覆盖
      // 传进去的键，不会清掉没传的键 —— 从填满的 A 切到空的 B 时，A 的答案会
      // 以预填的样子留在 B 的表单里，用户很可能就那样提交了。
      const isCycleSwitch = initedCidRef.current !== null && initedCidRef.current !== cid;
      if (isCycleSwitch) {
        dispatch(clearFieldValues());
        form.resetFields();
        setPhotoBase64('');
        setTechStackItems(['']);
        setDepartments({ first: '', second: '' });
        setInterviewTimes({ first: '', second: '', canAttend: 'yes', customTime: '' });
      }
      initedCidRef.current = cid;

      // 所有独立请求并行发起，大幅减少首屏加载时间
      const [configResult, fieldsResult, resumeResult, fieldValuesResult] =
        await Promise.all([
          dispatch(fetchResumeFieldsConfig(cid)).unwrap().catch((err: any) => {
            console.error('加载字段配置失败:', err); return null;
          }),
          dispatch(fetchResumeFields(cid)).unwrap(),
          dispatch(fetchOrCreateResume(cid)).unwrap(),
          dispatch(fetchFieldValues(cid)).unwrap(),
        ]);

      dispatch(setFieldDefinitions(fieldsResult));

      const resumeData: ResumeLike = (resumeResult?.data || resumeResult) as any;
      const resolvedFieldValues: FieldValueLike[] =
        Array.isArray(fieldValuesResult) ? fieldValuesResult
          : (fieldValuesResult as any)?.data ?? [];

      if (resumeData) {
        const resumeId = resumeData.resumeId || resumeData.resume_id || resumeData.id;
        if (resumeId) dispatch(setResumeId(resumeId));

        // 用本次刚取回的定义就地构造映射：不能按写死的 ID 去找，那是别的周期的编号。
        // 也不用组件里的 fieldIdMapping —— 它来自 initData 自己 dispatch 的状态，
        // 放进依赖会让本回调依赖自身的副作用。
        const fidOf = buildFieldIdMapping(fieldsResult);
        const photoFid = fidOf['personal_photo'];
        const techFid = fidOf['tech_stack'];
        const deptFid = fidOf['expected_departments'];
        const interviewFid = fidOf['expected_interview_time'];

        const sf = resumeData.simpleFields;
        if (sf) {
          const photoField = sf.find(f => f.fieldId === photoFid);
          if (photoField?.fieldValue) setPhotoBase64(photoField.fieldValue);

          const techField = sf.find(f => f.fieldId === techFid);
          if (techField?.fieldValue) {
            setTechStackItems(parseStringArray(techField.fieldValue, ['']));
          } else { setTechStackItems(['']); }

          const deptField = sf.find(f => f.fieldId === deptFid);
          if (deptField?.fieldValue) {
            const arr = parseStringArray(deptField.fieldValue, []);
            setDepartments({ first: arr[0] || '', second: arr[1] || '' });
          } else { setDepartments({ first: '', second: '' }); }
        }

        const interviewField = resolvedFieldValues.find(f => f.fieldId === interviewFid);
        if (interviewField?.fieldValue) {
          setInterviewTimes(parseObjectField<InterviewTimesState>(interviewField.fieldValue, {
            first: '', second: '', canAttend: 'yes', customTime: '',
          }));
        } else {
          setInterviewTimes({ first: '', second: '', canAttend: 'yes', customTime: '' });
        }

        setIsEditing(resumeData.status === 1);
      }
    } catch (err: unknown) {
      console.error('初始化数据失败:', err);
      const msg = typeof err === 'object' && err !== null && 'message' in err
        ? String((err as any).message) : String(err);
      message.error('加载简历信息失败: ' + msg);
      setTechStackItems(['']);
      setDepartments({ first: '', second: '' });
      setPhotoBase64('');
      setIsEditing(true);
    } finally {
      setIsInitializing(false);
    }
  }, [dispatch, cycleId, form]);

  useEffect(() => { void initData(); }, [initData]);

  // 错误处理
  useEffect(() => {
    if (error) { message.error(error); dispatch(resetError()); }
  }, [error, dispatch]);

  // 当字段值变化时更新表单
  useEffect(() => {
    if (fieldValues.length > 0 && isEditing) {
      const formValues: Record<string, any> = {};
      Object.keys(fieldIdMapping).forEach((key) => {
        if (isFieldEnabled(key)) {
          const v = getFieldValue(key);
          if (v !== undefined && v !== null) formValues[key] = v;
        }
      });
      form.setFieldsValue(formValues);
      form.setFieldsValue({
        first_department: departments.first,
        second_department: departments.second,
        first_interview_time: interviewTimes.first,
        second_interview_time: interviewTimes.second,
        can_attend_interview: interviewTimes.canAttend,
        custom_interview_time: interviewTimes.customTime,
      });
    }
  }, [fieldValues, isEditing, fieldIdMapping, departments, interviewTimes,
      isFieldEnabled, getFieldValue, form]);

  // 从登录信息自动补全姓名、学号（邮箱前缀）、邮箱、手机号。
  // 说明：不限定编辑态——查看态也需要有值；且只在该字段当前为空时补，
  // 不覆盖用户自己填过的内容。补进 redux 后随「保存草稿/提交」一并落库。
  useEffect(() => {
    if (isInitializing || !userInfo) return;
    const fillIfEmpty = (key: string, value?: string | null) => {
      if (!value) return;
      const current = getFieldValue(key);
      if (current == null || String(current).trim() === '') handleFieldChange(key, value);
    };
    fillIfEmpty('name', userInfo.name);
    fillIfEmpty('phone', userInfo.phone);
    if (userInfo.email) {
      fillIfEmpty('email', userInfo.email);
      fillIfEmpty('student_id', userInfo.studentId ?? String(userInfo.email).split('@')[0]);
    }
  }, [userInfo, isInitializing, fieldIdMapping, getFieldValue, handleFieldChange]);

  // ---- 提交与更新 ----
  // 以「用户实际填过的值」为准来构造保存载荷。
  // 注意：不要用 configFields（字段启停配置）作为唯一来源——配置接口异常时
  // 它会是空数组，进而导致整份简历静默保存 0 个字段（历史数据丢失的根因）。
  const buildFieldValuesForSubmit = useCallback((currentResumeId: any) => {
    const disabledFieldIds = new Set<number>(
      configFields
        .filter(f => f.enabled === false)
        .map(f => fieldIdMapping[f.key])
        .filter((id): id is number => !!id),
    );
    const result: any[] = [];
    fieldValueMap.forEach((fv, fieldId) => {
      if (disabledFieldIds.has(fieldId)) return;             // 明确停用的字段不提交
      if (fv?.fieldValue == null || String(fv.fieldValue).trim() === '') return; // 空值跳过
      result.push({ fieldId, fieldValue: fv.fieldValue, valueId: fv.valueId, resumeId: currentResumeId });
    });
    return result;
  }, [configFields, fieldIdMapping, fieldValueMap]);

  // ---- 面试意向（方案B：志愿部门 + 可接受时间窗，随简历一次提交）----
  const [openSlots, setOpenSlots] = useState<PreferenceTimeSlot[]>([]);
  const [selectedSlotIds, setSelectedSlotIds] = useState<number[]>([]);
  const [deptNameToId, setDeptNameToId] = useState<Record<string, number>>({});
  // 面试已安排（status=1）后意向锁定：算法已按旧志愿排完场次，此时再改
  // 不会生效，只会让人以为改了。后端同样会拒（3613），这里是把入口一并收掉。
  const [intentLocked, setIntentLocked] = useState(false);

  useEffect(() => {
    if (!cycleId) return;
    let cancelled = false;
    (async () => {
      try {
        const [slots, depts, mine, sched]: any[] = await Promise.all([
          listOpenTimeSlots(cycleId).catch(() => null),
          getValidDept().catch(() => null),
          getMyPreference(cycleId).catch(() => null),
          getMySchedule(cycleId).catch(() => null),
        ]);
        if (cancelled) return;
        setIntentLocked(sched?.data?.status === 1);
        setOpenSlots(slots?.data ?? []);
        const mapping: Record<string, number> = {};
        (depts?.data ?? []).forEach((d: any) => { if (d?.deptName) mapping[d.deptName] = d.deptId; });
        setDeptNameToId(mapping);
        const accepted = mine?.data?.acceptedTimeSlots;
        if (Array.isArray(accepted) && accepted.length > 0) {
          setSelectedSlotIds(accepted.map((s: any) => s.timeSlotId).filter(Boolean));
        }
      } catch { /* 意向区加载失败不阻塞简历表单 */ }
    })();
    return () => { cancelled = true; };
  }, [cycleId]);

  /** 简历提交/更新成功后同步提交面试志愿（失败仅提醒，不影响简历） */
  const savePreferenceBestEffort = useCallback(async () => {
    if (intentLocked) {
      // 面试已安排，意向以既有安排为准；简历其它内容照常保存
      return;
    }
    const firstDeptId = deptNameToId[departments.first];
    if (!firstDeptId || selectedSlotIds.length === 0) {
      message.warning('面试意向未完整填写（志愿部门/可面试时间），可稍后回到本页补填并更新简历');
      return;
    }
    try {
      await submitPreference({
        cycleId,
        firstDeptId,
        secondDeptId: deptNameToId[departments.second] || undefined,
        timeSlotIds: selectedSlotIds,
      });
    } catch (e: any) {
      console.error('面试志愿提交失败:', e);
      message.warning(e?.message || '面试志愿提交失败，可稍后回到本页重新提交');
    }
  }, [cycleId, departments, deptNameToId, selectedSlotIds, intentLocked]);

  // 保存草稿：只持久化已填字段值，不做必填校验、不提交
  const [savingDraft, setSavingDraft] = useState(false);
  const handleSaveDraft = useCallback(async (): Promise<void> => {
    const currentResumeId = resume?.resume_id || resume?.id;
    if (!currentResumeId) { message.error('简历ID不存在，请刷新页面重试'); return; }
    const deptArray: string[] = [];
    if (departments.first && departments.first !== '无') deptArray.push(departments.first);
    if (departments.second && departments.second !== '无') deptArray.push(departments.second);
    const filteredTech = techStackItems.filter(item => item && item.trim());
    if (deptArray.length > 0) handleFieldChange('expected_departments', JSON.stringify(deptArray));
    if (filteredTech.length > 0) handleFieldChange('tech_stack', JSON.stringify(filteredTech));
    setSavingDraft(true);
    try {
      const fieldValuesToSave = buildFieldValuesForSubmit(currentResumeId);
      if (fieldValuesToSave.length === 0) {
        message.warning('还没有填写任何内容，无需保存');
        return;
      }
      await dispatch(saveFieldValues({ cycleId, fieldValues: fieldValuesToSave, resumeId: currentResumeId })).unwrap();
      message.success(`草稿已保存（${fieldValuesToSave.length} 项），下次登录可继续编辑`);
    } catch (err) {
      console.error('草稿保存失败:', err);
      message.error('草稿保存失败，请稍后重试');
    } finally {
      setSavingDraft(false);
    }
  }, [resume, departments, techStackItems, buildFieldValuesForSubmit, cycleId, dispatch]);

  const handleSubmit = useCallback(async (): Promise<void> => {
    try {
      await form.validateFields();
      const deptArray: string[] = [];
      if (departments.first && departments.first !== '无') deptArray.push(departments.first);
      if (departments.second && departments.second !== '无') deptArray.push(departments.second);
      const filteredTech = techStackItems.filter(item => item && item.trim());
      if (deptArray.length > 0) handleFieldChange('expected_departments', JSON.stringify(deptArray));
      if (filteredTech.length > 0) handleFieldChange('tech_stack', JSON.stringify(filteredTech));

      const currentResumeId = resume?.resume_id || resume?.id;
      if (!currentResumeId) { message.error('简历ID不存在，请刷新页面重试'); return; }

      const fieldValuesToSave = buildFieldValuesForSubmit(currentResumeId);
      if (fieldValuesToSave.length === 0) {
        message.error('未能收集到任何简历内容，请刷新页面后重新填写（避免提交空简历）');
        return;
      }

      await dispatch(saveFieldValues({ cycleId, fieldValues: fieldValuesToSave, resumeId: currentResumeId })).unwrap();
      await dispatch(submitResume({ cycleId, resumeId: currentResumeId })).unwrap();

      // 简历提交成功后，同步提交面试志愿（方案二：一次提交完成两件事）
      await savePreferenceBestEffort();
      message.success('简历与面试意向已提交！分配结果将通过邮件通知，也可在首页查看进度。');
      setShowSubmitConfirm(false);
      setIsEditing(false);
    } catch (err: unknown) {
      console.error('提交错误:', err);
      if (isValidationError(err) && Array.isArray(err.errorFields) && err.errorFields.length > 0) {
        message.error('请完善必填信息'); return;
      }
      if (typeof err === 'string' && err.includes('已经提交过简历')) {
        message.warning(err);
        setIsEditing(false);
        try { await dispatch(fetchOrCreateResume(cycleId)); } catch { }
        return;
      }
      const msg = typeof err === 'object' && err !== null && 'message' in err
        ? String((err as any).message) : String(err);
      message.error(`操作失败: ${msg}`);
    }
  }, [form, departments, techStackItems, resume, cycleId, dispatch,
      handleFieldChange, buildFieldValuesForSubmit, savePreferenceBestEffort]);

  const handleUpdateResume = useCallback(async (): Promise<void> => {
    try {
      await form.validateFields();
      const deptArray: string[] = [];
      if (departments.first && departments.first !== '无') deptArray.push(departments.first);
      if (departments.second && departments.second !== '无') deptArray.push(departments.second);
      const filteredTech = techStackItems.filter(item => item && item.trim());
      if (deptArray.length > 0) handleFieldChange('expected_departments', JSON.stringify(deptArray));
      if (filteredTech.length > 0) handleFieldChange('tech_stack', JSON.stringify(filteredTech));

      const currentResumeId = resume?.resume_id || resume?.id;
      if (!currentResumeId) { message.error('简历ID不存在，请刷新页面重试'); return; }

      const fieldValuesToUpdate = buildFieldValuesForSubmit(currentResumeId);
      if (fieldValuesToUpdate.length === 0) {
        message.error('未能收集到任何简历内容，已取消更新（请刷新页面重试，避免清空简历）');
        return;
      }

      await dispatch(updateResume({ cycleId, fieldValues: fieldValuesToUpdate, resumeId: currentResumeId })).unwrap();
      // 更新简历时同步覆盖面试志愿（后端允许重复提交覆盖）
      await savePreferenceBestEffort();
      message.success(`简历更新成功（${fieldValuesToUpdate.length} 项）！`);
      setShowSubmitConfirm(false);
      setIsEditing(false);
      await dispatch(fetchOrCreateResume(cycleId));
    } catch (err: unknown) {
      console.error('更新简历错误:', err);
      if (isValidationError(err) && Array.isArray(err.errorFields) && err.errorFields.length > 0) {
        message.error('请完善必填信息');
      } else {
        const msg = typeof err === 'object' && err !== null && 'message' in err
          ? String((err as any).message) : String(err);
        message.error(`更新失败: ${msg}`);
      }
    }
  }, [form, departments, techStackItems, resume, cycleId, dispatch,
      handleFieldChange, buildFieldValuesForSubmit, savePreferenceBestEffort]);

  const handleEdit = useCallback(async (): Promise<void> => {
    try {
      // 快照内存中的字段值：数据库拉取会整体覆盖 fieldValues，
      // 若库里缺某字段（如自动补全后尚未保存），刷新后合并回来，避免进入编辑即“清空”
      const memValues = fieldValues.filter(
        (fv) => fv.fieldValue != null && String(fv.fieldValue).trim() !== '',
      );
      const resumeResult = await dispatch(fetchOrCreateResume(cycleId)).unwrap();
      const resumeData: ResumeLike = (resumeResult?.data || resumeResult) as any;
      if (resumeData) {
        const fresh: any[] = (await dispatch(fetchFieldValues(cycleId)).unwrap()) ?? [];
        const freshIds = new Set(
          fresh
            .filter((fv: any) => fv?.fieldValue != null && String(fv.fieldValue).trim() !== '')
            .map((fv: any) => Number(fv.fieldId)),
        );
        memValues.forEach((fv) => {
          if (!freshIds.has(Number(fv.fieldId))) {
            dispatch(setFieldValue({ fieldId: fv.fieldId, value: fv.fieldValue }));
          }
        });
        const sf = resumeData.simpleFields;
        if (sf) {
          const techFid = fieldIdMapping['tech_stack'];
          const deptFid = fieldIdMapping['expected_departments'];
          const techField = sf.find(f => f.fieldId === techFid);
          setTechStackItems(techField?.fieldValue ? parseStringArray(techField.fieldValue, ['']) : ['']);
          const deptField = sf.find(f => f.fieldId === deptFid);
          if (deptField?.fieldValue) {
            const arr = parseStringArray(deptField.fieldValue, []);
            setDepartments({ first: arr[0] || '', second: arr[1] || '' });
          } else { setDepartments({ first: '', second: '' }); }
        }
      }
      setIsEditing(true);
    } catch (err: unknown) {
      console.error('进入编辑模式失败:', err);
      message.error('加载简历数据失败，请刷新页面重试');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, cycleId, fieldValues, fieldIdMapping]);

  const handleCancelEdit = useCallback(async (): Promise<void> => {
    try {
      message.loading('正在恢复数据...', 0);
      dispatch(clearFieldValues());
      const resumeResult = await dispatch(fetchOrCreateResume(cycleId)).unwrap();
      const resumeData: ResumeLike = (resumeResult?.data || resumeResult) as any;
      if (resumeData) {
        await dispatch(fetchFieldValues(cycleId)).unwrap();
        const sf = resumeData.simpleFields;
        if (sf) {
          const techFid = fieldIdMapping['tech_stack'];
          const deptFid = fieldIdMapping['expected_departments'];
          const photoFid = fieldIdMapping['personal_photo'];
          const techField = sf.find(f => f.fieldId === techFid);
          setTechStackItems(techField?.fieldValue ? parseStringArray(techField.fieldValue, ['']) : ['']);
          const deptField = sf.find(f => f.fieldId === deptFid);
          if (deptField?.fieldValue) {
            const arr = parseStringArray(deptField.fieldValue, []);
            setDepartments({ first: arr[0] || '', second: arr[1] || '' });
          } else { setDepartments({ first: '', second: '' }); }
          const photoField = sf.find(f => f.fieldId === photoFid);
          setPhotoBase64(photoField?.fieldValue ? String(photoField.fieldValue) : '');
        }
      }
      form.resetFields();
      message.destroy();
      message.success('已取消修改');
      setIsEditing(false);
    } catch (err: unknown) {
      message.destroy();
      console.error('取消修改失败:', err);
      message.error('取消修改失败，请刷新页面');
    }
  }, [dispatch, cycleId, form, fieldIdMapping]);

  // ---- 导出处理 ----
  const exportData = useMemo(() => {
    return buildExportData(fieldIdMapping, fieldValueMap, departments, techStackItems, photoBase64);
  }, [fieldIdMapping, fieldValueMap, departments, techStackItems, photoBase64]);

  const handleExportDOCX = useCallback(async (): Promise<void> => {
    await exportResumeAsDOCX(exportData);
  }, [exportData]);

  // ---- 导入处理 ----
  const handleImportFile = useCallback(async (file: File): Promise<void> => {
    setImportLoading(true);
    try {
      const result = await importResumeFile(file);
      if (result) {
        setExtractedFields(result);
        setImportModalOpen(true);
      }
    } finally {
      setImportLoading(false);
      // 重置 file input，允许重复选择同一文件
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, []);

  const handleConfirmImport = useCallback((): void => {
    if (!extractedFields) return;

    const keyToFieldKey: Record<string, string> = {
      name: 'name',
      student_id: 'student_id',
      gender: 'gender',
      grade: 'grade',
      major: 'major',
      email: 'email',
      phone: 'phone',
      github: 'github',
      self_introduction: 'self_introduction',
      reason: 'reason',
      tech_stack: 'tech_stack',
      project_experience: 'project_experience',
    };

    let importedCount = 0;
    Object.entries(keyToFieldKey).forEach(([extractKey, fieldKey]) => {
      const value = (extractedFields as any)[extractKey];
      if (value && String(value).trim()) {
        dispatch(setFieldValue({ fieldId: fieldIdMapping[fieldKey], value: String(value).trim() }));
        importedCount++;
      }
    });

    // 特殊处理：技术栈需要更新 techStackItems 状态
    if (extractedFields.tech_stack) {
      try {
        const arr = JSON.parse(extractedFields.tech_stack);
        if (Array.isArray(arr)) {
          setTechStackItems(arr);
        } else {
          // 如果提取出来的是逗号分隔的字符串
          const items = String(extractedFields.tech_stack).split(/[,，、]/).filter(Boolean);
          if (items.length > 0) setTechStackItems(items);
        }
      } catch {
        const items = String(extractedFields.tech_stack).split(/[,，、]/).filter(Boolean);
        if (items.length > 0) setTechStackItems(items);
      }
    }

    setImportModalOpen(false);
    setExtractedFields(null);
    message.success(`成功导入 ${importedCount} 个字段，请核对后保存`);
  }, [extractedFields, dispatch, fieldIdMapping]);

  const handleCancelImport = useCallback((): void => {
    setImportModalOpen(false);
    setExtractedFields(null);
  }, []);

  // ---- 渲染 ----
  if (isInitializing || configLoading) {
    return (
      <div className="publish-loading">
        <Spin size="large" />
        <Text>加载简历信息中...</Text>
      </div>
    );
  }

  const statusText = (() => {
    switch (resume?.status) {
      case 2: return '已提交（可修改）';
      case 3: return '评审中（不可修改）';
      case 4: return '通过（不可修改）';
      case 5: return '未通过（不可修改）';
      default: return '草稿';
    }
  })();

  return (
    <div className="publish-page">
      {/* 周期切换放在 isEditing 分支之外：简历一提交页面就切到只读分支，
          若只在编辑分支里渲染，投完第一个周期后另一个在招周期的入口就消失了。
          原先是 Alert 里塞一个 Select —— 下拉会把另一个周期藏起来，而用户最初
          的问题恰恰是「看不到另一个招募活动的入口」，藏进下拉等于没解决。 */}
      <CycleSwitcher
        cycles={openCycles}
        value={Number(cycleId)}
        onChange={(id) => dispatch(setSelectedCycle(id))}
        statusOf={(id) =>
          Number(id) === Number(cycleId) && !isEditing ? '已提交' : undefined
        }
      />

      {!isEditing ? (
        <div>
          <div className="questionnaire-header">
            <Title level={2} style={{ textAlign: 'center', marginBottom: 8 }}>
              博远信息技术社招新申请表
            </Title>
            <Alert
              message="简历信息"
              description={`您的简历状态：${statusText}。${resume?.status === 2 ? '在审核开始前您可以修改简历。' : '当前状态无法修改，如需修改请联系管理员。'}`}
              type="info" showIcon style={{ marginBottom: 16 }}
            />
          </div>
          <ResumeDisplay
            fieldValues={fieldValues}
            fieldIdMapping={fieldIdMapping}
            photoBase64={photoBase64}
            departments={departments}
            techStackItems={techStackItems}
          />
          <div style={{ marginTop: 24, textAlign: 'center', padding: '16px', borderTop: '1px solid #f0f0f0' }}>
            <Space>
              <Button icon={<FileWordOutlined />} size="large" onClick={handleExportDOCX}>
                导出 DOCX
              </Button>
              {canEdit && (
                <Button type="primary" icon={<EditOutlined />} onClick={handleEdit} size="large">
                  修改简历
                </Button>
              )}
            </Space>
          </div>
          {resume?.status === 3 && <Alert message="简历正在审核中" description="您的简历已进入审核阶段，暂时无法修改。" type="warning" showIcon style={{ marginTop: 24 }} />}
          {resume?.status === 4 && <Alert message="简历已通过" description="恭喜！您的简历已通过审核，无法修改。" type="success" showIcon style={{ marginTop: 24 }} />}
          {resume?.status === 5 && <Alert message="简历未通过" description="很遗憾，您的简历未通过审核，无法修改。" type="error" showIcon style={{ marginTop: 24 }} />}

          {/* 面试安排状态（志愿/分配结果，真实接口） */}
          <div style={{ marginTop: 24 }}>
            <InterviewStatusCard cycleId={cycleId} />
          </div>
        </div>
      ) : (
        <div>
          <div className="questionnaire-header">
            <Title level={2} style={{ textAlign: 'center', marginBottom: 8 }}>
              博远信息技术社招新申请表
            </Title>
            <Text type="secondary" style={{ textAlign: 'center', display: 'block', marginBottom: 24 }}>
              {isSubmitted ? '修改简历信息' : '欢迎加入博远信息技术社，请填写以下信息完成申请'}
            </Text>
            {isSubmitted && (
              <div className="edit-mode-bar">
                <span className="edit-mode-dot" />
                <span className="edit-mode-text">
                  编辑模式 · 修改将在点击「更新简历」后生效
                </span>
                <Button type="link" size="small" className="edit-mode-exit" onClick={handleCancelEdit}>
                  退出编辑
                </Button>
              </div>
            )}
          </div>

          {/* 选中周期没有任何字段定义时，下面的表单必须整块不渲染。
              表单本身是写死的 JSX，isFieldEnabled 在拿不到配置时默认放行，
              所以字段定义为空时它照样能填 —— 但 fieldIdMapping 也是空的，
              填完提交一个字都存不进去，而且不报错。只挂个提示条不够，
              必须把可填写的部分拿掉，否则就是在诱导用户白填一遍。 */}
          {fieldDefinitions.length === 0 && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
              message="该周期还没有配置报名表单"
              description={
                openCycles.length > 1
                  ? '这个招募周期的简历字段尚未配置，暂时无法填写。可以先在上方切换到其它周期，或联系管理员配置。'
                  : '这个招募周期的简历字段尚未配置，暂时无法填写，请联系管理员。'
              }
            />
          )}

          {fieldDefinitions.length > 0 && (
          <>
          <div className="tips-button-container" style={{ marginBottom: 16, textAlign: 'center' }}>
            <Button type="default" icon={<QuestionCircleOutlined />} onClick={() => setShowTips(!showTips)} className="tips-toggle-button">
              填写提示 {showTips ? <CaretDownOutlined /> : <CaretDownOutlined rotate={-90} />}
            </Button>
          </div>

          {showTips && (
            <Card size="small" className="tips-card" style={{ marginBottom: 24, background: '#fafafa' }}>
              <div className="tips-header" style={{ color: '#1f3a60', fontWeight: 'bold', marginBottom: 12 }}>填写注意事项</div>
              <div className="tips-content">
                {TIPS_CONTENT.map((tip, index) => (
                  <div key={index} className="tip-item" style={{ marginBottom: '12px' }}>
                    <strong style={{ color: '#1f3a60', display: 'block' }}>{tip.title}:</strong>
                    <span style={{ color: '#595959', lineHeight: '1.6' }}>{tip.content}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* 导入导出工具栏 */}
          <div className="import-export-toolbar" style={{ marginBottom: 16, textAlign: 'center' }}>
            <Space>
              <Button icon={<FileWordOutlined />} onClick={handleExportDOCX}>
                导出 DOCX
              </Button>
              <Button
                icon={<ImportOutlined />}
                loading={importLoading}
                onClick={() => fileInputRef.current?.click()}
              >
                导入文件
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImportFile(file);
                }}
              />
            </Space>
          </div>

          <div className="content-wrapper">
            <Card className="questionnaire-card">
              <Form form={form} layout="vertical" className="questionnaire-form" validateTrigger="onSubmit">
                <Row gutter={24}>
                  <Col xs={24}>
                    {(isFieldEnabled('name') || isFieldEnabled('student_id') || isFieldEnabled('gender') ||
                      isFieldEnabled('grade') || isFieldEnabled('major') || isFieldEnabled('email') ||
                      isFieldEnabled('phone') || isFieldEnabled('github') || isFieldEnabled('personal_photo')) && (
                      <FormSection title="基本信息" icon={<IdcardOutlined />}>
                        <Row gutter={24}>
                          <Col xs={24} md={isFieldEnabled('personal_photo') ? 16 : 24}>
                            <Row gutter={16}>
                              {isFieldEnabled('name') && (
                                <Col xs={24} md={12}>
                                  <TextInputField label={getFieldLabel('name', '姓名')} name="name" placeholder={getFieldPlaceholder('name', '请输入您的姓名')} value={getFieldValue('name')} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange('name', e.target.value)} disabled={!canEdit} required={isFieldRequired('name')} className="compact-input" />
                                </Col>
                              )}
                              {isFieldEnabled('student_id') && (
                                <Col xs={24} md={12}>
                                  <TextInputField label={getFieldLabel('student_id', '学号')} name="student_id" placeholder={getFieldPlaceholder('student_id', '请输入您的学号')} value={getFieldValue('student_id')} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange('student_id', e.target.value)} disabled={!canEdit} required={isFieldRequired('student_id')} className="compact-input" />
                                </Col>
                              )}
                            </Row>
                            <Row gutter={16}>
                              {isFieldEnabled('gender') && (
                                <Col xs={24} md={12}>
                                  <RadioGroupField label={getFieldLabel('gender', '性别')} name="gender" value={getFieldValue('gender')} onChange={(e: any) => handleFieldChange('gender', e.target.value)} options={genderOptions} disabled={!canEdit} required={isFieldRequired('gender')} />
                                </Col>
                              )}
                              {isFieldEnabled('grade') && (
                                <Col xs={24} md={12}>
                                  <SelectField label={getFieldLabel('grade', '年级')} name="grade" placeholder={getFieldPlaceholder('grade', '请选择年级')} value={getFieldValue('grade')} onChange={(value: string) => handleFieldChange('grade', value)} options={gradeOptions} disabled={!canEdit} required={isFieldRequired('grade')} className="compact-input" />
                                </Col>
                              )}
                            </Row>
                            <Row gutter={16}>
                              {isFieldEnabled('major') && (
                                <Col xs={24} md={12}>
                                  <TextInputField label={getFieldLabel('major', '专业')} name="major" placeholder={getFieldPlaceholder('major', '请输入您的专业')} value={getFieldValue('major')} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange('major', e.target.value)} disabled={!canEdit} required={isFieldRequired('major')} className="compact-input" />
                                </Col>
                              )}
                              {isFieldEnabled('email') && (
                                <Col xs={24} md={12}>
                                  <TextInputField label={getFieldLabel('email', '邮箱')} name="email" placeholder={getFieldPlaceholder('email', '请输入您的邮箱')} value={getFieldValue('email')} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange('email', e.target.value)} disabled={!canEdit} required={isFieldRequired('email')} className="compact-input" />
                                </Col>
                              )}
                            </Row>
                            <Row gutter={16}>
                              {isFieldEnabled('phone') && (
                                <Col xs={24} md={12}>
                                  <TextInputField label={getFieldLabel('phone', '手机号')} name="phone" placeholder={getFieldPlaceholder('phone', '请输入您的手机号')} value={getFieldValue('phone')} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange('phone', e.target.value)} disabled={!canEdit} required={isFieldRequired('phone')} className="compact-input" />
                                </Col>
                              )}
                              {isFieldEnabled('github') && (
                                <Col xs={24} md={12}>
                                  <TextInputField label={getFieldLabel('github', 'GitHub主页')} name="github" placeholder={getFieldPlaceholder('github', '请输入您的GitHub主页（选填）')} value={getFieldValue('github')} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange('github', e.target.value)} disabled={!canEdit} required={isFieldRequired('github')} className="compact-input" />
                                </Col>
                              )}
                            </Row>
                          </Col>
                          {isFieldEnabled('personal_photo') && (
                            <Col xs={24} md={8}>
                              <div className="photo-container">
                                <PhotoUpload photoBase64={photoBase64} onUpload={handlePhotoUpload} isCompressing={isPhotoCompressing} disabled={!canEdit} required={isFieldRequired('personal_photo')} label={getFieldLabel('personal_photo', '个人照片')} />
                              </div>
                            </Col>
                          )}
                        </Row>
                      </FormSection>
                    )}

                    {/* 志愿信息模块 */}
                    <FormSection title="志愿选择" icon={<TeamOutlined />}>
                      {intentLocked && (
                        <Alert
                          type="warning"
                          showIcon
                          style={{ marginBottom: 12 }}
                          message="面试已安排，志愿与可面试时间已锁定"
                          description="面试官将按当前安排等你。如需调整时间或部门，请到「申请中心」提交改期申请，不要在这里修改。"
                        />
                      )}
                      <Row gutter={16}>
                        <Col xs={24} md={12}>
                          <SelectField
                            label="第一志愿部门"
                            name="first_department"
                            placeholder="请选择第一志愿部门"
                            value={departments.first}
                            onChange={(value: string) => handleDepartmentChange('first', value)}
                            options={firstDeptOptions}
                            disabled={!canEdit || intentLocked}
                            required
                            className="compact-input"
                          />
                        </Col>
                        <Col xs={24} md={12}>
                          <SelectField
                            label="第二志愿部门"
                            name="second_department"
                            placeholder="请选择第二志愿部门（选填）"
                            value={departments.second}
                            onChange={(value: string) => handleDepartmentChange('second', value)}
                            options={secondDeptOptions}
                            disabled={!canEdit || intentLocked}
                            disabledOptions={disabledSecondDepts}
                            className="compact-input"
                          />
                        </Col>
                      </Row>
                    </FormSection>

                    {(isFieldEnabled('self_introduction') || isFieldEnabled('reason')) && (
                      <FormSection title="自我介绍" icon={<CommentOutlined />}>
                        {isFieldEnabled('self_introduction') && (
                          <TextAreaField label={getFieldLabel('self_introduction', '自我介绍')} name="self_introduction" placeholder={getFieldPlaceholder('self_introduction', '请介绍一下您的个人特点、兴趣爱好、技能特长等...')} value={getFieldValue('self_introduction')} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleFieldChange('self_introduction', e.target.value)} disabled={!canEdit} required={isFieldRequired('self_introduction')} rows={4} />
                        )}
                        {isFieldEnabled('reason') && (
                          <TextAreaField label={getFieldLabel('reason', '加入理由')} name="reason" placeholder={getFieldPlaceholder('reason', '为什么想加入我们社团？您期望获得什么？...')} value={getFieldValue('reason')} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleFieldChange('reason', e.target.value)} disabled={!canEdit} required={isFieldRequired('reason')} rows={4} />
                        )}
                      </FormSection>
                    )}

                    {(isFieldEnabled('tech_stack') || isFieldEnabled('project_experience')) && (
                      <FormSection title="技术能力" icon={<CodeOutlined />}>
                        {isFieldEnabled('tech_stack') && (
                          <Form.Item label={getFieldLabel('tech_stack', '技术栈')} name="tech_stack" required={isFieldRequired('tech_stack')}>
                            <TechStackInput items={techStackItems} onChange={handleTechStackChange} onAdd={addTechStackItem} onRemove={removeTechStackItem} disabled={!canEdit} placeholder={getFieldPlaceholder('tech_stack', '请输入技术栈')} />
                          </Form.Item>
                        )}
                        {isFieldEnabled('project_experience') && (
                          <TextAreaField label={getFieldLabel('project_experience', '项目经验')} name="project_experience" placeholder={getFieldPlaceholder('project_experience', '请描述您参与过的项目，包括项目角色、使用的技术、取得的成果等...')} value={getFieldValue('project_experience')} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleFieldChange('project_experience', e.target.value)} disabled={!canEdit} required={isFieldRequired('project_experience')} rows={4} />
                        )}
                      </FormSection>
                    )}

                    {/* ── 面试意向（方案二：随简历一次提交）── */}
                    <Card
                      size="small"
                      title="面试意向"
                      style={{ marginTop: 8, marginBottom: 20 }}
                    >
                      <Text type="secondary" style={{ display: 'block', marginBottom: 10 }}>
                        志愿部门取自上方「期望部门」的选择；请勾选你<b>能到场</b>的面试时间（可多选，选得越多越容易被安排到合适场次）。
                      </Text>
                      {openSlots.length === 0 ? (
                        <Alert type="info" showIcon message="面试时间尚未开放，提交简历后可回到本页补填面试意向" />
                      ) : (
                        <Space direction="vertical" size={4}>
                          {openSlots.map((s) => (
                            <label key={s.timeSlotId} style={{ cursor: (canEdit && !intentLocked) ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 8 }}>
                              <input
                                type="checkbox"
                                disabled={!canEdit || intentLocked}
                                checked={selectedSlotIds.includes(s.timeSlotId)}
                                onChange={(e) => {
                                  setSelectedSlotIds((prev) =>
                                    e.target.checked
                                      ? [...prev, s.timeSlotId]
                                      : prev.filter((id) => id !== s.timeSlotId));
                                }}
                              />
                              <span>{s.slotName}（{s.interviewDate} {String(s.startTime).slice(0, 5)}-{String(s.endTime).slice(0, 5)}）</span>
                            </label>
                          ))}
                        </Space>
                      )}
                    </Card>

                    <div className="form-actions">
                      <Space>
                        {!isSubmitted && (
                          <Button icon={<SaveOutlined />} loading={savingDraft} onClick={handleSaveDraft} size="large">
                            保存草稿
                          </Button>
                        )}
                        <Button type="primary" icon={isSubmitted ? <EditOutlined /> : <SendOutlined />} loading={submitting || updating} onClick={() => setShowSubmitConfirm(true)} size="large">
                          {isSubmitted ? '更新简历' : '提交申请'}
                        </Button>
                        {isSubmitted && (
                          <Button icon={<EyeOutlined />} onClick={handleCancelEdit} size="large">取消修改</Button>
                        )}
                      </Space>
                    </div>
                  </Col>
                </Row>
              </Form>
            </Card>
          </div>

          {/* 面试意向已并入上方表单（方案二），原独立预约面板移除 */}
          </>
          )}
        </div>
      )}

      {/* 导入预览弹窗 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <ImportOutlined style={{ color: '#1890ff', marginRight: '8px' }} />
            导入预览 - 请确认提取的信息
          </div>
        }
        open={importModalOpen}
        onOk={handleConfirmImport}
        onCancel={handleCancelImport}
        okText="确认导入"
        cancelText="取消"
        width={640}
      >
        {extractedFields && (
          <div>
            {hasAnyExtractedField(extractedFields) ? (
              <>
                <Alert
                  message="以下信息从文件中自动提取，请核对后确认导入"
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
                <Table
                  dataSource={[
                    { label: '姓名', value: extractedFields.name },
                    { label: '学号', value: extractedFields.student_id },
                    { label: '性别', value: extractedFields.gender },
                    { label: '年级', value: extractedFields.grade },
                    { label: '专业', value: extractedFields.major },
                    { label: '邮箱', value: extractedFields.email },
                    { label: '手机号', value: extractedFields.phone },
                    { label: 'GitHub', value: extractedFields.github },
                    { label: '自我介绍', value: extractedFields.self_introduction },
                    { label: '加入理由', value: extractedFields.reason },
                    { label: '技术栈', value: extractedFields.tech_stack },
                    { label: '项目经验', value: extractedFields.project_experience },
                  ].filter((row) => row.value && String(row.value).trim())}
                  columns={[
                    {
                      title: '字段',
                      dataIndex: 'label',
                      key: 'label',
                      width: 100,
                      render: (text: string) => <Text strong>{text}</Text>,
                    },
                    {
                      title: '提取内容',
                      dataIndex: 'value',
                      key: 'value',
                      render: (text: string) => (
                        <Text
                          style={{
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                        >
                          {text}
                        </Text>
                      ),
                    },
                  ]}
                  pagination={false}
                  size="small"
                  rowKey="label"
                />
              </>
            ) : (
              <Alert
                message="未能从文件中提取到有效信息"
                description="请确认文件包含可识别的文本内容（非扫描图片），并包含姓名、邮箱、手机号等关键字段。"
                type="warning"
                showIcon
              />
            )}
          </div>
        )}
      </Modal>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {isSubmitted ? <EditOutlined style={{ color: '#1890ff', marginRight: '8px' }} /> : <SendOutlined style={{ color: '#1890ff', marginRight: '8px' }} />}
            {isSubmitted ? '确认更新简历' : '确认提交申请'}
          </div>
        }
        open={showSubmitConfirm}
        onOk={isSubmitted ? handleUpdateResume : handleSubmit}
        onCancel={() => setShowSubmitConfirm(false)}
        okText={isSubmitted ? '确认更新' : '确认提交'}
        cancelText="再检查一下"
        confirmLoading={submitting || updating}
        className="submit-confirm-modal"
        width={500}
      >
        <div className="modal-content">
          <p style={{ color: '#333', marginBottom: '20px', lineHeight: '1.6', fontSize: '14px' }}>
            {isSubmitted ? '您即将更新简历信息，更新后的信息将用于后续流程。' : '您即将提交申请，提交后可以继续修改直到审核开始。'}
          </p>
          <div style={{ backgroundColor: '#fafafa', border: '1px solid #e8e8e8', borderRadius: '6px', padding: '16px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', color: '#262626' }}>
              <ExclamationCircleOutlined style={{ color: '#faad14', marginRight: '8px' }} />
              <span style={{ fontWeight: '500' }}>重要提醒</span>
            </div>
            <div style={{ color: '#595959', fontSize: '13px', lineHeight: '1.6' }}>
              <div style={{ marginBottom: '6px' }}>• 请确保填写的信息真实有效</div>
              <div style={{ marginBottom: '6px' }}>• 核对联系方式是否正确</div>
              <div style={{ marginBottom: '6px' }}>• 确认照片清晰可辨认</div>
              <div style={{ marginBottom: '6px' }}>• 技术能力和项目经验如实反映</div>
              {!isSubmitted && <div>• 提交后仍可修改，直到审核开始</div>}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Publish;
