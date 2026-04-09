// src/api/manage/resumeEntry.ts

import { request } from '@/utils/request';

/**
 * ✅ 后端字段类型
 */
export interface BackendResumeField {
  fieldId: number;
  cycleId: number;
  fieldKey: string;
  fieldLabel: string;
  isRequired: boolean;
  sortOrder: number;
  isActive: boolean;
}

/**
 * ✅ 前端 UI 类型（可以扩展）
 * ❗ 不参与后端提交
 */
export interface ResumeFieldUI extends BackendResumeField {
  fieldType?: 'input' | 'textarea' | 'radio' | 'checkbox' | 'select' | 'custom' | 'flie';
  placeholder?: string;
  options?: string[];
  category:number;
}

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
    fieldType: "input",
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
    fieldType: "input",
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
    fieldType: "input",
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
    fieldType: "input",
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
    fieldType: "input",
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
    fieldType: "input",
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
    fieldType: "flie",
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
    fieldId: 17,
    cycleId: 2,
    fieldKey: "tech_stack",
    fieldLabel: "技术栈",
    isRequired: true,
    sortOrder: 17,
    isActive: true,
    fieldType: "input",
    placeholder: "请输入技术栈",
    category: 5, // 技术能力
  },
  {
    fieldId: 18,
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
 * ✅ 工具函数：UI → Backend（核心）
 */
export const toBackendFields = (fields: ResumeFieldUI[]): BackendResumeField[] => {
  return fields.map(f => ({
    fieldId: f.fieldId,
    cycleId: f.cycleId,
    fieldKey: f.fieldKey,
    fieldLabel: f.fieldLabel,
    isRequired: f.isRequired,
    isActive: f.isActive,
    sortOrder: f.sortOrder,
  }));
};

/**
 * ✅ 批量更新
 */
export const batchUpdateResumeFields = (fields: ResumeFieldUI[]) => {
  return request({
    url: '/api/resumes/fields/batch',
    method: 'put',
    data: toBackendFields(fields),
  });
};

/**
 * ✅ 获取字段列表
 */
export const getResumeFields = (cycleId: number) => {
  return request<BackendResumeField[]>({
    url: `/api/resumes/fields/${cycleId}`,
    method: 'get',
  });
};

/**
 * ✅ 初始化字段
 */
export const initResumeFields = (cycleId: number) => {
  return request({
    url: `/api/resumes/fields/${cycleId}/init`,
    method: 'post',
    data: toBackendFields(DEFAULT_RESUME_FIELDS),
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