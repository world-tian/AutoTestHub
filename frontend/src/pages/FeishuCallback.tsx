import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Spin, Card, message } from 'antd';
import { api } from '../api';

export const FeishuCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const authenticationStarted = useRef(false);

  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) {
      message.error('未检测到有效的飞书授权 Code');
      navigate('/login');
      return;
    }

    if (authenticationStarted.current) {
      return;
    }
    authenticationStarted.current = true;

    const authenticate = async () => {
      try {
        const response = await api.post('/auth/feishu/login', { code });
        if (response.data && response.data.access_token) {
          localStorage.setItem('token', response.data.access_token);
          message.success('飞书快捷登录成功！');
          navigate('/');
        } else {
          message.error('飞书授权成功，但系统登录失败');
          navigate('/login');
        }
      } catch (error) {
        navigate('/login');
      }
    };

    authenticate();
  }, [searchParams, navigate]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' }}>
      <Card style={{ width: 320, textAlign: 'center', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
        <Spin size="large" style={{ marginBottom: 16 }} />
        <div style={{ fontSize: 14, color: '#595959' }}>正在通过飞书进行免密登录验证...</div>
      </Card>
    </div>
  );
};
