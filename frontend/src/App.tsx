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
    ToolOutlined,
    BugOutlined,
    BarChartOutlined,
    LinkOutlined,
    FileSearchOutlined,
    TagsOutlined
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
import { DefectManagement } from './pages/DefectManagement';
import { Toolbox } from './pages/Toolbox';
import { IntegrationConfigPage } from './pages/IntegrationConfig';
import { Reports } from './pages/Reports';
import { VersionIterations } from './pages/VersionIterations';

const { Content, Sider } = Layout;

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
        if (path.startsWith('/toolbox')) return 'toolbox';
        if (path.startsWith('/test-cases')) return 'test-cases';
        if (path.startsWith('/defects')) return 'defects';
        if (path.startsWith('/integrations')) return 'integrations';
        if (path.startsWith('/reports')) return 'reports';
        if (path.startsWith('/iterations')) return 'iterations';
        if (path.startsWith('/projects') || path.startsWith('/runs')) return 'projects';
        return 'dashboard';
    };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        style={{
          overflow: 'hidden',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
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
            borderRadius: 4,
            flexShrink: 0
          }}>
            AutoTestHub
          </div>
          <Menu 
            theme="dark" 
            selectedKeys={[getSelectedKey()]} 
            defaultOpenKeys={['workspace', 'resources', 'system']}
            mode="inline"
            style={{ flex: 1, borderRight: 0, overflowY: 'auto' }}
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
                  {
                  key: 'defects',
                  icon: <BugOutlined />,
                  label: <Link to="/defects">缺陷管理</Link>,
                  },
                  {
                  key: 'iterations',
                  icon: <TagsOutlined />,
                  label: <Link to="/iterations">版本迭代</Link>,
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
                  {
                  key: 'toolbox',
                  icon: <ToolOutlined />,
                  label: <Link to="/toolbox">工具箱</Link>,
                  },
              ]
              },
              {
              key: 'analytics',
              icon: <BarChartOutlined />,
              label: '分析与报告',
              children: [
                  {
                  key: 'reports',
                  icon: <FileSearchOutlined />,
                  label: <Link to="/reports">报告</Link>,
                  },
                  {
                  key: 'integrations',
                  icon: <LinkOutlined />,
                  label: <Link to="/integrations">集成配置</Link>,
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
          <div style={{ padding: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
            <Button 
              type="text" 
              icon={<LogoutOutlined />} 
              onClick={handleLogout} 
              style={{ color: 'rgba(255, 255, 255, 0.65)' }}
            >
              退出登录
            </Button>
          </div>
        </div>
      </Sider>
      <Layout className="site-layout" style={{ marginLeft: 200, minHeight: '100vh', background: '#f0f2f5' }}>
        <Content style={{ padding: '24px' }}>
          <div style={{ 
            padding: 24, 
            minHeight: 'calc(100vh - 48px)', 
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
        <Route path="/defects" element={<PrivateRoute><MainLayout><DefectManagement /></MainLayout></PrivateRoute>} />
        <Route path="/toolbox" element={<PrivateRoute><MainLayout><Toolbox /></MainLayout></PrivateRoute>} />
        <Route path="/integrations" element={<PrivateRoute><MainLayout><IntegrationConfigPage /></MainLayout></PrivateRoute>} />
        <Route path="/reports" element={<PrivateRoute><MainLayout><Reports /></MainLayout></PrivateRoute>} />
        <Route path="/iterations" element={<PrivateRoute><MainLayout><VersionIterations /></MainLayout></PrivateRoute>} />
        <Route path="/runs/:id" element={<PrivateRoute><MainLayout><ReportDetail /></MainLayout></PrivateRoute>} />
        <Route path="/agents" element={<PrivateRoute><MainLayout><AgentManagement /></MainLayout></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><MainLayout><Settings /></MainLayout></PrivateRoute>} />
        <Route path="/ai-assistant" element={<PrivateRoute><MainLayout><AIAssistant /></MainLayout></PrivateRoute>} />
      </Routes>
    </Router>
  );
};

export default App;
