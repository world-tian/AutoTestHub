import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Typography, Spin, Button, Space, Alert, Divider, Tabs } from 'antd';
import { Link, useParams } from 'react-router-dom';
import { FileTextOutlined, RobotOutlined, ArrowLeftOutlined, Html5Outlined } from '@ant-design/icons';
import { getExecutionRun, getExecutionResults, analyzeReport, ExecutionRun, ExecutionResult } from '../api';

const { Title, Text } = Typography;

export const ReportDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [run, setRun] = useState<ExecutionRun | null>(null);
  const [results, setResults] = useState<ExecutionResult[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [runData, resultData] = await Promise.all([
        getExecutionRun(id),
        getExecutionResults(id)
      ]);
      setRun(runData);
      setResults(resultData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  // 轮询：如果执行处于 pending 或 running 状态，则每隔3秒刷新一次
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (run && (run.status === 'pending' || run.status === 'running')) {
      timer = setInterval(() => {
        fetchData();
      }, 3000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [run?.status]);

  const handleAnalyzeReport = async () => {
    if (!id) return;
    setAnalyzing(true);
    try {
      const analysis = await analyzeReport(id);
      setAiAnalysis(analysis);
    } catch (error) {
      console.error('Failed to analyze report:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const stats = {
    total: results.length,
    passed: results.filter(r => r.status === 'passed').length,
    failed: results.filter(r => r.status === 'failed').length,
    skipped: results.filter(r => r.status === 'skipped').length,
    error: results.filter(r => r.status === 'error').length
  };

  const passRate = stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0;

  const getStatusTag = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'blue',
      running: 'cyan',
      passed: 'green',
      completed: 'green',
      failed: 'red',
      skipped: 'orange',
      error: 'orange'
    };
    const labels: Record<string, string> = {
      pending: '等待调度',
      running: '执行中',
      passed: '通过',
      completed: '已完成',
      failed: '失败',
      skipped: '跳过',
      error: '异常'
    };
    return <Tag color={colors[status] || 'default'}>{labels[status] || status}</Tag>;
  };

  const resultColumns = [
    {
      title: '测试用例',
      dataIndex: 'case_title',
      key: 'case_title',
      render: (text: string, record: any) => text || record.test_case_id
    },
    {
      title: '用例说明',
      dataIndex: 'case_description',
      key: 'case_description',
      ellipsis: true,
      render: (text: string) => text || '-'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: getStatusTag
    },
    {
      title: '错误信息',
      dataIndex: 'error_message',
      key: 'error_message',
      ellipsis: true
    },
    {
      title: '执行时间',
      dataIndex: 'executed_at',
      key: 'executed_at',
      render: (text: string) => text ? new Date(text.endsWith('Z') ? text : text + 'Z').toLocaleString() : '-'
    }
  ];

  if (!run && !loading) return <div>报告不存在</div>;

  return (
    <div>
      <Space style={{ marginBottom: 24 }}>
        <Link to="/projects">
          <Button icon={<ArrowLeftOutlined />}>返回项目列表</Button>
        </Link>
        <Link to={`/projects/${run?.project_id}`}>
          <Button>返回项目</Button>
        </Link>
      </Space>

      <Title level={2}>
        <FileTextOutlined style={{ marginRight: 8 }} />
        测试报告：{run?.name}
        <span style={{ marginLeft: 16, fontSize: 16 }}>
          {run?.status && getStatusTag(run.status)}
        </span>
      </Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        创建时间：{run ? new Date(run.created_at.endsWith('Z') ? run.created_at : run.created_at + 'Z').toLocaleString() : ''}
      </Text>

      <Spin spinning={loading}>
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="总用例数"
                value={stats.total}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="通过"
                value={stats.passed}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="失败"
                value={stats.failed}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="通过率"
                value={passRate}
                suffix="%"
                valueStyle={{ color: passRate >= 80 ? '#52c41a' : passRate >= 50 ? '#faad14' : '#ff4d4f' }}
              />
            </Card>
          </Col>
        </Row>

        <Card
          title={<><RobotOutlined style={{ marginRight: 8 }} /> AI 分析报告</>}
          style={{ marginBottom: 24 }}
          extra={
            <Button
              type="primary"
              icon={<RobotOutlined />}
              loading={analyzing}
              onClick={handleAnalyzeReport}
            >
              {aiAnalysis ? '重新分析' : 'AI 分析报告'}
            </Button>
          }
        >
          {aiAnalysis ? (
            <div style={{ whiteSpace: 'pre-wrap' }}>{aiAnalysis}</div>
          ) : (
            <Alert
              message="点击"
              description="点击「AI 分析报告」按钮，让 AI 为您分析这个执行报告！"
              type="info"
            />
          )}
        </Card>

        <Divider />

        <Tabs defaultActiveKey="results">
          <Tabs.TabPane tab={<span><FileTextOutlined />执行结果</span>} key="results">
            <Card title="执行用例列表">
              <Table
                dataSource={results}
                columns={resultColumns}
                rowKey="id"
                pagination={{
                  defaultPageSize: 20,
                  showSizeChanger: true,
                  showTotal: (total) => `共 ${total} 条结果`
                }}
                expandable={{
                  expandedRowRender: (record) => (
                    <div style={{ margin: 0 }}>
                      <Title level={5}>执行日志</Title>
                      <pre style={{ 
                        background: '#1e1e1e', 
                        color: '#a9b7c6', 
                        padding: '16px', 
                        borderRadius: '8px', 
                        whiteSpace: 'pre-wrap',
                        maxHeight: '400px',
                        overflowY: 'auto',
                        fontFamily: 'monospace'
                      }}>
                        {record.log_url || record.error_message || '无日志输出'}
                      </pre>
                    </div>
                  ),
                }}
              />
            </Card>
          </Tabs.TabPane>
          {results.some(r => r.html_report) && (
            <Tabs.TabPane tab={<span><Html5Outlined />原生日志报告</span>} key="html_report">
              <Card>
                <iframe
                  title="HTML Report"
                  srcDoc={results.find(r => r.html_report)?.html_report}
                  style={{ width: '100%', height: 'calc(100vh - 250px)', minHeight: '800px', border: 'none' }}
                />
              </Card>
            </Tabs.TabPane>
          )}
        </Tabs>
      </Spin>
    </div>
  );
};
