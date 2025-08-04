import React, { useState } from 'react';
import { Card, Tabs, Form, Input, Button, Checkbox, Radio, message } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import './index.scss';

const { TabPane } = Tabs;
const { Item } = Form;

const AuthCard = () => {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('login');
  const [loginType, setLoginType] = useState('account'); // account | email
  const [verifyType, setVerifyType] = useState('password'); // password | code
  const [countdown, setCountdown] = useState(0);

  // 发送验证码
  const sendVerificationCode = () => {
    if (countdown > 0) return;
    
    const email = form.getFieldValue('email');
    if (!email || !email.endsWith('@stu.ecnu.edu.cn')) {
      message.error('必须使用华东师范大学学生邮箱(@stu.ecnu.edu.cn)');
      return;
    }
    
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) clearInterval(timer);
        return prev - 1;
      });
    }, 1000);
    
    // 这里替换为实际的发送验证码API调用
    console.log('发送验证码到:', email);
    message.success('验证码已发送到您的邮箱');
  };

  const onTabChange = (key) => {
    setActiveTab(key);
    setLoginType('account');
    setVerifyType('password');
    form.resetFields();
  };

  const onLoginTypeChange = (e) => {
    setLoginType(e.target.value);
    form.resetFields(['username', 'email', 'password', 'code']);
  };

  const onVerifyTypeChange = (e) => {
    setVerifyType(e.target.value);
    form.resetFields(['password', 'code']);
  };

  const onFinish = (values) => {
    console.log('提交数据:', values);
    message.success(activeTab === 'login' ? '登录成功' : activeTab === 'register' ? '注册成功' : '密码重置成功');
  };

  // 邮箱后缀验证规则
  const emailValidator = (_, value) => {
    if (value && !value.endsWith('@stu.ecnu.edu.cn')) {
      return Promise.reject(new Error('必须使用@stu.ecnu.edu.cn邮箱'));
    }
    return Promise.resolve();
  };

  return (
    <div className="auth-container">
      <div className="welcome-title">
        <h1>Welcome To <span>BOYUAN</span></h1>
        <p>信息技术社官方平台</p>
      </div>

      <Card className="auth-card" hoverable>
        <Tabs activeKey={activeTab} onChange={onTabChange} centered className="auth-tabs">
          {/* 登录标签页 */}
          <TabPane tab="登录" key="login">
            <Form form={form} name="login" onFinish={onFinish}>
              <Item>
                <Radio.Group
                  value={loginType}
                  onChange={onLoginTypeChange}
                  buttonStyle="solid"
                >
                  <Radio.Button value="account">账号登录</Radio.Button>
                  <Radio.Button value="email">邮箱登录</Radio.Button>
                </Radio.Group>
              </Item>

              {loginType === 'account' ? (
                <Item
                  name="username"
                  rules={[{ required: true, message: '请输入用户名' }]}
                >
                  <Input prefix={<UserOutlined />} placeholder="用户名" />
                </Item>
              ) : (
                <Item
                  name="email"
                  rules={[
                    { required: true, message: '请输入邮箱' },
                    { type: 'email', message: '邮箱格式不正确' }
                  ]}
                >
                  <Input prefix={<MailOutlined />} placeholder="邮箱" />
                </Item>
              )}

              <Item>
                <Radio.Group
                  value={verifyType}
                  onChange={onVerifyTypeChange}
                  buttonStyle="solid"
                  disabled={loginType === 'account'}
                >
                  <Radio.Button value="password">密码登录</Radio.Button>
                  <Radio.Button value="code" disabled={loginType === 'account'}>
                    验证码登录
                  </Radio.Button>
                </Radio.Group>
              </Item>

              {verifyType === 'password' ? (
                <Item
                  name="password"
                  rules={[{ required: true, message: '请输入密码' }]}
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

              <Item>
                <Item name="remember" valuePropName="checked" noStyle>
                  <Checkbox>记住我</Checkbox>
                </Item>
                <a 
                  className="forgot-password" 
                  onClick={() => setActiveTab('forgot')}
                >
                  忘记密码
                </a>
              </Item>

              <Item>
                <Button type="primary" htmlType="submit" block>
                  登录
                </Button>
              </Item>
            </Form>
          </TabPane>

          {/* 注册标签页 */}
          <TabPane tab="注册" key="register">
            <Form form={form} name="register" onFinish={onFinish}>
              <Item
                name="email"
                rules={[
                  { required: true, message: '请输入@stu.ecnu.edu.cn邮箱' },
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
                name="password"
                rules={[
                  { required: true, message: '请输入密码' },
                  { min: 8, message: '密码至少8位字符' }
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="设置密码（至少8位）" />
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
                  注册
                </Button>
              </Item>
            </Form>
          </TabPane>

          {/* 忘记密码标签页 */}
          <TabPane tab="忘记密码" key="forgot">
            <Form form={form} name="forgot" onFinish={onFinish}>
              <Item
                name="email"
                rules={[
                  { required: true, message: '请输入@stu.ecnu.edu.cn邮箱' },
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
                  { min: 8, message: '密码至少8位字符' }
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="新密码（至少8位）" />
              </Item>

              <Item>
                <Button type="primary" htmlType="submit" block>
                  重置密码
                </Button>
              </Item>
            </Form>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default AuthCard;