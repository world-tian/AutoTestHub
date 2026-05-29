import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button } from 'antd';
import { 
  ProjectOutlined, 
  DashboardOutlined, 
  LogoutOutlined, 
  SettingOutlined, 
  BulbOutlined,
  FileTextOutlined,
  DesktopOutlined,
  AppstoreOutlined,
  ToolOutlined
} from '@ant-design/icons';
import { Login } from './pages/Login';
import { Projects } from './pages/Projects';
import { ProjectDetail } from './pages/ProjectDetail';
import { Settings } from './pages/Settings';
import { AIAssistant } from './pages/AIAssistant';
import { Dashboard } from './pages/Dashboard';
import { ReportDetail } from './pages/ReportDetail';
import { TestCaseManagement } from './pages/TestCaseManagement';
import AgentManagement from './pages/AgentManagement';

const { Header, Content, Sider } = Layout;

const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.startsWith('/settings')) return 'settings';
    if (path.startsWith('/ai-assistant')) return 'ai-assistant';
    if (path.startsWith('/agents')) return 'agents';
    if (path.startsWith('/test-cases')) return 'test-cases';
    if (path.startsWith('/projects') || path.startsWith('/runs')) return 'projects';
    return 'dashboard';
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider>
        <div style={{ 
          height: 48, 
          margin: 16, 
          background: 'rgba(255, 255, 255, 0.2)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          color: '#fff', 
          fontWeight: 'bold',
          fontSize: '18px',
          borderRadius: 4
        }}>
          AutoTestHub
        </div>
        <Menu 
          theme="dark" 
          selectedKeys={[getSelectedKey()]} 
          defaultOpenKeys={['workspace', 'resources', 'system']}
          mode="inline"
          items={[
            {
              key: 'dashboard',
              icon: <DashboardOutlined />,
              label: <Link to="/">控制台</Link>,
            },
            {
              key: 'workspace',
              icon: <AppstoreOutlined />,
              label: '工作台',
              children: [
                {
                  key: 'projects',
                  icon: <ProjectOutlined />,
                  label: <Link to="/projects">项目管理</Link>,
                },
                {
                  key: 'test-cases',
                  icon: <FileTextOutlined />,
                  label: <Link to="/test-cases">用例管理</Link>,
                },
              ]
            },
            {
              key: 'resources',
              icon: <ToolOutlined />,
              label: '资源与执行',
              children: [
                {
                  key: 'agents',
                  icon: <DesktopOutlined />,
                  label: <Link to="/agents">Agent 管理</Link>,
                },
              ]
            },
            {
              key: 'system',
              icon: <SettingOutlined />,
              label: '系统与配置',
              children: [
                {
                  key: 'ai-assistant',
                  icon: <BulbOutlined />,
                  label: <Link to="/ai-assistant">AI 助手</Link>,
                },
                {
                  key: 'settings',
                  icon: <SettingOutlined />,
                  label: <Link to="/settings">系统设置</Link>,
                },
              ]
            }
          ]}
        />
      </Sider>
      <Layout className="site-layout">
        <Header style={{ padding: '0 24px', background: '#fff', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <Button icon={<LogoutOutlined />} onClick={handleLogout}>退出登录</Button>
        </Header>
        <Content style={{ margin: '16px' }}>
          <div style={{ 
            padding: 24, 
            minHeight: 'calc(100vh - 120px)', 
            background: '#fff', 
            borderRadius: '8px',
            overflow: 'auto'
          }}>
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><MainLayout><Dashboard /></MainLayout></PrivateRoute>} />
        <Route path="/projects" element={<PrivateRoute><MainLayout><Projects /></MainLayout></PrivateRoute>} />
        <Route path="/projects/:id" element={<PrivateRoute><MainLayout><ProjectDetail /></MainLayout></PrivateRoute>} />
        <Route path="/test-cases" element={<PrivateRoute><MainLayout><TestCaseManagement /></MainLayout></PrivateRoute>} />
        <Route path="/runs/:id" element={<PrivateRoute><MainLayout><ReportDetail /></MainLayout></PrivateRoute>} />
        <Route path="/agents" element={<PrivateRoute><MainLayout><AgentManagement /></MainLayout></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><MainLayout><Settings /></MainLayout></PrivateRoute>} />
        <Route path="/ai-assistant" element={<PrivateRoute><MainLayout><AIAssistant /></MainLayout></PrivateRoute>} />
      </Routes>
    </Router>
  );
};

export default App;
