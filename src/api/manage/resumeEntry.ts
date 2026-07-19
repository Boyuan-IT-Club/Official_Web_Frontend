// src/api/manage/resumeEntry.ts

import { request } from '@/utils/request';

/**
 * ✅ 后端字段类型（与接口 JSON 一致）
 */
export interface BackendResumeField {
  fieldId?: number;
  cycleId: number;
  fieldKey: string;
  fieldLabel: string;
  fieldType: string;
  placeholder?: string;
  isRequired: boolean;
  sortOrder: number;
  isActive: boolean;
  /** select / radio / checkbox 的选项列表 */
  options?: string[];
}

/**
 * ✅ 前端 UI 类型（可以扩展）
 * ❗ 不参与后端提交
 */
/** 后端支持的 fieldType（与接口文档一致） */
export type BackendFieldType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'file';

/** 前端表单用类型（兼容历史 input/custom） */
export type ResumeFieldType = BackendFieldType | 'input' | 'custom';

/** 已废弃字段，批量保存时过滤（面试预约走独立接口） */
export const DEPRECATED_RESUME_FIELD_KEYS = [
  'expected_interview_time',
] as const;

export interface ResumeFieldUI extends Omit<BackendResumeField, 'fieldType'> {
  fieldId: number;
  fieldType?: ResumeFieldType;
  options?: string[];
  category: number;
}

/** fieldKey → 表单分类（后端无 category 时用于 UI 分组） */
export const FIELD_KEY_CATEGORY_MAP: Record<string, number> = {
  name: 1,
  student_id: 1,
  gender: 1,
  grade: 1,
  major: 1,
  email: 1,
  phone: 1,
  github: 1,
  personal_photo: 1,
  self_introduction: 2,
  introduction: 2,
  reason: 2,
  first_choice: 3,
  second_choice: 3,
  first_department: 3,
  second_department: 3,
  expected_departments: 3,
  can_attend_offline_interview: 4,
  can_attend_interview: 4,
  expected_interview_time: 4,
  second_interview_time: 4,
  first_interview_time: 4,
  tech_stack: 5,
  project_experience: 5,
};

/** 当前招新周期（与后端、默认配置保持一致） */
export const RESUME_CYCLE_ID = 2;

export const DEFAULT_FIELD_TYPE: BackendFieldType = 'text';

/** 后端 fieldType 别名 → 前端表单枚举 */
const FIELD_TYPE_ALIASES: Record<string, BackendFieldType> = {
  input: 'text',
  text: 'text',
  文本框: 'text',
  单行输入: 'text',
  单行文本: 'text',
  textarea: 'textarea',
  多行文本: 'textarea',
  select: 'select',
  下拉选择: 'select',
  radio: 'radio',
  单选: 'radio',
  checkbox: 'checkbox',
  多选: 'checkbox',
  file: 'file',
  flie: 'file',
  文件上传: 'file',
  custom: 'text',
  自定义: 'text',
};

export const normalizeFieldType = (raw?: string): BackendFieldType =>
  FIELD_TYPE_ALIASES[raw ?? ''] ??
  FIELD_TYPE_ALIASES[String(raw ?? '').toLowerCase()] ??
  DEFAULT_FIELD_TYPE;

/** UI/历史值 → 提交给后端的 fieldType */
export const toBackendFieldType = (raw?: string): BackendFieldType =>
  normalizeFieldType(raw);

/**
 * 解析 GET 字段列表响应（兼容多种后端包装）
 */
export const unwrapResumeFieldsResponse = (res: unknown): BackendResumeField[] => {
  if (!res) return [];
  if (Array.isArray(res)) return res as BackendResumeField[];

  const body = res as Record<string, unknown>;
  if (typeof body.code === 'number' && body.code !== 0 && body.code !== 200) {
    throw new Error(String(body.message || '获取简历字段失败'));
  }

  if (Array.isArray(body.data)) return body.data as BackendResumeField[];
  if (body.data && typeof body.data === 'object') {
    const nested = body.data as Record<string, unknown>;
    if (Array.isArray(nested.fields)) return nested.fields as BackendResumeField[];
    if (Array.isArray(nested.list)) return nested.list as BackendResumeField[];
    if (Array.isArray(nested.content)) return nested.content as BackendResumeField[];
  }
  if (Array.isArray(body.fields)) return body.fields as BackendResumeField[];

  return [];
};

/** 需要配置选项的字段类型 */
export const FIELD_TYPES_WITH_OPTIONS: BackendFieldType[] = [
  'select',
  'radio',
  'checkbox',
];

export const fieldTypeNeedsOptions = (fieldType?: string): boolean =>
  FIELD_TYPES_WITH_OPTIONS.includes(normalizeFieldType(fieldType));

export const parseFieldOptions = (raw: unknown): string[] => {
  if (Array.isArray(raw)) {
    return raw.map(String).map((s) => s.trim()).filter(Boolean);
  }
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(String).map((s) => s.trim()).filter(Boolean);
      }
    } catch {
      return raw.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
};

export const FIELD_TYPE_OPTIONS: { value: BackendFieldType; label: string }[] = [
  { value: 'text', label: '单行文本' },
  { value: 'textarea', label: '多行文本' },
  { value: 'select', label: '下拉选择' },
  { value: 'radio', label: '单选' },
  { value: 'checkbox', label: '多选' },
  { value: 'file', label: '文件上传' },
];

/**
 * 默认字段
 */
export const DEFAULT_RESUME_FIELDS: ResumeFieldUI[] = [
  // ==================== 分类1：基本信息 ====================
  {
    fieldId: 1,
    cycleId: 2,
    fieldKey: "name",
    fieldLabel: "姓名",
    isRequired: true,
    sortOrder: 1,
    isActive: true,
    fieldType: "text",
    placeholder: "请输入您的姓名",
    category: 1, // 基本信息
  },
  {
    fieldId: 2,
    cycleId: 2,
    fieldKey: "student_id",
    fieldLabel: "学号",
    isRequired: true,
    sortOrder: 2,
    isActive: true,
    fieldType: "text",
    placeholder: "请输入您的学号",
    category: 1, // 基本信息
  },
  {
    fieldId: 3,
    cycleId: 2,
    fieldKey: "gender",
    fieldLabel: "性别",
    isRequired: true,
    sortOrder: 3,
    isActive: true,
    fieldType: "radio",
    options: ["男", "女"],
    category: 1, // 基本信息
  },
  {
    fieldId: 4,
    cycleId: 2,
    fieldKey: "grade",
    fieldLabel: "年级",
    isRequired: true,
    sortOrder: 4,
    isActive: true,
    fieldType: "select",
    options: ["大一", "大二", "大三", "大四"],
    category: 1, // 基本信息
  },
  {
    fieldId: 5,
    cycleId: 2,
    fieldKey: "major",
    fieldLabel: "专业",
    isRequired: true,
    sortOrder: 5,
    isActive: true,
    fieldType: "text",
    placeholder: "请输入您的专业",
    category: 1, // 基本信息
  },

  {
    fieldId: 6,
    cycleId: 2,
    fieldKey: "email",
    fieldLabel: "邮箱",
    isRequired: true,
    sortOrder: 6,
    isActive: true,
    fieldType: "text",
    placeholder: "请输入您的邮箱",
    category: 1, 
  },
  {
    fieldId: 7,
    cycleId: 2,
    fieldKey: "phone",
    fieldLabel: "手机号",
    isRequired: true,
    sortOrder: 7,
    isActive: true,
    fieldType: "text",
    placeholder: "请输入您的手机号",
    category: 1,
  },
  {
    fieldId: 8,
    cycleId: 2,
    fieldKey: "github",
    fieldLabel: "GitHub主页",
    isRequired: false,
    sortOrder: 8,
    isActive: true,
    fieldType: "text",
    placeholder: "请输入您的GitHub主页（选填）",
    category: 1,
  },

  {
    fieldId: 9,
    cycleId: 2,
    fieldKey: "personal_photo",
    fieldLabel: "个人照片",
    isRequired: false,
    sortOrder: 9,
    isActive: true,
    fieldType: "file",
    placeholder: "请上传您的个人照片（选填）",
    category: 1,
  },

  // ==================== 分类2 :自我介绍====================
  {
    fieldId: 10,
    cycleId: 2,
    fieldKey: "self_introduction",
    fieldLabel: "自我介绍",
    isRequired: true,
    sortOrder: 10,
    isActive: true,
    fieldType: "textarea",
    placeholder: "请介绍一下您的个人特点、兴趣爱好、技能特长等...",
    category: 2,
  },
  {
    fieldId: 11,
    cycleId: 2,
    fieldKey: "reason",
    fieldLabel: "加入理由",
    isRequired: true,
    sortOrder: 11,
    isActive: true,
    fieldType: "textarea",
    placeholder: "为什么想加入我们社团？您期望获得什么？...",
    category: 2,
  },
  {
    fieldId: 17,
    cycleId: 2,
    fieldKey: "introduction",
    fieldLabel: "个人简介",
    isRequired: true,
    sortOrder: 13,
    isActive: true,
    fieldType: "textarea",
    placeholder: "请提供个人简介",
    category: 2,
  },

  // ==================== 分类3：志愿选择 ====================
  {
    fieldId: 12,
    cycleId: 2,
    fieldKey: "first_choice",
    fieldLabel: "第一志愿",
    isRequired: true,
    sortOrder: 12,
    isActive: true,
    fieldType: "select",
    placeholder: "请选择您想加入的第一志愿部门",
    options: ["技术部", "媒体部", "项目部", "综合部"],
    category: 3, // 志愿选择
  },
  {
    fieldId: 13,
    cycleId: 2,
    fieldKey: "second_choice",
    fieldLabel: "第二志愿",
    isRequired: false,
    sortOrder: 13,
    isActive: true,
    fieldType: "select",
    placeholder: "请选择您想加入的第二志愿部门（选填）",
    options: ["无", "技术部", "媒体部", "项目部", "综合部"],
    category: 3, // 志愿选择
  },

  // ==================== 分类4：面试安排 ====================
  {
    fieldId: 14,
    cycleId: 2,
    fieldKey: "can_attend_offline_interview",
    fieldLabel: "能否参加线下面试",
    isRequired: true,
    sortOrder: 14,
    isActive: true,
    fieldType: "radio",
    options: ["能参加", "不能参加"],
    category: 4, // 面试安排
  },
  {
    fieldId: 15,
    cycleId: 2,
    fieldKey: "expected_interview_time",
    fieldLabel: "第一面试时间",
    isRequired: true,
    sortOrder: 15,
    isActive: true,
    fieldType: "select",
    placeholder: "请选择第一面试时间",
    options: ["Day1 上午", "Day1 下午", "Day1 晚上"],
    category: 4, // 面试安排
  },
  {
    fieldId: 16,
    cycleId: 2,
    fieldKey: "second_interview_time",
    fieldLabel: "第二面试时间",
    isRequired: false,
    sortOrder: 16,
    isActive: true,
    fieldType: "select",
    placeholder: "请选择第二面试时间（选填）",
    options: ["无", "Day1 上午", "Day1 下午", "Day1 晚上"],
    category: 4, // 面试安排
  },

  // ==================== 分类5：技术能力 ====================
  {
    fieldId: 18,
    cycleId: 2,
    fieldKey: "tech_stack",
    fieldLabel: "技术栈",
    isRequired: true,
    sortOrder: 17,
    isActive: true,
    fieldType: "text",
    placeholder: "请输入技术栈",
    category: 5, // 技术能力
  },
  {
    fieldId: 19,
    cycleId: 2,
    fieldKey: "project_experience",
    fieldLabel: "项目经验",
    isRequired: true,
    sortOrder: 18,
    isActive: true,
    fieldType: "textarea",
    placeholder: "请描述您曾参与过的项目，包括项目角色、使用的技术、取得的成果等...",
    category: 5, // 技术能力
  },
];

/**
 * UI → 单条后端字段（新增/更新）
 */
export const toBackendField = (f: ResumeFieldUI): BackendResumeField => {
  const fieldId = Number(f.fieldId) || 0;
  const sortOrder = Number(f.sortOrder) || 0;
  const payload: BackendResumeField = {
    cycleId: Number(f.cycleId) || RESUME_CYCLE_ID,
    fieldKey: String(f.fieldKey || '').trim(),
    fieldLabel: String(f.fieldLabel || '').trim(),
    fieldType: toBackendFieldType(f.fieldType),
    isRequired: Boolean(f.isRequired),
    isActive: f.isActive !== false,
    sortOrder: sortOrder > 0 ? sortOrder : 1,
  };

  const placeholder = String(f.placeholder ?? '').trim();
  if (placeholder) {
    payload.placeholder = placeholder;
  }

  if (fieldId > 0) {
    payload.fieldId = fieldId;
  }

  if (fieldTypeNeedsOptions(payload.fieldType)) {
    const opts = parseFieldOptions(f.options);
    if (opts.length > 0) {
      payload.options = opts;
    }
  }

  return payload;
};

/**
 * 后端 → UI（补全分类与扩展字段）
 */
export const fromBackendField = (
  f: BackendResumeField,
  fallbackCategory = 1,
): ResumeFieldUI => {
  const category =
    FIELD_KEY_CATEGORY_MAP[f.fieldKey] ?? fallbackCategory;

  return {
    fieldId: f.fieldId ?? 0,
    cycleId: f.cycleId,
    fieldKey: f.fieldKey,
    fieldLabel: f.fieldLabel,
    fieldType: normalizeFieldType(f.fieldType),
    placeholder: f.placeholder ?? '',
    isRequired: Boolean(f.isRequired),
    isActive: f.isActive !== false,
    sortOrder: f.sortOrder,
    category,
    options: fieldTypeNeedsOptions(f.fieldType)
      ? parseFieldOptions((f as BackendResumeField).options)
      : undefined,
  };
};

export const fromBackendFields = (fields: BackendResumeField[]): ResumeFieldUI[] =>
  fields
    .filter(
      (f) =>
        !DEPRECATED_RESUME_FIELD_KEYS.includes(
          f.fieldKey as (typeof DEPRECATED_RESUME_FIELD_KEYS)[number],
        ),
    )
    .map((f) => fromBackendField(f));

/**
 * UI → Backend 批量提交
 */
export const toBackendFields = (fields: ResumeFieldUI[]): BackendResumeField[] =>
  fields.map(toBackendField);

/**
 * ✅ 批量更新（仅已存在 fieldId > 0 的字段）
 */
/** 批量更新：请求体为字段数组（PUT /api/resumes/fields/batch） */
export const batchUpdateResumeFields = (fields: ResumeFieldUI[]) => {
  const payload = toBackendFields(
    fields.filter(
      (f) =>
        !DEPRECATED_RESUME_FIELD_KEYS.includes(
          f.fieldKey as (typeof DEPRECATED_RESUME_FIELD_KEYS)[number],
        ),
    ),
  );
  if (payload.length === 0) {
    return Promise.resolve(null);
  }
  return request({
    url: '/api/resumes/fields/batch',
    method: 'put',
    data: payload,
  });
};

/**
 * ✅ 获取字段列表
 */
export const getResumeFields = async (cycleId: number): Promise<BackendResumeField[]> => {
  const res = await request({
    url: `/api/resumes/fields/${cycleId}`,
    method: 'get',
  });
  return unwrapResumeFieldsResponse(res);
};

/**
 * ✅ 初始化字段
 */
export const initResumeFields = (cycleId: number) => {
  const fields = DEFAULT_RESUME_FIELDS.map((f) => ({
    ...f,
    cycleId,
  }));
  return request({
    url: `/api/resumes/fields/${cycleId}/init`,
    method: 'post',
    data: toBackendFields(fields),
  });
};

/**
 * ✅ 单个 CRUD（保持纯后端）
 */
export const createResumeField = (data: Omit<BackendResumeField, 'fieldId'>) => {
  return request({
    url: '/api/resumes/fields',
    method: 'post',
    data,
  });
};

/**
 * 保存全部字段：统一走批量 PUT（新增可省略 fieldId）
 */
export const saveResumeFields = async (fields: ResumeFieldUI[]): Promise<void> => {
  const normalized = fields
    .filter(
      (f) =>
        !DEPRECATED_RESUME_FIELD_KEYS.includes(
          f.fieldKey as (typeof DEPRECATED_RESUME_FIELD_KEYS)[number],
        ),
    )
    .map((f) => ({
      ...f,
      cycleId: Number(f.cycleId) || RESUME_CYCLE_ID,
      fieldId: Number(f.fieldId) || 0,
      fieldType: normalizeFieldType(f.fieldType),
    }));

  if (normalized.length === 0) {
    throw new Error('没有可保存的字段');
  }

  try {
    await batchUpdateResumeFields(normalized);
  } catch (e: any) {
    throw {
      ...e,
      message: `批量更新失败（${normalized.length} 项）: ${e?.message || '系统异常'}`,
    };
  }
};

export const updateResumeField = (fieldId: number, data: Partial<BackendResumeField>) => {
  return request({
    url: `/api/resumes/fields/${fieldId}`,
    method: 'put',
    data,
  });
};

export const deleteResumeField = (fieldId: number) => {
  return request({
    url: `/api/resumes/fields/${fieldId}`,
    method: 'delete',
  });
};