import { isStudentEmail, normalizeStudentAuthId, studentEmailError } from './studentEmail';

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

describe('账号补后缀（浏览器自动填充用得上）', () => {
  it('裸学号补成完整邮箱 —— 浏览器存的就是这一串', () => {
    expect(normalizeStudentAuthId('10265101480')).toBe('10265101480@stu.ecnu.edu.cn');
  });

  it('已经是完整邮箱就原样返回，不重复补', () => {
    expect(normalizeStudentAuthId('10265101480@stu.ecnu.edu.cn'))
      .toBe('10265101480@stu.ecnu.edu.cn');
  });

  it('前后空白要去掉 —— 自动填充和复制粘贴都常带空格', () => {
    expect(normalizeStudentAuthId('  10265101480  ')).toBe('10265101480@stu.ecnu.edu.cn');
  });

  it('空值返回空串，交给「请输入学号」那条规则去报', () => {
    expect(normalizeStudentAuthId('')).toBe('');
    expect(normalizeStudentAuthId(null)).toBe('');
    expect(normalizeStudentAuthId(undefined)).toBe('');
  });

  it('非纯数字不动它 —— 管理端的 admin、dinghuaye 这类账号不能被补成邮箱', () => {
    expect(normalizeStudentAuthId('dinghuaye')).toBe('dinghuaye');
    expect(normalizeStudentAuthId('admin')).toBe('admin');
  });

  it('补完再校验就能过 —— 这正是自动填充登录失败的修复点', () => {
    expect(studentEmailError('10265101480')).toBe('必须使用华东师范大学学生邮箱');
    expect(studentEmailError(normalizeStudentAuthId('10265101480'))).toBeNull();
  });

  it('位数不对的补完仍然该被拦下', () => {
    expect(studentEmailError(normalizeStudentAuthId('102651'))).toBe('请输入11位学号');
  });
});
