import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import { ProjectOutlined, SettingOutlined } from '@ant-design/icons';
import React from 'react';

const { Header, Content, Sider } = Layout;

const Dashboard = () => <div><h1>Dashboard</h1><p>Welcome to AutoTestHub MVP</p></div>;
const Projects = () => <div><h1>Projects</h1><p>List of projects will be here.</p></div>;

const App: React.FC = () => {
  return (
    <Router>
      <Layout style={{ minHeight: '100vh' }}>
        <Sider>
          <div style={{ height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.2)' }} />
          <Menu theme="dark" defaultSelectedKeys={['1']} mode="inline">
            <Menu.Item key="1" icon={<ProjectOutlined />}>
              <Link to="/">Dashboard</Link>
            </Menu.Item>
            <Menu.Item key="2" icon={<SettingOutlined />}>
              <Link to="/projects">Projects</Link>
            </Menu.Item>
          </Menu>
        </Sider>
        <Layout className="site-layout">
          <Header style={{ padding: 0, background: '#fff' }} />
          <Content style={{ margin: '16px' }}>
            <div style={{ padding: 24, minHeight: 360, background: '#fff' }}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/projects" element={<Projects />} />
              </Routes>
            </div>
          </Content>
        </Layout>
      </Layout>
    </Router>
  );
};

export default App;
