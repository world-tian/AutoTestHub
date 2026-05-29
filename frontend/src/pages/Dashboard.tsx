import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Table, Button, Typography, Spin, Alert } from 'antd';
import { Link } from 'react-router-dom';
import { DashboardOutlined, ProjectOutlined, ThunderboltOutlined, SafetyOutlined, RobotOutlined } from '@ant-design/icons';
import { getProjects, getExecutionRuns, Project, ExecutionRun } from '../api';

const { Title, Text } = Typography;

export const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [recentRuns, setRecentRuns] = useState<ExecutionRun[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [projList] = await Promise.all([getProjects()]);
      setProjects(projList);
      
      const recentRunsPromises = projList.slice(0, 5).map(async (proj: Project) => {
        try {
          const runs = await getExecutionRuns(proj.id);
          return runs.map(r => ({ ...r, projectId: proj.id, projectName: proj.name }));
        } catch (e) {
          return [];
        }
      });
      
      const allRuns = (await Promise.all(recentRunsPromises)).flat();
      const sortedRuns = allRuns
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);
      
      setRecentRuns(sortedRuns);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const stats = {
    totalProjects: projects.length,
    totalRuns: recentRuns.length,
    passedRuns: recentRuns.filter(r => r.status === 'completed').length,
    failedRuns: recentRuns.filter(r => r.status === 'failed').length
  };

  const getStatusTag = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'orange',
      running: 'cyan',
      completed: 'green',
      failed: 'red'
    };
    const labels: Record<string, string> = {
      pending: '待执行',
      running: '执行中',
      completed: '已完成',
      failed: '失败'
    };
    return <span style={{ color: colors[status] || '#666' }}>{labels[status] || status}</span>;
  };

  const recentRunsColumns = [
    {
      title: '执行名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: any) => (
        <Link to={`/runs/${record.id}`}>{text}</Link>
      )
    },
    {
      title: '项目',
      dataIndex: 'projectName',
      key: 'projectName',
      render: (text: string, record: any) => (
        <Link to={`/projects/${record.projectId}`}>{text}</Link>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: getStatusTag
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => new Date(text).toLocaleString()
    }
  ];

  return (
    <div>
      <Title level={2}>
        <DashboardOutlined style={{ marginRight: 8 }} />
        控制台
      </Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        欢迎使用 AutoTestHub，您的 AI 自动化测试管家
      </Text>

      <Alert
        message="快速开始"
        description={
          <div>
            <p>
              您可以从 <Link to="/projects">项目管理</Link> 创建或选择项目开始，
              或者使用 <Link to="/settings">配置中心</Link> 设置 AI 服务。
            </p>
            <p>
              如有问题，请尝试 <Link to="/ai-assistant">AI 助手</Link> 获取帮助！
            </p>
          </div>
        }
        type="info"
        style={{ marginBottom: 24 }}
      />

      <Spin spinning={loading}>
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title={<><ProjectOutlined /> 项目总数</>}
                value={stats.totalProjects}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={<><ThunderboltOutlined /> 最近执行</>}
                value={stats.totalRuns}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={<><SafetyOutlined /> 成功执行</>}
                value={stats.passedRuns}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={<><RobotOutlined /> 失败/异常</>}
                value={stats.failedRuns}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Card title="项目列表" extra={<Link to="/projects"><Button type="link">查看全部</Button></Link>}>
              <Table
                dataSource={projects.slice(0, 5)}
                pagination={false}
                rowKey="id"
                columns={[
                  {
                    title: '项目名称',
                    dataIndex: 'name',
                    key: 'name',
                    render: (text: string, record: Project) => (
                      <Link to={`/projects/${record.id}`}>{text}</Link>
                    )
                  },
                  {
                    title: '描述',
                    dataIndex: 'description',
                    key: 'description',
                    ellipsis: true
                  },
                  {
                    title: '创建时间',
                    dataIndex: 'created_at',
                    key: 'created_at',
                    render: (text: string) => new Date(text).toLocaleDateString()
                  }
                ]}
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card title="最近执行" extra={<Link to="/ai-assistant"><Button type="link">AI 助手</Button></Link>}>
              <Table
                dataSource={recentRuns}
                pagination={false}
                rowKey="id"
                columns={recentRunsColumns}
              />
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  );
};
