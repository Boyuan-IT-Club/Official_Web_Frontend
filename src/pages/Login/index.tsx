// src/pages/Login/index.tsx (or AuthCard.tsx)
import React, { useState, useEffect, useRef } from 'react';
import type { FC } from 'react';
import { Card, Form, Input, Button, Checkbox, message } from 'antd';
import {
  MailOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
  PhoneOutlined,
} from '@ant-design/icons';
import './index.scss';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { userActions } from '@/store/modules/user';
import { useAppDispatch } from '@/store/hooks';
import { request } from '@/utils/request';
import { formatWait, isRateLimited, rateLimitHint, retryAfterSeconds } from '@/utils/rateLimit';
import { ecnuSuffixError, normalizeStudentAuthId, studentEmailError } from '@/utils/studentEmail';

const { Item } = Form;

type AuthType = 'email-password' | 'email-code';

type RootStateLike = {
  user: {
    loading: boolean;
    error?: string | null;
    [key: string]: any;
  };
};

type LoginFormValues = {
  auth_id: string;
  password?: string;
  code?: string;
  remember?: boolean;
};

type RegisterFormValues = {
  name: string;
  phone: string;
  email: string;
  code: string;
  password: string;
  confirmPassword: string;
};

type ForgotFormValues = {
  email: string;
  code: string;
  newPassword: string;
  confirmPassword: string;
};

type AnyAuthFormValues = Partial<LoginFormValues & RegisterFormValues & ForgotFormValues>;

type RequestErrorLike = {
  response?: {
    data?: any;
  };
  message?: string;
};

const AuthCard: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();

  const { loading, error } = useSelector((state: RootStateLike) => state.user);

  const [form] = Form.useForm<AnyAuthFormValues>();
  const [authType, setAuthType] = useState<AuthType>('email-password');
  const [countdown, setCountdown] = useState<number>(0);
  const [showRegister, setShowRegister] = useState<boolean>(false);
  const [showForgot, setShowForgot] = useState<boolean>(false);
  const [localLoading, setLocalLoading] = useState<boolean>(false);
  /** 管理端与用户端的邮箱规则不同：前者有历史非学号账号，只能按后缀放行 */
  const isAdminMode = process.env.REACT_APP_MODE === 'admin';
  // 被后端限流后的冷却秒数：>0 时禁掉提交，并在按钮上显示还要等多久
  const [cooldown, setCooldown] = useState<number>(0);
  // localLoading 是 state，同一轮事件循环里连着提交读到的还是旧值；
  // 而 antd 的 Button loading 只拦鼠标点击，拦不住表单的回车提交。
  // 用 ref 做重入锁才挡得住「按住回车」——线上被这样打出过 6 次/秒。
  const submittingRef = useRef<boolean>(false);
  /*
    账号输入框的 DOM 引用，用来兜底读值。

    这个 input 是裸原生 input，表单里的 auth_id 靠事件同步。浏览器在页面载入
    时自动填充有时不派发任何事件（要等用户交互才补发），那一刻表单值还是空的，
    但框里已经有账号了 —— 用户看到「请输入学号」会一脸问号。
    所以读账号一律走 readAuthId()：表单值为空就回退到框里的真实值。
  */
  const authInputRef = useRef<HTMLInputElement>(null);
  const sendingCodeRef = useRef<boolean>(false);

  // 冷却倒计时
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * 切换登录/注册/找回密码时清掉冷却。
   * 三个表单共用一个 cooldown，但后端的额度是按接口分开算的——
   * 注册被限流不代表登录也不能用，不清掉就会把用户挡在门外。
   */
  const switchForm = (toRegister: boolean, toForgot: boolean): void => {
    setCooldown(0);
    setShowRegister(toRegister);
    setShowForgot(toForgot);
  };

  /** 命中限流：提示用户要等多久，并把提交入口锁到那时候 */
  const handleRateLimited = (err: unknown, fallbackSeconds: number): void => {
    message.error(rateLimitHint(err, fallbackSeconds));
    setCooldown(retryAfterSeconds(err, fallbackSeconds));
  };

  // 发送验证码
  const sendVerificationCode = async (): Promise<void> => {
    if (countdown > 0 || cooldown > 0) return;
    // 失败路径不会启动 countdown，只靠 Button 的 loading 挡连点不够稳
    if (sendingCodeRef.current) return;

    const email = showRegister
      ? form.getFieldValue('email')
      : showForgot
        ? form.getFieldValue('email')
        : readAuthId();

    // 和表单校验器用同一套规则。此前这里只查后缀，于是前缀不是 11 位学号的
    // 地址（如 cr@stu.ecnu.edu.cn）也能把验证码发出去，白白发一封信，
    // 用户要到提交那一刻才发现邮箱根本不合法。
    //
    // 管理端仍只查后缀：那边有 admin、dinghuaye 这类历史非学号账号，
    // 收紧会把他们挡在验证码登录和找回密码之外。
    // 登录框里的账号可能是裸学号（手输没失焦、或浏览器自动填充），统一补齐再判
    const normalized = showRegister || showForgot ? email : normalizeStudentAuthId(email);
    const emailProblem = isAdminMode ? ecnuSuffixError(normalized) : studentEmailError(normalized);
    if (emailProblem) {
      message.error(emailProblem);
      return;
    }

    try {
      sendingCodeRef.current = true;
      setLocalLoading(true);
      // 发的必须是补齐后的地址，否则裸学号会被后端判成非法邮箱
      await request.post('/api/auth/send-email-code', { email: normalized });

      setCountdown(60);
      const timer = window.setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) window.clearInterval(timer);
          return prev - 1;
        });
      }, 1000);

      message.success('验证码已发送');
    } catch (err: unknown) {
      if (isRateLimited(err)) {
        // 同一邮箱 300 秒内最多 3 封，兜底也按这个窗口
        handleRateLimited(err, 300);
        return;
      }
      const errorObj = err as RequestErrorLike;
      const errorMessage =
        errorObj?.response?.data?.message ||
        errorObj?.response?.data?.error ||
        '验证码发送失败';
      message.error(String(errorMessage));
      // eslint-disable-next-line no-console
      console.error('验证码发送错误:', err);
    } finally {
      sendingCodeRef.current = false;
      setLocalLoading(false);
    }
  };

  // 切换登录方式
  const onAuthTypeChange = (): void => {
    const newType: AuthType = authType === 'email-password' ? 'email-code' : 'email-password';
    setAuthType(newType);

    // 清空对应字段
    form.resetFields([newType === 'email-password' ? 'password' : 'code']);
  };


  // 监听 Redux 错误状态的变化（保持原逻辑不改）
  useEffect(() => {
    // 登录错误已经在 onFinish 中处理，这里直接跳过
    if (!showRegister && !showForgot) return;

    if (error && !showRegister && !showForgot) {
      let errorMessage = String(error);

      if (
        errorMessage.toLowerCase().includes('password') ||
        errorMessage.includes('密码') ||
        errorMessage.toLowerCase().includes('credentials')
      ) {
        errorMessage = '邮箱或密码错误';
      } else if (
        errorMessage.includes('验证码') ||
        errorMessage.toLowerCase().includes('code') ||
        errorMessage.toLowerCase().includes('verification')
      ) {
        errorMessage = '验证码错误或已过期';
      } else if (
        errorMessage.includes('邮箱') ||
        errorMessage.toLowerCase().includes('email')
      ) {
        errorMessage = '邮箱格式错误或不存在';
      }

      message.error(errorMessage);

      dispatch(userActions.resetError());

      if (authType === 'email-password') {
        form.setFieldsValue({ password: '' });
      } else {
        form.setFieldsValue({ code: '' });
      }
    }
  }, [error, showRegister, showForgot, authType, dispatch, form]);

  type LoginForm = {
    auth_type: AuthType;
    auth_id: string;
    verify?: string;
    password: string;
    code?: string;
  };

  // 提交表单
  const onFinish = async (values: AnyAuthFormValues): Promise<void> => {
    // 回车提交绕过 Button 的 loading 态，必须在这里自己挡住重入
    if (submittingRef.current) return;
    if (cooldown > 0) {
      message.warning(`操作过于频繁，请 ${formatWait(cooldown)}后再试`);
      return;
    }
    submittingRef.current = true;
    try {
      setLocalLoading(true);

      if (!showRegister && !showForgot) {
        // 登录逻辑
        const verifyValue =
          String(values[authType === 'email-password' ? 'password' : 'code'] ?? '');

        const loginData: LoginForm = {
          auth_type: authType,
          // 后端认的是完整邮箱；这里兜底补齐，不再依赖 blur 有没有发生
          auth_id: isAdminMode
            ? String(values.auth_id ?? '').trim()
            : normalizeStudentAuthId(readAuthId(values.auth_id)),
          verify: verifyValue,
          password: authType === 'email-password' ? verifyValue : '',
          code: authType === 'email-code' ? verifyValue : undefined,
        };

        const resultAction = await dispatch(userActions.fetchLogin(loginData));


        if (userActions.fetchLogin.fulfilled.match(resultAction)) {
          const token = (resultAction.payload as any)?.token;
          if (token) {
            localStorage.setItem('token', String(token));

            // 管理端构建：要求账号持有管理类权限（JWT permissionCodes），否则拒绝进入
            if (process.env.REACT_APP_MODE === 'admin') {
              const { hasConsoleAccess } = await import('@/utils/jwt');
              if (!hasConsoleAccess(String(token))) {
                localStorage.removeItem('token');
                message.error('该账号没有管理权限，请使用管理员账号登录');
                form.setFieldsValue({ password: '', code: '' });
                return;
              }
              message.success('登录成功');
              navigate('/manage', { replace: true });
              return;
            }

            message.success('登录成功');
            const from =
              (location.state as any)?.from?.pathname || '/main/dashboard';
            navigate(from, { replace: true });
          } else {
            throw new Error('登录成功但未获取到token');
          }
        } else {
          const errMsg =
            (resultAction as any).payload ||
            (resultAction as any).error?.message ||
            '账号或密码错误';

          let errorMessage = String(errMsg);

          if (
            errorMessage.toLowerCase().includes('password') ||
            errorMessage.includes('密码') ||
            errorMessage.toLowerCase().includes('credentials')
          ) {
            errorMessage = '邮箱或密码错误';
          } else if (
            errorMessage.includes('验证码') ||
            errorMessage.toLowerCase().includes('code') ||
            errorMessage.toLowerCase().includes('verification')
          ) {
            errorMessage = '验证码错误或已过期';
          }

          message.error(errorMessage);

          if (authType === 'email-password') {
            form.setFieldsValue({ password: '' });
          } else {
            form.setFieldsValue({ code: '' });
          }
        }
      } else if (showRegister) {
        // 用户名不再由这里算。以前是 email.split('@')[0] 传过去，后端再对它
        // 独立做 4-20 的长度校验——同一个值前端算、后端校验，邮箱前缀一不合规
        // 就报「用户名长度必须在4-20个字符之间」，指向一个本页根本没有的输入框。
        // 现在由后端从邮箱推导（= 11 位学号），请求体不用带。
        const res = await request.post('/api/auth/register', {
          password: values.password,
          confirmPassword: values.confirmPassword,
          name: values.name,
          email: values.email,
          phone: values.phone || '',
          emailCode: values.code,
        });

        if ((res as any).code === 201) {
          message.success('注册成功，请登录');
          switchForm(false, false);
          form.resetFields();
        } else {
          throw new Error((res as any).message || '注册失败');
        }
      } else if (showForgot) {
        // 重置密码（保持不变）
        await request.post('/api/auth/reset-password', {
          identifier: values.email,
          code: values.code,
          newPassword: values.newPassword,
        });
        message.success('密码重置成功，请重新登录');
        switchForm(false, false);
        form.resetFields();
      }
    } catch (err: unknown) {
      // eslint-disable-next-line no-console
      console.error('操作失败详情:', err);

      if (isRateLimited(err)) {
        // 注册是同一邮箱 5 次/小时、同一 IP 10 次/小时，兜底取一小时
        handleRateLimited(err, 3600);
        return;
      }

      if (showRegister || showForgot) {
        let errorMessage = '操作失败，请检查输入';

        const errorObj = err as RequestErrorLike;

        if (errorObj?.response?.data) {
          const responseData = errorObj.response.data;
          if (typeof responseData === 'string') {
            errorMessage = responseData;
          } else if (typeof responseData === 'object') {
            errorMessage =
              responseData.message ||
              responseData.error ||
              responseData.msg ||
              '操作失败';
          }
        } else if (errorObj?.message) {
          errorMessage = errorObj.message;
        }

        message.error(String(errorMessage));
      }
    } finally {
      submittingRef.current = false;
      setLocalLoading(false);
    }
  };

  /** 取账号：优先表单值，空了就退回输入框里的真实值（应对无事件的自动填充） */
  const readAuthId = (formValue?: unknown): string => {
    const fromForm = String(formValue ?? form.getFieldValue('auth_id') ?? '').trim();
    if (fromForm) return fromForm;
    return (authInputRef.current?.value ?? '').trim();
  };

  // 邮箱验证规则
  const emailValidator = (_: unknown, value: unknown): Promise<void> => {
    const raw = readAuthId(value);
    if (!raw) {
      return Promise.reject(new Error('请输入学号'));
    }

    // 管理端存在非学号账号（如 admin），不做数字/长度校验
    if (isAdminMode) {
      return Promise.resolve();
    }

    // 先补后缀再判：浏览器自动填充进来的是裸学号，而它不经过 blur，
    // 以前那条「blur 时补后缀」的路走不到，于是必然报「必须使用…学生邮箱」
    const problem = studentEmailError(normalizeStudentAuthId(raw));
    return problem ? Promise.reject(new Error(problem)) : Promise.resolve();
  };

  // 处理邮箱输入框的 blur 事件（保持原逻辑不变）
  const handleEmailBlur: React.FocusEventHandler<HTMLInputElement> = (e) => {
    const value = e.target.value.trim();
    if (!value) return;

    if (/^\d+$/.test(value)) {
      const emailValue = `${value}@stu.ecnu.edu.cn`;
      form.setFieldsValue({ auth_id: emailValue });

      window.setTimeout(() => {
        void form.validateFields(['auth_id']);
      }, 0);
    } else if (value.includes('@')) {
      window.setTimeout(() => {
        void form.validateFields(['auth_id']);
      }, 0);
    }
  };

  return (
    <div className="auth-container">
      <Card className="auth-card" hoverable>
        <div className="brand-title">
          <h1>
            Welcome To <span>BOYUAN</span>
          </h1>
        </div>

        {!showRegister && !showForgot ? (
          <Form form={form} name="login" onFinish={onFinish}>
            <Item
              name="auth_id"
              rules={[
                { validator: emailValidator },
              ]}
            >
              <div className="email-field">
                <MailOutlined className="email-icon" />

                {/*
                  保持原写法：依旧用原生 input，不改结构。
                  name/autoComplete 是新加的：原来三个属性全空，浏览器只能靠
                  启发式猜这是不是账号框，存取都不稳。标成标准的 username /
                  current-password 之后，Chrome 的保存与填充才有确定行为。
                */}
                <input
                  ref={authInputRef}
                  className="email-input"
                  name="username"
                  autoComplete="username"
                  placeholder="请输入学号"
                  onBlur={handleEmailBlur}
                />

                <span className="email-suffix">@stu.ecnu.edu.cn</span>
              </div>
            </Item>

            {authType === 'email-password' ? (
              <Item
                name="password"
                rules={[
                  { required: true, message: '请输入密码' },
                  { min: 8, message: '密码至少8位' },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="密码"
                  autoComplete="current-password"
                />
              </Item>
            ) : (
              <Item name="code" rules={[{ required: true, message: '请输入验证码' }]}>
                <Input
                  prefix={<SafetyCertificateOutlined />}
                  placeholder="验证码"
                  addonAfter={
                    <Button
                      type="link"
                      onClick={sendVerificationCode}
                      disabled={countdown > 0 || cooldown > 0 || loading}
                      loading={localLoading}
                    >
                      {cooldown > 0
                      ? `${formatWait(cooldown)}后重试`
                      : countdown > 0
                        ? `${countdown}秒后重试`
                        : '获取验证码'}
                    </Button>
                  }
                />
              </Item>
            )}

            <Item style={{ marginBottom: 16 }}>
              <Item name="remember" valuePropName="checked" noStyle>
                <Checkbox>记住我</Checkbox>
              </Item>
            </Item>

            <Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                disabled={cooldown > 0}
                loading={localLoading || loading}
              >
                {cooldown > 0 ? `请 ${formatWait(cooldown)}后再试` : '登录'}
              </Button>
            </Item>

            <div className="auth-links">
              <span
                onClick={() => {
                  switchForm(true, false);
                  form.resetFields();
                }}
              >
                注册账号
              </span>
              <span className="divider">|</span>
              <span
                onClick={() => {
                  switchForm(false, true);
                  form.resetFields();
                }}
              >
                忘记密码
              </span>
              <span className="divider">|</span>
              <span onClick={onAuthTypeChange}>
                {authType === 'email-password' ? '验证码登录' : '密码登录'}
              </span>
            </div>
          </Form>
        ) : showRegister ? (
          <Form form={form} name="register" onFinish={onFinish}>
            <Item name="name" rules={[{ required: true, message: '请输入真实姓名' }]}>
              <Input prefix={<UserOutlined />} placeholder="真实姓名" />
            </Item>

            <Item
              name="phone"
              rules={[
                { required: true, message: '请输入手机号码' },
                { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码' },
              ]}
            >
              <Input prefix={<PhoneOutlined />} placeholder="手机号码" />
            </Item>

            <Item
              name="email"
              rules={[
                { required: true, message: '请输入邮箱' },
                { type: 'email', message: '邮箱格式不正确' },
                { validator: emailValidator },
              ]}
            >
              <Input prefix={<MailOutlined />} placeholder="请输入@stu.ecnu.edu.cn邮箱" />
            </Item>

            <Item name="code" rules={[{ required: true, message: '请输入验证码' }]}>
              <Input
                prefix={<SafetyCertificateOutlined />}
                placeholder="邮箱验证码"
                addonAfter={
                  <Button
                    type="link"
                    onClick={sendVerificationCode}
                    disabled={countdown > 0 || cooldown > 0 || loading}
                    loading={localLoading}
                  >
                    {cooldown > 0
                      ? `${formatWait(cooldown)}后重试`
                      : countdown > 0
                        ? `${countdown}秒后重试`
                        : '获取验证码'}
                  </Button>
                }
              />
            </Item>

            <Item
              name="password"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 8, message: '密码至少8位' },
                {
                  validator: (_r: unknown, v: unknown) => {
                    if (!v) return Promise.resolve();
                    const str = String(v);
                    const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/].filter((re) => re.test(str)).length;
                    return kinds >= 3
                      ? Promise.resolve()
                      : Promise.reject(new Error('需包含大写/小写/数字/特殊字符中的至少三种'));
                  },
                },
              ]}
              extra="至少8位，且包含大写字母、小写字母、数字、特殊字符中的至少三种"
            >
              <Input.Password prefix={<LockOutlined />} placeholder="密码" autoComplete="new-password" />
            </Item>

            <Item
              name="confirmPassword"
              dependencies={['password']}
              rules={[
                { required: true, message: '请确认密码' },
                ({ getFieldValue }) => ({
                  validator: (_rule: unknown, value: unknown) => {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('两次输入的密码不一致'));
                  },
                }),
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="确认密码" autoComplete="new-password" />
            </Item>

            <Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                disabled={cooldown > 0}
                loading={localLoading || loading}
              >
                {cooldown > 0 ? `请 ${formatWait(cooldown)}后再试` : '注册'}
              </Button>
            </Item>

            <div className="auth-links">
              <span
                onClick={() => {
                  switchForm(false, false);
                  form.resetFields();
                }}
              >
                返回登录
              </span>
            </div>
          </Form>
        ) : (
          <Form form={form} name="forgot" onFinish={onFinish}>
            <Item
              name="email"
              rules={[
                { required: true, message: '请输入邮箱' },
                { type: 'email', message: '邮箱格式不正确' },
                { validator: emailValidator },
              ]}
            >
              <Input prefix={<MailOutlined />} placeholder="请输入@stu.ecnu.edu.cn邮箱" />
            </Item>

            <Item name="code" rules={[{ required: true, message: '请输入验证码' }]}>
              <Input
                prefix={<SafetyCertificateOutlined />}
                placeholder="验证码"
                addonAfter={
                  <Button
                    type="link"
                    onClick={sendVerificationCode}
                    disabled={countdown > 0 || cooldown > 0 || loading}
                    loading={localLoading}
                  >
                    {cooldown > 0
                      ? `${formatWait(cooldown)}后重试`
                      : countdown > 0
                        ? `${countdown}秒后重试`
                        : '获取验证码'}
                  </Button>
                }
              />
            </Item>

            <Item
              name="newPassword"
              rules={[
                { required: true, message: '请输入新密码' },
                { min: 8, message: '密码至少8位' },
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="新密码" autoComplete="new-password" />
            </Item>

            <Item
              name="confirmPassword"
              dependencies={['newPassword']}
              rules={[
                { required: true, message: '请确认密码' },
                ({ getFieldValue }) => ({
                  validator: (_rule: unknown, value: unknown) => {
                    if (!value || getFieldValue('newPassword') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('两次输入的密码不一致'));
                  },
                }),
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="确认密码" autoComplete="new-password" />
            </Item>

            <Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                disabled={cooldown > 0}
                loading={localLoading || loading}
              >
                {cooldown > 0 ? `请 ${formatWait(cooldown)}后再试` : '重置密码'}
              </Button>
            </Item>

            <div className="auth-links">
              <span
                onClick={() => {
                  switchForm(false, false);
                  form.resetFields();
                }}
              >
                返回登录
              </span>
            </div>
          </Form>
        )}
      </Card>
    </div>
  );
};

export default AuthCard;
