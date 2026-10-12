import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { api } from './api';
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
    TagsOutlined,
    ExperimentOutlined,
    LinkOutlined as ChainOutlined,
} from '@ant-design/icons';
import { Login } from './pages/Login';
import { FeishuCallback } from './pages/FeishuCallback';
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
import { BluetoothToolV2 as BluetoothTool } from './pages/BluetoothToolV2';
import { IntegrationConfigPage } from './pages/IntegrationConfig';
import { Reports } from './pages/Reports';
import { Artifacts } from './pages/Artifacts';
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
  const [currentUser, setCurrentUser] = useState<{ username: string; email?: string } | null>(null);

  useEffect(() => {
    api
      .get('/auth/me')
      .then((res) => {
        setCurrentUser(res.data);
      })
      .catch((err) => {
        console.error('获取用户信息失败', err);
      });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.startsWith('/settings')) return 'settings';
    if (path.startsWith('/bluetooth')) return 'bluetooth';
    if (path.startsWith('/ai-assistant')) return 'ai-assistant';
    if (path.startsWith('/agents')) return 'agents';
    if (path.startsWith('/toolbox')) return 'toolbox';
    if (path.startsWith('/test-cases')) return 'test-cases';
    if (path.startsWith('/defects')) return 'defects';
    if (path.startsWith('/integrations')) return 'integrations';
    if (path.startsWith('/artifacts')) return 'artifacts';
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
          <div
            style={{
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
              flexShrink: 0,
            }}
          >
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
                ],
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
                  {
                    key: 'bluetooth',
                    icon: <ChainOutlined />,
                    label: <Link to="/bluetooth">蓝牙工具</Link>,
                  },
                ],
              },
              {
                key: 'analytics',
                icon: <BarChartOutlined />,
                label: '报告与制品',
                children: [
                  {
                    key: 'reports',
                    icon: <FileSearchOutlined />,
                    label: <Link to="/reports">报告</Link>,
                  },
                  {
                    key: 'artifacts',
                    icon: <ExperimentOutlined />,
                    label: <Link to="/artifacts">制品管理</Link>,
                  },
                  {
                    key: 'integrations',
                    icon: <LinkOutlined />,
                    label: <Link to="/integrations">集成配置</Link>,
                  },
                ],
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
                ],
              },
            ]}
          />
          <div
            style={{
              padding: '16px',
              borderTop: '1px solid rgba(255, 255, 255, 0.15)',
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {currentUser && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 4px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: '16px',
                    boxShadow: '0 2px 8px rgba(24, 144, 255, 0.3)',
                    textTransform: 'uppercase',
                    flexShrink: 0,
                  }}
                >
                  {currentUser.username ? currentUser.username[0] : 'U'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
                  <span
                    style={{
                      color: '#fff',
                      fontWeight: 500,
                      fontSize: '14px',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                    }}
                    title={currentUser.username}
                  >
                    {currentUser.username}
                  </span>
                  {currentUser.email && (
                    <span
                      style={{
                        color: 'rgba(255, 255, 255, 0.45)',
                        fontSize: '12px',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                      }}
                      title={currentUser.email}
                    >
                      {currentUser.email}
                    </span>
                  )}
                </div>
              </div>
            )}
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              style={{
                color: 'rgba(255, 255, 255, 0.65)',
                width: '100%',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '6px',
                transition: 'all 0.3s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#fff';
                e.currentTarget.style.background = 'rgba(255, 77, 79, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.65)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              }}
            >
              退出登录
            </Button>
          </div>
        </div>
      </Sider>
      <Layout className="site-layout" style={{ marginLeft: 200, minHeight: '100vh', background: '#f0f2f5' }}>
        <Content style={{ padding: '24px' }}>
          <div
            style={{
              padding: 24,
              minHeight: 'calc(100vh - 48px)',
              background: '#fff',
              borderRadius: '8px',
              overflow: 'auto',
            }}
          >
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
        <Route path="/login/feishu/callback" element={<FeishuCallback />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <MainLayout>
                <Dashboard />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <PrivateRoute>
              <MainLayout>
                <Projects />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/projects/:id"
          element={
            <PrivateRoute>
              <MainLayout>
                <ProjectDetail />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/test-cases"
          element={
            <PrivateRoute>
              <MainLayout>
                <TestCaseManagement />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/defects"
          element={
            <PrivateRoute>
              <MainLayout>
                <DefectManagement />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/toolbox"
          element={
            <PrivateRoute>
              <MainLayout>
                <Toolbox />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/bluetooth"
          element={
            <PrivateRoute>
              <MainLayout>
                <BluetoothTool />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/integrations"
          element={
            <PrivateRoute>
              <MainLayout>
                <IntegrationConfigPage />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <PrivateRoute>
              <MainLayout>
                <Reports />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/artifacts"
          element={
            <PrivateRoute>
              <MainLayout>
                <Artifacts />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/iterations"
          element={
            <PrivateRoute>
              <MainLayout>
                <VersionIterations />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/runs/:id"
          element={
            <PrivateRoute>
              <MainLayout>
                <ReportDetail />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/agents"
          element={
            <PrivateRoute>
              <MainLayout>
                <AgentManagement />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <MainLayout>
                <Settings />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/ai-assistant"
          element={
            <PrivateRoute>
              <MainLayout>
                <AIAssistant />
              </MainLayout>
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
