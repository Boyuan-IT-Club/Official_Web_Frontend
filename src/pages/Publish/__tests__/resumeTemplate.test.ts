import {
  fieldTypeHint, normalizeTemplateFields, templateToHtml,
} from '../resumeTemplate';

const RAW = [
  { fieldId: 3, fieldKey: 'intro', fieldLabel: '个人简介', fieldType: 'textarea', isRequired: true, sortOrder: 2, isActive: true },
  { fieldId: 1, fieldKey: 'name', fieldLabel: '姓名', fieldType: 'input', isRequired: true, sortOrder: 0, isActive: true, placeholder: '请填写真实姓名' },
  { fieldId: 9, fieldKey: 'gone', fieldLabel: '已停用字段', fieldType: 'input', sortOrder: 1, isActive: false },
  { fieldId: 5, fieldKey: 'dept', fieldLabel: '意愿部门', fieldType: 'checkbox', sortOrder: 3, isActive: true, options: ['技术部', '媒体部'] },
];

describe('简历模板整理', () => {
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

  it('导出的 HTML 含标题、必填星号，且转义用户内容', () => {
    const html = templateToHtml('2026 秋招', normalizeTemplateFields([
      { fieldLabel: '<script>x</script>', fieldType: 'input', isRequired: true, isActive: true },
    ]));
    expect(html).toContain('2026 秋招 报名表');
    expect(html).toContain('class="req"');
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
