import { isStudentEmail, studentEmailError } from './studentEmail';

/**
 * 锁住 2026-09 发现的那个缺口：cr@stu.ecnu.edu.cn 后缀合法但前缀不是 11 位学号，
 * 当时能成功发出验证码，直到提交才被后端以「用户名长度」为由拒掉——
 * 报错文不对题，用户根本不知道问题出在邮箱上。
 */
describe('学生邮箱规则', () => {
  it('正常 11 位学号通过', () => {
    expect(studentEmailError('10245101417@stu.ecnu.edu.cn')).toBeNull();
    expect(isStudentEmail('10245101417@stu.ecnu.edu.cn')).toBe(true);
  });

  it('后缀不对 → 提示换学生邮箱', () => {
    expect(studentEmailError('10245101417@qq.com')).toBe('必须使用华东师范大学学生邮箱');
  });

  it('前缀不是数字 → 提示学号必须是数字（就是 cr@ 那个 case）', () => {
    expect(studentEmailError('cr@stu.ecnu.edu.cn')).toBe('学号必须是数字');
  });

  it('位数不对 → 明确说要 11 位，而不是让后端报「用户名长度」', () => {
    expect(studentEmailError('1024510@stu.ecnu.edu.cn')).toBe('请输入11位学号');
    expect(studentEmailError('102451014171@stu.ecnu.edu.cn')).toBe('请输入11位学号');
  });

  it('空值给出可读提示，不抛异常', () => {
    expect(studentEmailError('')).toBe('请输入学号');
    expect(studentEmailError(undefined)).toBe('请输入学号');
    expect(studentEmailError(123)).toBe('请输入学号');
  });

  it('两侧空格不算错——用户从别处粘贴很常见', () => {
    expect(studentEmailError('  10245101417@stu.ecnu.edu.cn  ')).toBeNull();
  });
});
