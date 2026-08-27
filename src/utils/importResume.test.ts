// 导入解析的回归守卫。
//
// 实测踩过的坑：单行标签正则用 \s* 会匹配换行——「GitHub：」为空时，
// 把下一行「第一志愿：项目部」整行吞进 GitHub 字段。这组用例按
// 导出模板（exportResume.ts）的真实文本形态锁定解析行为。
import { extractFieldsFromText } from './importResume';

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
