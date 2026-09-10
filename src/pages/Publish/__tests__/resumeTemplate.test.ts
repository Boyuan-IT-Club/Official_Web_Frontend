import {
  exportMetaOf, fieldTypeHint, normalizeTemplateFields,
} from '../resumeTemplate';

const RAW = [
  // 表单里不渲染的两类，模板也不该列出来（用户实际撞到：一屏里出现了
  // 第一志愿、第二志愿、期望部门三栏，看着像要填三遍）
  { fieldId: 20, fieldKey: 'expected_departments', fieldLabel: '期望部门', fieldType: 'select', sortOrder: 4, isActive: true },
  { fieldId: 21, fieldKey: 'expected_interview_time', fieldLabel: '第一面试时间', fieldType: 'select', sortOrder: 5, isActive: true },
  { fieldId: 3, fieldKey: 'intro', fieldLabel: '个人简介', fieldType: 'textarea', isRequired: true, sortOrder: 2, isActive: true },
  { fieldId: 1, fieldKey: 'name', fieldLabel: '姓名', fieldType: 'input', isRequired: true, sortOrder: 0, isActive: true, placeholder: '请填写真实姓名' },
  { fieldId: 9, fieldKey: 'gone', fieldLabel: '已停用字段', fieldType: 'input', sortOrder: 1, isActive: false },
  { fieldId: 5, fieldKey: 'dept', fieldLabel: '意愿部门', fieldType: 'checkbox', sortOrder: 3, isActive: true, options: ['技术部', '媒体部'] },
];

describe('简历模板整理', () => {
  it('剔除表单里不渲染的字段：期望部门由志愿合成、面试时间归意向卡管', () => {
    const labels = normalizeTemplateFields(RAW).map((f) => f.label);
    expect(labels).not.toContain('期望部门');
    expect(labels).not.toContain('第一面试时间');
  });

  it('按 sortOrder 排序，并剔除已停用字段', () => {
    const fields = normalizeTemplateFields(RAW);
    expect(fields.map((f) => f.label)).toEqual(['姓名', '个人简介', '意愿部门']);
  });

  it('保留必填标记、选项与占位提示', () => {
    const [name, , dept] = normalizeTemplateFields(RAW);
    expect(name.required).toBe(true);
    expect(name.placeholder).toBe('请填写真实姓名');
    expect(dept.options).toEqual(['技术部', '媒体部']);
  });

  it('老数据里逗号分隔的 options 也认', () => {
    const [f] = normalizeTemplateFields([
      { fieldLabel: '年级', fieldType: 'select', options: '大一, 大二 ,大三', isActive: true },
    ]);
    expect(f.options).toEqual(['大一', '大二', '大三']);
  });

  it('空输入不炸', () => {
    expect(normalizeTemplateFields(null)).toEqual([]);
    expect(normalizeTemplateFields([{ fieldLabel: '' }])).toEqual([]);
  });

  it('填写方式说明带上选项', () => {
    expect(fieldTypeHint('radio', ['是', '否'])).toBe('单选：是 / 否');
    expect(fieldTypeHint('textarea', [])).toBe('多行文本');
    expect(fieldTypeHint('unknown', [])).toBe('单行文本');
  });

  it('导出用的标签表跟着管理员配置走，停用字段标记为 false', () => {
    const meta = exportMetaOf(RAW);
    expect(meta.labelOf.intro).toBe('个人简介');
    expect(meta.enabledOf.gone).toBe(false);
    expect(meta.enabledOf.name).toBe(true);
  });
});
