import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Divider, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

const { Title } = Typography;

export const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [feishuLoading, setFeishuLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login', values);
      localStorage.setItem('token', response.data.access_token);
      navigate('/');
    } catch (error) {
      // 错误由拦截器处理
    } finally {
      setLoading(false);
    }
  };

  const handleFeishuLogin = async () => {
    setFeishuLoading(true);
    try {
      const response = await api.get('/auth/feishu/url');
      if (response.data && response.data.url) {
        window.location.href = response.data.url;
      } else {
        message.error('未获取到飞书授权登录 URL');
      }
    } catch (error) {
      // 错误由拦截器处理
    } finally {
      setFeishuLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' }}>
      <Card style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3}>AutoTestHub</Title>
          <p>AI 自动化测试平台</p>
        </div>
        <Form name="login" onFinish={onFinish} layout="vertical">
          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名！' }]}>
            <Input prefix={<UserOutlined />} placeholder="用户名 (admin)" size="large" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码！' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码 (AutoTestHub@123)" size="large" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" style={{ width: '100%' }} size="large" loading={loading}>
              登录
            </Button>
          </Form.Item>
        </Form>
        <Divider style={{ fontSize: 13, color: '#8c8c8c' }}>其他登录方式</Divider>
        <Button
          type="default"
          onClick={handleFeishuLogin}
          style={{
            width: '100%',
            borderColor: '#3370ff',
            color: '#3370ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          size="large"
          loading={feishuLoading}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" style={{ marginRight: 8, fill: '#3370ff' }}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
          </svg>
          飞书扫码免密登录
        </Button>
      </Card>
    </div>
  );
};
