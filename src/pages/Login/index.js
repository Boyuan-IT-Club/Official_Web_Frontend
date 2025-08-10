import React, { useState } from 'react';
import { Card, Form, Input, Button, Checkbox, message, Steps } from 'antd';
import { MailOutlined, LockOutlined, SafetyCertificateOutlined, UserOutlined } from '@ant-design/icons';
import './index.scss';
import { useDispatch } from 'react-redux';
import { fetchLogin, fetchRegister, fetchResetPassword } from '@/store/modules/user';
import { useNavigate } from 'react-router-dom';
import { request } from '@/utils/request';

const { Item } = Form;
const { Step } = Steps;

const AuthCard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [authType, setAuthType] = useState('email-password');
  const [countdown, setCountdown] = useState(0);
  const [showRegister, setShowRegister] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [registerStep, setRegisterStep] = useState(0); // 0: 验证邮箱, 1: 设置密码

  const sendVerificationCode = async () => {
    if (countdown > 0) return;
    
    const email = showRegister ? form.getFieldValue('email') : 
                  showForgot ? form.getFieldValue('email') : 
                  form.getFieldValue('auth_id');
    
    if (!email || !email.endsWith('@stu.ecnu.edu.cn')) {
      message.error('必须使用华东师范大学学生邮箱');
      return;
    }
    
    try {
      await request.post('/api/auth/send-code', { 
        email,
        type: showForgot ? 'reset' : 'register' 
      });
      
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) clearInterval(timer);
          return prev - 1;
        });
      }, 1000);
      
      message.success('验证码已发送');
    } catch (error) {
      message.error(error.message || '验证码发送失败');
    }
  };

  const onAuthTypeChange = () => {
    const newType = authType === 'email-password' ? 'email-code' : 'email-password';
    setAuthType(newType);
    form.resetFields(['verify']);
  };

  const onFinish = async (values) => {
    let submitData;
    
    if (!showRegister && !showForgot) {
      submitData = {
        auth_id: values.auth_id,
        auth_type: authType,
        verify: authType === 'email-password' ? values.password : values.code
      };
      try {
        await dispatch(fetchLogin(submitData));
        message.success('登录成功');
        navigate('/');
      } catch (error) {
        message.error(error.message || '登录失败');
      }
    } else if (showRegister) {
      if (registerStep === 0) {
        // 第一步：验证邮箱和验证码
        try {
          await request.post('/api/auth/verify-code', {
            email: values.email,
            code: values.code
          });
          setRegisterStep(1);
          message.success('邮箱验证成功，请设置密码');
        } catch (error) {
          message.error(error.message || '验证码验证失败');
        }
      } else {
        // 第二步：设置密码
        submitData = {
          name: values.name,
          email: values.email,
          password: values.password,
          confirmPassword: values.confirmPassword
        };
        try {
          await dispatch(fetchRegister(submitData));
          message.success('注册成功，请登录');
          setShowRegister(false);
          setRegisterStep(0);
          form.resetFields();
        } catch (error) {
          message.error(error.message || '注册失败');
        }
      }
    } else if (showForgot) {
      submitData = {
        email: values.email,
        code: values.code,
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword
      };
      try {
        await dispatch(fetchResetPassword(submitData));
        message.success('密码重置成功，请重新登录');
        setShowForgot(false);
        form.resetFields();
      } catch (error) {
        message.error(error.message || '密码重置失败');
      }
    }
  };

  const emailValidator = (_, value) => {
    if (value && !value.endsWith('@stu.ecnu.edu.cn')) {
      return Promise.reject(new Error('必须使用@stu.ecnu.edu.cn邮箱'));
    }
    return Promise.resolve();
  };

  return (
    <div className="auth-container">
      <Card className="auth-card" hoverable>
        <div className="brand-title">
          <h1>Welcome To <span>BOYUAN</span></h1>
        </div>

        {!showRegister && !showForgot ? (
          <Form form={form} name="login" onFinish={onFinish}>
            <Item
              name="auth_id"
              rules={[
                { required: true, message: '请输入邮箱' },
                { validator: emailValidator }
              ]}
            >
              <Input 
                prefix={<MailOutlined />} 
                placeholder="请输入@stu.ecnu.edu.cn邮箱" 
              />
            </Item>

            {authType === 'email-password' ? (
              <Item
                name="password"
                rules={[
                  { required: true, message: '请输入密码' },
                  { min: 8, message: '密码至少8位' }
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="密码" />
              </Item>
            ) : (
              <Item
                name="code"
                rules={[{ required: true, message: '请输入验证码' }]}
              >
                <Input
                  prefix={<SafetyCertificateOutlined />}
                  placeholder="验证码"
                  addonAfter={
                    <Button 
                      type="link" 
                      onClick={sendVerificationCode}
                      disabled={countdown > 0}
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
              <Button type="primary" htmlType="submit" block>
                登录
              </Button>
            </Item>

            <div className="auth-links">
              <span onClick={() => {
                setShowRegister(true);
                setShowForgot(false);
                form.resetFields();
              }}>
                注册账号
              </span>
              <span className="divider">|</span>
              <span onClick={() => {
                setShowForgot(true);
                setShowRegister(false);
                form.resetFields();
              }}>
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
            <Steps current={registerStep} size="small" className="register-steps">
              <Step title="验证邮箱" />
              <Step title="设置密码" />
            </Steps>

            {registerStep === 0 ? (
              <>
                <Item
                  name="name"
                  rules={[{ required: true, message: '请输入真实姓名' }]}
                >
                  <Input prefix={<UserOutlined />} placeholder="真实姓名" />
                </Item>

                <Item
                  name="email"
                  rules={[
                    { required: true, message: '请输入邮箱' },
                    { type: 'email', message: '邮箱格式不正确' },
                    { validator: emailValidator }
                  ]}
                >
                  <Input 
                    prefix={<MailOutlined />} 
                    placeholder="请输入@stu.ecnu.edu.cn邮箱" 
                  />
                </Item>

                <Item
                  name="code"
                  rules={[{ required: true, message: '请输入验证码' }]}
                >
                  <Input
                    prefix={<SafetyCertificateOutlined />}
                    placeholder="验证码"
                    addonAfter={
                      <Button 
                        type="link" 
                        onClick={sendVerificationCode}
                        disabled={countdown > 0}
                      >
                        {countdown > 0 ? `${countdown}秒后重试` : '获取验证码'}
                      </Button>
                    }
                  />
                </Item>

                <Item>
                  <Button type="primary" htmlType="submit" block>
                    验证邮箱
                  </Button>
                </Item>
              </>
            ) : (
              <>
                <Item
                  name="password"
                  rules={[
                    { required: true, message: '请输入密码' },
                    { min: 8, message: '密码至少8位' }
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
                      validator(_, value) {
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
                  <Button type="primary" htmlType="submit" block>
                    完成注册
                  </Button>
                </Item>
              </>
            )}

            <div className="auth-links">
              <span onClick={() => {
                setShowRegister(false);
                setRegisterStep(0);
                form.resetFields();
              }}>
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
                { validator: emailValidator }
              ]}
            >
              <Input 
                prefix={<MailOutlined />} 
                placeholder="请输入@stu.ecnu.edu.cn邮箱" 
              />
            </Item>

            <Item
              name="code"
              rules={[{ required: true, message: '请输入验证码' }]}
            >
              <Input
                prefix={<SafetyCertificateOutlined />}
                placeholder="验证码"
                addonAfter={
                  <Button 
                    type="link" 
                    onClick={sendVerificationCode}
                    disabled={countdown > 0}
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
                { min: 8, message: '密码至少8位' }
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
                  validator(_, value) {
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
              <Button type="primary" htmlType="submit" block>
                重置密码
              </Button>
            </Item>

            <div className="auth-links">
              <span onClick={() => {
                setShowRegister(false);
                setShowForgot(false);
                form.resetFields();
              }}>
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