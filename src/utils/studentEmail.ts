/**
 * 学生邮箱规则的唯一来源。
 *
 * 之前这套规则散在两处、而且两处不一致：表单校验器要求「11 位纯数字学号」，
 * 但发验证码那条路只检查后缀。结果是 cr@stu.ecnu.edu.cn 这种地址能成功收到
 * 验证码（白发一封信），填完才在提交时被拦——而且拦它的还不是学号规则，
 * 是后端的「用户名长度必须在 4-20 个字符之间」，因为用户名取的是邮箱前缀。
 */

export const ECNU_STUDENT_SUFFIX = '@stu.ecnu.edu.cn';

/** 学号位数。ECNU 学号 11 位，注册时用户名直接取这段，所以位数错了后面全错 */
export const STUDENT_ID_LENGTH = 11;

/** 校验不通过时返回给用户看的原因；通过则返回 null */
export const studentEmailError = (value: unknown): string | null => {
  if (!value || typeof value !== 'string') return '请输入学号';

  const email = value.trim();
  if (!email.endsWith(ECNU_STUDENT_SUFFIX)) {
    return '必须使用华东师范大学学生邮箱';
  }

  const id = email.slice(0, -ECNU_STUDENT_SUFFIX.length);
  if (!/^\d+$/.test(id)) return '学号必须是数字';
  if (id.length !== STUDENT_ID_LENGTH) return `请输入${STUDENT_ID_LENGTH}位学号`;

  return null;
};

export const isStudentEmail = (value: unknown): boolean => studentEmailError(value) === null;

/**
 * 宽松版：只要求 ECNU 学生邮箱后缀，不管前缀是不是 11 位学号。
 * 管理端专用——那边存在 admin、dinghuaye 这类历史非学号账号，
 * 拿严格规则去卡会把他们挡在验证码登录和找回密码之外。
 */
export const ecnuSuffixError = (value: unknown): string | null => {
  if (!value || typeof value !== 'string') return '请输入邮箱';
  return value.trim().endsWith(ECNU_STUDENT_SUFFIX) ? null : '必须使用华东师范大学学生邮箱';
};
