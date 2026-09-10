// 导入解析的回归守卫。
//
// 实测踩过的坑：单行标签正则用 \s* 会匹配换行——「GitHub：」为空时，
// 把下一行「第一志愿：项目部」整行吞进 GitHub 字段。这组用例按
// 导出模板（exportResume.ts）的真实文本形态锁定解析行为。
import { extractFieldsFromText, hasAnyExtractedField } from './importResume';

/** 模拟 mammoth 对导出 docx 的提取结果（每个单元格/段落一行） */
const EXPORTED_TEXT = [
  '丁华烨',
  '博远信息技术社 · 招新申请简历',
  '本文件可离线填写：在各「标签：」后补全内容并保存……',
  '姓名：丁华烨',
  '学号：10245101480',
  '性别：男',
  '年级：大二',
  '专业：软件工程',
  '邮箱：10245101480@stu.ecnu.edu.cn',
  '手机号：15736888997',
  'GitHub：',                 // ← 空标签：曾把下一行吞进来
  '第一志愿：项目部',
  '第二志愿：技术部',
  '技术栈：java、React',
  '自我介绍：',
  '你好，这是自我介绍',
  '项目经验：',
  '做过官网',
  '加入理由：',
  '想找同伴',
].join('\n');

describe('导入解析', () => {
  const fields = extractFieldsFromText(EXPORTED_TEXT);

  it('空的 GitHub 标签不得吞掉下一行的志愿', () => {
    expect(fields.github).not.toContain('志愿');
    expect(fields.github).not.toContain('项目部');
  });

  it('第一/第二志愿按标签解析', () => {
    expect(fields.first_department).toBe('项目部');
    expect(fields.second_department).toBe('技术部');
  });

  it('基本字段与多行小节各归其位', () => {
    expect(fields.name).toBe('丁华烨');
    expect(fields.student_id).toBe('10245101480');
    expect(fields.phone).toBe('15736888997');
    expect(fields.tech_stack).toContain('java');
    expect(fields.self_introduction).toContain('自我介绍');
    expect(fields.project_experience).toContain('做过官网');
    expect(fields.reason).toContain('想找同伴');
  });

  it('GitHub 有值时正常解析（含「GitHub主页」写法）', () => {
    const withGh = extractFieldsFromText('GitHub主页：https://github.com/x\n第一志愿：技术部');
    expect(withGh.github).toBe('https://github.com/x');
    expect(withGh.first_department).toBe('技术部');
  });
});

describe('管理员改过标签后的导入回环', () => {
  it('认得出用配置标签导出的模板', () => {
    // 导出改用管理员的标签之后，导入若只认内置中文名，
    // 「导出模板 → Word 里填 → 导入回填」这条回环就静默断掉：
    // 文件导得出、填得进去，导入却什么都认不出来。
    const text = [
      '代码仓库：https://github.com/zhangsan',
      '所学方向：软件工程',
    ].join('\n');

    const withMeta = extractFieldsFromText(text, {
      github: '代码仓库',
      major: '所学方向',
    });
    expect(withMeta.github).toBe('https://github.com/zhangsan');
    expect(withMeta.major).toBe('软件工程');

    // 不传配置就认不出来——这正是必须成对传的原因。
    //
    // 反例特意选「所学方向」这种与内置词无重叠的改名：
    //   - GitHub 另有一条按 URL 形状识别的兜底模式，不靠标签也认得出
    //   - 改成「就读专业」这类也不行，内置正则是子串匹配，
    //     「就读专业：」里含「专业：」，照样命中
    // 只有完全换掉用词才真正依赖配置。
    const without = extractFieldsFromText(text);
    expect(without.major).toBe('');
  });

  it('内置标签仍然有效：外部简历与改名前导出的旧模板都要认得', () => {
    const text = '姓名：李四\n手机号：13800000000';
    const fields = extractFieldsFromText(text, { name: '真实姓名' });
    expect(fields.name).toBe('李四');           // 内置模式兜底
    expect(fields.phone).toBe('13800000000');
  });

  it('配置标签优先于内置标签', () => {
    const text = '真实姓名：王五\n姓名：不该被取到';
    const fields = extractFieldsFromText(text, { name: '真实姓名' });
    expect(fields.name).toBe('王五');
  });

  it('标签里含正则元字符也不会炸', () => {
    // 标签是管理员自由填的，不转义就会拼出非法正则
    const fields = extractFieldsFromText('GitHub (主页)：https://x', { github: 'GitHub (主页)' });
    expect(fields.github).toBe('https://x');
  });

  it('标签为空的字段跳过，不生成会吞掉下一行的模式', () => {
    const fields = extractFieldsFromText('姓名：赵六', { github: '' });
    expect(fields.name).toBe('赵六');
  });
});

describe('自定义字段按周期配置动态解析', () => {
  const CUSTOM = [
    { fieldKey: 'portfolio', label: '作品链接' },
    { fieldKey: 'club_exp', label: '社团经历' },
  ];

  it('认得出管理员新加的字段', () => {
    const text = [
      '姓名：李明',
      '学号：10245101480',
      '其他信息：',
      '作品链接：github.com/liming/portfolio',
      '社团经历：大一在学生会宣传部做过海报设计，',
      '也帮系里办过两次活动。',
    ].join('\n');

    const r = extractFieldsFromText(text, {}, CUSTOM);
    expect(r.name).toBe('李明');
    expect(r.custom.portfolio).toBe('github.com/liming/portfolio');
    // 多行的自定义字段要吃到下一个标签为止，不能只截第一行
    expect(r.custom.club_exp).toContain('海报设计');
    expect(r.custom.club_exp).toContain('办过两次活动');
  });

  it('没配自定义字段时行为不变', () => {
    const r = extractFieldsFromText('姓名：李明\n作品链接：xxx');
    expect(r.name).toBe('李明');
    expect(r.custom).toEqual({});
  });

  it('标签里的正则元字符不会炸', () => {
    const r = extractFieldsFromText('C++ 经验（选填）：写过两年',
      {}, [{ fieldKey: 'cpp', label: 'C++ 经验（选填）' }]);
    expect(r.custom.cpp).toBe('写过两年');
  });

  it('只提取到自定义字段也算有内容', () => {
    const r = extractFieldsFromText('作品链接：github.com/x', {}, CUSTOM);
    expect(hasAnyExtractedField(r)).toBe(true);
  });
});
