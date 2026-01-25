// src/pages/Login/index.tsx (or AuthCard.tsx)
import React, { useState, useEffect } from 'react';
import type { FC } from 'react';
import { Card, Form, Input, Button, Checkbox, message } from 'antd';
import type { FormInstance } from 'antd';
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

  // 发送验证码
  const sendVerificationCode = async (): Promise<void> => {
    if (countdown > 0) return;

    const email = showRegister
      ? form.getFieldValue('email')
      : showForgot
        ? form.getFieldValue('email')
        : form.getFieldValue('auth_id');

    if (!email || typeof email !== 'string' || !email.endsWith('@stu.ecnu.edu.cn')) {
      message.error('必须使用华东师范大学学生邮箱');
      return;
    }

    try {
      setLocalLoading(true);
      await request.post('/api/auth/send-email-code', { email });

      setCountdown(60);
      const timer = window.setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) window.clearInterval(timer);
          return prev - 1;
        });
      }, 1000);

      message.success('验证码已发送');
    } catch (err: unknown) {
      const errorObj = err as RequestErrorLike;
      const errorMessage =
        errorObj?.response?.data?.message ||
        errorObj?.response?.data?.error ||
        '验证码发送失败';
      message.error(String(errorMessage));
      // eslint-disable-next-line no-console
      console.error('验证码发送错误:', err);
    } finally {
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
    try {
      setLocalLoading(true);

      if (!showRegister && !showForgot) {
        // 登录逻辑
        const verifyValue =
          String(values[authType === 'email-password' ? 'password' : 'code'] ?? '');

        const loginData: LoginForm = {
          auth_type: authType,
          auth_id: String(values.auth_id ?? ''),
          verify: verifyValue,
          password: authType === 'email-password' ? verifyValue : '',
          code: authType === 'email-code' ? verifyValue : undefined,
        };

  const resultAction = await dispatch(userActions.fetchLogin(loginData));


        if (userActions.fetchLogin.fulfilled.match(resultAction)) {
          const token = (resultAction.payload as any)?.token;
          if (token) {
            localStorage.setItem('token', String(token));
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
        // 注册逻辑（保持不变）
        const email = String(values.email || '');
        const res = await request.post('/api/auth/register', {
          username: email.split('@')[0],
          password: values.password,
          confirmPassword: values.confirmPassword,
          name: values.name,
          email: values.email,
          phone: values.phone || '',
          emailCode: values.code,
        });

        if ((res as any).code === 201) {
          message.success('注册成功，请登录');
          setShowRegister(false);
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
        setShowForgot(false);
        form.resetFields();
      }
    } catch (err: unknown) {
      // eslint-disable-next-line no-console
      console.error('操作失败详情:', err);

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
      setLocalLoading(false);
    }
  };

  // 邮箱验证规则
  const emailValidator = (_: unknown, value: unknown): Promise<void> => {
    if (!value) {
      return Promise.reject(new Error('请输入学号'));
    }

    const str = String(value);

    const numberPart = str.split('@')[0];
    if (!/^\d+$/.test(numberPart)) {
      return Promise.reject(new Error('学号必须是数字'));
    }

    if (!str.endsWith('@stu.ecnu.edu.cn')) {
      return Promise.reject(new Error('必须使用@stu.ecnu.edu.cn邮箱'));
    }

    return Promise.resolve();
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

                {/* 保持原写法：依旧用原生 input，不改结构 */}
                <input
                  className="email-input"
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
                <Input.Password prefix={<LockOutlined />} placeholder="密码" />
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
                      disabled={countdown > 0 || loading}
                      loading={localLoading}
                    >
                      {countdown > 0 ? `${countdown}秒后重试` : '获取验证码'}
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
                loading={localLoading || loading}
              >
                登录
              </Button>
            </Item>

            <div className="auth-links">
              <span
                onClick={() => {
                  setShowRegister(true);
                  setShowForgot(false);
                  form.resetFields();
                }}
              >
                注册账号
              </span>
              <span className="divider">|</span>
              <span
                onClick={() => {
                  setShowForgot(true);
                  setShowRegister(false);
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
                    disabled={countdown > 0 || loading}
                    loading={localLoading}
                  >
                    {countdown > 0 ? `${countdown}秒后重试` : '获取验证码'}
                  </Button>
                }
              />
            </Item>

            <Item
              name="password"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 8, message: '密码至少8位' },
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="密码" />
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
              <Input.Password prefix={<LockOutlined />} placeholder="确认密码" />
            </Item>

            <Item>
              <Button type="primary" htmlType="submit" block loading={localLoading || loading}>
                注册
              </Button>
            </Item>

            <div className="auth-links">
              <span
                onClick={() => {
                  setShowRegister(false);
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
                    disabled={countdown > 0 || loading}
                    loading={localLoading}
                  >
                    {countdown > 0 ? `${countdown}秒后重试` : '获取验证码'}
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
              <Input.Password prefix={<LockOutlined />} placeholder="新密码" />
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
              <Input.Password prefix={<LockOutlined />} placeholder="确认密码" />
            </Item>

            <Item>
              <Button type="primary" htmlType="submit" block loading={localLoading || loading}>
                重置密码
              </Button>
            </Item>

            <div className="auth-links">
              <span
                onClick={() => {
                  setShowRegister(false);
                  setShowForgot(false);
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
