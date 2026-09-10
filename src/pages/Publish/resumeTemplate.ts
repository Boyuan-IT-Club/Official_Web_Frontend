// 简历模板（只读预览 + 导出）的纯逻辑。
//
// 周期还没开始时表单不能填，但同学想提前知道「要准备哪些材料」——尤其是
// 个人简介、项目经验这种要想一会儿的题，开放当天现场憋很吃亏。这里把
// 已配置好的字段定义整理成一份可看、可导出的空白模板。
//
// 抽成纯函数是为了能直接测：字段类型有六七种，选项、必填、占位提示的
// 呈现各不一样，塞在 JSX 里没法验。

import { DEPRECATED_RESUME_FIELD_KEYS } from '@/api/manage/resumeEntry';
import { isFormField } from '@/config/resumeFieldRegistry';

export interface TemplateField {
  key: string;
  label: string;
  type: string;
  required: boolean;
  options: string[];
  placeholder?: string;
}

/** 字段类型 → 给人看的填写方式说明 */
export function fieldTypeHint(type: string, options: string[]): string {
  switch (type) {
    case 'textarea':
      return '多行文本';
    case 'radio':
      return options.length ? `单选：${options.join(' / ')}` : '单选';
    case 'checkbox':
      return options.length ? `多选：${options.join(' / ')}` : '多选';
    case 'select':
      return options.length ? `下拉选择：${options.join(' / ')}` : '下拉选择';
    case 'photo':
    case 'image':
      return '上传图片';
    case 'file':
      return '上传附件';
    case 'date':
      return '选择日期';
    default:
      return '单行文本';
  }
}

/**
 * 把后端的字段定义整理成模板行。
 *
 * 过滤规则必须和投递表单**逐条一致**，否则这份「模板」会列出学生根本
 * 填不到的东西。第一版只按 isActive 过滤，结果「期望部门」（由第一/第二
 * 志愿合成，表单里不单独出现）和「第一/第二面试时间」（方案A 遗留，
 * 时间窗现在由面试意向卡管）都跑了出来，看着像要填三遍志愿。
 *
 * 三条规则，与 Publish 页的 renderableFields 同源：
 *   1. isActive —— 管理员关掉的字段学生看不到
 *   2. 不在 DEPRECATED_RESUME_FIELD_KEYS 里
 *   3. 规范表里 inForm !== false（规范表里没有的 key 是自定义字段，保留）
 *
 * 再按 sortOrder 排序——后端不保证顺序，直接渲染会和真实表单对不上。
 */
export function normalizeTemplateFields(raw: any[] | null | undefined): TemplateField[] {
  return (raw ?? [])
    .filter((f) => f && isFormField(
      String(f.fieldKey ?? f.key ?? ''), f.isActive !== false, DEPRECATED_RESUME_FIELD_KEYS))
    .slice()
    .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0))
    .map((f) => ({
      key: String(f.fieldKey ?? f.key ?? f.fieldId ?? ''),
      label: String(f.fieldLabel ?? f.label ?? ''),
      type: String(f.fieldType ?? f.type ?? 'input'),
      required: Boolean(f.isRequired ?? f.required ?? false),
      // options 后端是 JSON 数组；老数据可能是逗号分隔的字符串
      options: Array.isArray(f.options)
        ? f.options.map((o: any) => String(o))
        : (typeof f.options === 'string' && f.options.trim()
          ? f.options.split(',').map((o: string) => o.trim()).filter(Boolean)
          : []),
      placeholder: f.placeholder ? String(f.placeholder) : undefined,
    }))
    .filter((f) => f.label);
}

/**
 * 空白的导出数据：Word 模板复用简历导出那条路（exportResume.ts）。
 *
 * 一开始这里自己拼了一份 HTML 当 .doc 下载，等于把已经存在的模板又做了一遍，
 * 而且丢掉了它最有用的性质——那份 .docx 的标签是 importResume.ts 认得的，
 * 填完回到投递页导入就能自动回填。自造的 HTML 导不回来。
 */
export function emptyExportData() {
  return {
    name: '', studentId: '', gender: '', grade: '',
    major: '', email: '', phone: '', github: '',
    firstDepartment: '', secondDepartment: '',
    selfIntroduction: '', reason: '', introduction: '',
    techStack: [] as string[], projectExperience: '',
  };
}

/**
 * 从本周期的字段定义推出导出用的标签与启停表。
 *
 * 不传这个，导出的 Word 用的是内置中文标签：管理员改过字段名时，
 * 模板上的题目和真实表单对不上，导入也认不回来。
 */
export function exportMetaOf(raw: any[] | null | undefined) {
  const labelOf: Record<string, string> = {};
  const enabledOf: Record<string, boolean> = {};
  (raw ?? []).forEach((f) => {
    const key = f?.fieldKey ?? f?.field_key;
    if (!key) return;
    const label = f?.fieldLabel ?? f?.field_label;
    if (label) labelOf[key] = String(label);
    // 与表单同一套判定：只看 isActive 的话，Word 模板会多出表单里没有的栏
    enabledOf[key] = isFormField(key, f?.isActive !== false, DEPRECATED_RESUME_FIELD_KEYS);
  });
  return { labelOf, enabledOf };
}
