import React, { useState } from 'react';
import { Card, Form, Input, Button, Checkbox, message } from 'antd';
import { MailOutlined, LockOutlined, SafetyCertificateOutlined, UserOutlined, PhoneOutlined } from '@ant-design/icons';
import './index.scss';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { userActions } from '@/store/modules/user'; // 导入 Redux actions
import { request } from '@/utils/request'; // 导入封装的请求函数
const { Item } = Form;

const AuthCard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, error } = useSelector(state => state.user); // 从 Redux 获取状态
  
  const [form] = Form.useForm();
  const [authType, setAuthType] = useState('email-password');
  const [countdown, setCountdown] = useState(0);
  const [showRegister, setShowRegister] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [localLoading, setLocalLoading] = useState(false); // 本地加载状态
  // 发送验证码
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
      setLocalLoading(true);
      await request.post('/api/auth/send-email-code', { email });
      
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) clearInterval(timer);
          return prev - 1;
        });
      }, 1000);
      
      message.success('验证码已发送');
    } catch (error) {
      const errorMessage = error.response?.data?.message || 
                         error.response?.data?.error || 
                         '验证码发送失败';
      message.error(errorMessage);
      console.error('验证码发送错误:', error);
    } finally {
      setLocalLoading(false);
    }
  };

  // 切换登录方式
  const onAuthTypeChange = () => {
    const newType = authType === 'email-password' ? 'email-code' : 'email-password';
    setAuthType(newType);
    form.resetFields(['verify']);
  };

  // 监听 Redux 错误状态的变化
  React.useEffect(() => {
    if (error && !showRegister && !showForgot) {
      let errorMessage = error;
      
      // 特殊处理登录错误
      if (errorMessage.toLowerCase().includes('password') || 
          errorMessage.includes('密码') || 
          errorMessage.includes('credentials')) {
        errorMessage = '邮箱或密码错误';
      } else if (errorMessage.includes('验证码') || 
                errorMessage.toLowerCase().includes('code') || 
                errorMessage.toLowerCase().includes('verification')) {
        errorMessage = '验证码错误或已过期';
      } else if (errorMessage.includes('邮箱') || 
                errorMessage.toLowerCase().includes('email')) {
        errorMessage = '邮箱格式错误或不存在';
      }
      
      message.error(errorMessage);
      
      // 清空错误状态
      dispatch(userActions.resetError());
      
      // 清空密码字段
      if (authType === 'email-password') {
        form.setFieldsValue({ password: '' });
      } else {
        form.setFieldsValue({ code: '' });
      }
    }
  }, [error, showRegister, showForgot, authType, dispatch, form]);

  // 提交表单
  const onFinish = async (values) => {
    try {
      setLocalLoading(true);
      
      if (!showRegister && !showForgot) {
        // 登录逻辑 - 使用 Redux thunk
        const loginData = {
          auth_type: authType,
          auth_id: values.auth_id,
          verify: values[authType === 'email-password' ? 'password' : 'code']
        };
        
        // 使用 Redux thunk 进行登录
        const resultAction = await dispatch(userActions.fetchLogin(loginData));
        
        if (userActions.fetchLogin.fulfilled.match(resultAction)) {
          // 登录成功
          const token = resultAction.payload.token;
          if (token) {
            localStorage.setItem('token', token);
            message.success('登录成功');
            navigate('/main/dashboard');
          } else {
            throw new Error('登录成功但未获取到token');
          }
        } else {
          // 登录失败，错误信息已经在 useEffect 中处理
          console.log('登录失败，错误已处理');
        }
        
      } else if (showRegister) {
        // 注册逻辑（保持不变）
        const res = await request.post('/api/auth/register', {
          username: values.email.split('@')[0],
          password: values.password,
          confirmPassword: values.confirmPassword,
          name: values.name,
          email: values.email,
          phone: values.phone || "",
          emailCode: values.code
        });
        
        if (res.code === 201) {
          message.success('注册成功，请登录');
          setShowRegister(false);
          form.resetFields();
        } else {
          throw new Error(res.message || '注册失败');
        }
      } else if (showForgot) {
        // 重置密码（保持不变）
        await request.post('/api/auth/reset-password', {
          identifier: values.email,
          code: values.code,
          newPassword: values.newPassword
        });
        message.success('密码重置成功，请重新登录');
        setShowForgot(false);
        form.resetFields();
      }
    } catch (error) {
      console.error('操作失败详情:', error);
      
      // 处理非登录操作的错误
      if (showRegister || showForgot) {
        let errorMessage = '操作失败，请检查输入';
        
        if (error.response?.data) {
          const responseData = error.response.data;
          if (typeof responseData === 'string') {
            errorMessage = responseData;
          } else if (typeof responseData === 'object') {
            errorMessage = responseData.message || 
                          responseData.error || 
                          responseData.msg || 
                          '操作失败';
          }
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        message.error(errorMessage);
      }
    } finally {
      setLocalLoading(false);
    }
  };


  // 邮箱验证规则
  const emailValidator = (_, value) => {
    if (value && !value.endsWith('@stu.ecnu.edu.cn')) {
      return Promise.reject(new Error('必须使用@stu.ecnu.edu.cn邮箱'));
    }
    return Promise.resolve();
  };

  //自动加入邮箱后缀
  const handleIdBlur = (e) => {
    const value = e.target.value.trim();
    if (value && /^\d{11}$/.test(value)) { // 检查是否是11位数字
      form.setFieldsValue({
        auth_id: `${value}@stu.ecnu.edu.cn`
      });
    }
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
                onBlur={handleIdBlur}
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
                      disabled={countdown > 0 || loading}
                      loading={loading}
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
                loading={loading}
              >
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
            <Item
              name="name"
              rules={[{ required: true, message: '请输入真实姓名' }]}
            >
              <Input prefix={<UserOutlined />} placeholder="真实姓名" />
            </Item>

            <Item
              name="phone"
              rules={[
                { required: true , message: '请输入手机号码' },
                { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码' }
              ]}
            >
              <Input prefix={<PhoneOutlined />} placeholder="手机号码" />
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
                placeholder="邮箱验证码"
                addonAfter={
                    <Button 
                      type="link" 
                      onClick={sendVerificationCode}
                      disabled={countdown > 0 || loading}
                      loading={loading}
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
              <Button 
                type="primary" 
                htmlType="submit" 
                block
                loading={loading}
              >
                注册
              </Button>
            </Item>

            <div className="auth-links">
              <span onClick={() => {
                setShowRegister(false);
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
                      disabled={countdown > 0 || loading}
                      loading={loading}
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
              <Button 
                type="primary" 
                htmlType="submit" 
                block
                loading={loading}
              >
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