// 简历字段的单一真相源。
//
// 在这之前，四个视图各自维护一套顺序：
//   ① 字段配置抽屉  —— 读 DB 的 sort_order
//   ② 简历查看视图  —— 自己的 BASIC_KEYS / LONG_KEYS 数组
//   ③ 投递表单      —— 整块写死的 JSX，顺序即代码顺序
//   ④ PDF/Word 导出 —— 又一套章节结构
// 结果就是同一份简历在四个地方的字段顺序都不一样。
//
// 这张表定义「规范顺序」与「每个字段该用什么控件渲染」，四处共同消费它。
// 周期级的 sort_order 仍然优先（管理员拖拽的结果要生效），本表只在
// 后端没给顺序时兜底，并提供分组、控件类型这些 DB 里没有的信息。

/** 表单分区。与 FIELD_KEY_CATEGORY_MAP 的取值保持一致 */
export const enum FieldCategory {
  Basic = 1,
  Statement = 2,
  Preference = 3,
  Interview = 4,
  Skill = 5,
  /**
   * 规范表里没有的字段（管理员自己加的）归到这里，而不是并进基本信息。
   * 数字取大是为了让它排在所有已知分区之后——自定义问题跟在标准字段后面，
   * 混进「基本信息」里会读着莫名其妙（「实验室经历」跟在学号后面）。
   */
  Custom = 9,
}

export const CATEGORY_LABEL: Record<number, string> = {
  [FieldCategory.Basic]: '基本信息',
  [FieldCategory.Statement]: '个人陈述',
  [FieldCategory.Preference]: '志愿选择',
  [FieldCategory.Interview]: '面试安排',
  [FieldCategory.Skill]: '技术能力',
  [FieldCategory.Custom]: '其他信息',
};

/**
 * 控件类型。
 *
 * 普通类型直接由 fieldType 决定；custom 表示这个字段有专属控件
 * （照片上传、技术栈重复输入、志愿联动下拉…），数据驱动渲染时按 key 分派。
 */
export type FieldWidget =
  | 'text' | 'textarea' | 'select' | 'radio' | 'checkbox'
  | 'photo' | 'techStack' | 'department' | 'interviewTime';

export interface FieldSpec {
  key: string;
  /** 默认展示名。后端有 fieldLabel 时以后端为准 */
  label: string;
  category: FieldCategory;
  /** 规范顺序（后端 sort_order 优先） */
  order: number;
  widget: FieldWidget;
  /** 在投递表单里渲染吗。false = 仅存在于数据/导出，如已废弃的字段 */
  inForm: boolean;
  /** 在查看视图与导出里显示吗 */
  inView: boolean;
  /** 长文本：查看与导出里独占一整块而不是并排的键值对 */
  longText?: boolean;
}

/**
 * 规范字段表。顺序即四处共同的展示顺序。
 *
 * expected_interview_time（第一面试时间）已废弃：方案B 改用「可接受时间窗」
 * 多选，这个字段只为兼容历史数据保留，不在任何界面出现。
 */
export const RESUME_FIELDS: FieldSpec[] = [
  { key: 'name',              label: '姓名',      category: FieldCategory.Basic,      order: 1,  widget: 'text',     inForm: true,  inView: true },
  { key: 'student_id',        label: '学号',      category: FieldCategory.Basic,      order: 2,  widget: 'text',     inForm: true,  inView: true },
  { key: 'gender',            label: '性别',      category: FieldCategory.Basic,      order: 3,  widget: 'radio',    inForm: true,  inView: true },
  { key: 'grade',             label: '年级',      category: FieldCategory.Basic,      order: 4,  widget: 'select',   inForm: true,  inView: true },
  { key: 'major',             label: '专业',      category: FieldCategory.Basic,      order: 5,  widget: 'text',     inForm: true,  inView: true },
  { key: 'email',             label: '邮箱',      category: FieldCategory.Basic,      order: 6,  widget: 'text',     inForm: true,  inView: true },
  { key: 'phone',             label: '手机号',    category: FieldCategory.Basic,      order: 7,  widget: 'text',     inForm: true,  inView: true },
  { key: 'github',            label: 'GitHub主页', category: FieldCategory.Basic,     order: 8,  widget: 'text',     inForm: true,  inView: true },
  { key: 'personal_photo',    label: '个人照片',  category: FieldCategory.Basic,      order: 9,  widget: 'photo',    inForm: true,  inView: true },

  { key: 'self_introduction', label: '自我介绍',  category: FieldCategory.Statement,  order: 10, widget: 'textarea', inForm: true,  inView: true, longText: true },
  { key: 'reason',            label: '加入理由',  category: FieldCategory.Statement,  order: 11, widget: 'textarea', inForm: true,  inView: true, longText: true },
  { key: 'introduction',      label: '个人简介',  category: FieldCategory.Statement,  order: 12, widget: 'textarea', inForm: true,  inView: true, longText: true },

  { key: 'first_choice',      label: '第一志愿',  category: FieldCategory.Preference, order: 13, widget: 'department', inForm: true, inView: true },
  { key: 'second_choice',     label: '第二志愿',  category: FieldCategory.Preference, order: 14, widget: 'department', inForm: true, inView: true },
  { key: 'expected_departments', label: '期望部门', category: FieldCategory.Preference, order: 15, widget: 'select', inForm: false, inView: true },

  { key: 'can_attend_offline_interview', label: '能否参加线下面试', category: FieldCategory.Interview, order: 16, widget: 'radio', inForm: true, inView: true },
  { key: 'expected_interview_time',      label: '第一面试时间',     category: FieldCategory.Interview, order: 17, widget: 'interviewTime', inForm: false, inView: false },
  { key: 'second_interview_time',        label: '第二面试时间',     category: FieldCategory.Interview, order: 18, widget: 'select', inForm: false, inView: true },

  { key: 'tech_stack',        label: '技术栈',    category: FieldCategory.Skill, order: 19, widget: 'techStack', inForm: true, inView: true },
  { key: 'project_experience', label: '项目经验', category: FieldCategory.Skill, order: 20, widget: 'textarea',  inForm: true, inView: true, longText: true },
];

const BY_KEY: Record<string, FieldSpec> = Object.fromEntries(
  RESUME_FIELDS.map((f) => [f.key, f]),
);

export const specOf = (key: string): FieldSpec | undefined => BY_KEY[key];

/** 规范顺序里的位次；表里没有的字段排到最后（自定义字段） */
export const orderOf = (key: string): number => BY_KEY[key]?.order ?? 9999;

/**
 * 按规范顺序排列任意一组字段。
 *
 * 优先用后端给的 sortOrder（管理员拖拽的结果），没有才回落到本表 ——
 * 否则管理员在配置里排好的顺序会被前端的写死顺序盖掉。
 */
export function sortByCanonicalOrder<T extends { fieldKey?: string; sortOrder?: number | null }>(
  fields: T[],
): T[] {
  return [...fields].sort((a, b) => {
    const ao = a.sortOrder ?? orderOf(a.fieldKey ?? '');
    const bo = b.sortOrder ?? orderOf(b.fieldKey ?? '');
    if (ao !== bo) return ao - bo;
    // 同序号时按规范表兜底，保证顺序稳定（历史数据里出现过重复 sortOrder）
    return orderOf(a.fieldKey ?? '') - orderOf(b.fieldKey ?? '');
  });
}

/** 分组后的字段，按分区顺序返回；空分区不返回 */
export function groupByCategory<T extends { fieldKey?: string; sortOrder?: number | null }>(
  fields: T[],
): Array<{ category: number; label: string; fields: T[] }> {
  const sorted = sortByCanonicalOrder(fields);
  const buckets = new Map<number, T[]>();
  sorted.forEach((f) => {
    const cat = specOf(f.fieldKey ?? '')?.category ?? FieldCategory.Custom;
    if (!buckets.has(cat)) buckets.set(cat, []);
    buckets.get(cat)!.push(f);
  });
  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([category, list]) => ({
      category,
      label: CATEGORY_LABEL[category] ?? `分区 ${category}`,
      fields: list,
    }));
}
