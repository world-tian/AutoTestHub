import React, { useEffect, useState, useMemo } from 'react';
import {
  Tabs, Table, Button, Modal, Form, Input, Space, Tag, message, Typography, Select,
  Switch, Popconfirm
} from 'antd';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { TestCaseManagement } from './TestCaseManagement';
import { EditOutlined, ClockCircleOutlined, PlayCircleOutlined } from '@ant-design/icons';
import {
  getProject, getRequirements, getExecutionRuns, createRequirement, createExecutionRun,
  generateTestCases, Requirement, ExecutionRun,
  getAgents, getScheduledTasks, createScheduledTask, updateScheduledTask, deleteScheduledTask,
  triggerScheduledTask, triggerExecution, Agent, ScheduledTask, importJiraRequirements,
  getTestPlans, createTestPlan, deleteTestPlan, TestPlan, deleteExecutionRun, getTestCases, TestCase
} from '../api';

const { Title } = Typography;
const { TextArea } = Input;

// 常用的cron表达式预设
const CRON_PRESETS = [
  { label: '每分钟', value: '* * * * *' },
  { label: '每5分钟', value: '*/5 * * * *' },
  { label: '每小时', value: '0 * * * *' },
  { label: '每天早上8点', value: '0 8 * * *' },
  { label: '每天晚上9点', value: '0 21 * * *' },
  { label: '每周一早上8点', value: '0 8 * * 1' },
  { label: '每月1号早上8点', value: '0 8 1 * *' },
];

export const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [runs, setRuns] = useState<ExecutionRun[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([]);
  const [testPlans, setTestPlans] = useState<TestPlan[]>([]);
  const sortedTestPlans = useMemo(() => [...testPlans].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()), [testPlans]);

  const [isReqModalOpen, setIsReqModalOpen] = useState(false);
  const [isJiraModalOpen, setIsJiraModalOpen] = useState(false);
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isTriggerModalOpen, setIsTriggerModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null);
  const handleTriggerExecution = async (values: any) => {
    if (!id) return;
    try {
      const response = await triggerExecution(id, {
        name: values.name,
        agent_id: values.agent_id,
        device_id: values.device_id,
        priority: values.priority || 0,
        working_dir: values.working_dir,
        test_command: values.test_command,
        test_plan_id: values.test_plan_id
      });
      message.success('执行已触发，即将跳转到报告详情');
      setIsTriggerModalOpen(false);
      triggerForm.resetFields();
      // 直接跳转到新生成的报告页面
      if (response && response.run_id) {
        navigate(`/runs/${response.run_id}`);
      } else {
        fetchData();
      }
    } catch (error) {
      message.error('触发执行失败');
    }
  };

  const [form] = Form.useForm();
  const [jiraForm] = Form.useForm();
  const [runForm] = Form.useForm();
  const [taskForm] = Form.useForm();
  const [planForm] = Form.useForm();
  const [triggerForm] = Form.useForm();

  const [loading, setLoading] = useState(false);
  const [runSearchText, setRunSearchText] = useState('');

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [proj, reqs, executionRuns, allAgents, tasks, plans, tcs] = await Promise.all([
        getProject(id),
        getRequirements(id),
        getExecutionRuns(id),
        getAgents(),
        getScheduledTasks(id),
        getTestPlans(id),
        getTestCases(id)
      ]);
      setProject(proj);
      setRequirements(reqs);
      setRuns(executionRuns);
      setAgents(allAgents);
      setScheduledTasks(tasks);
      setTestPlans(plans);
      setTestCases(tcs);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const handleCreateReq = async (values: any) => {
    if (!id) return;
    try {
      await createRequirement(id, values.title, values.description);
      message.success('需求创建成功');
      setIsReqModalOpen(false);
      form.resetFields();
      fetchData();
    } catch (error) {
      message.error('创建需求失败');
    }
  };

  const handleJiraImport = async (values: any) => {
    if (!id) return;
    try {
      setLoading(true);
      await importJiraRequirements(id, values.jql, values.project_key);
      message.success('Jira 需求导入成功');
      setIsJiraModalOpen(false);
      jiraForm.resetFields();
      fetchData();
    } catch (error) {
      message.error('Jira 需求导入失败');
    } finally {
      setLoading(false);
    }
  };

    const handleDeleteRun = async (id: string) => {
    Modal.confirm({
      title: '确定要删除该执行报告吗？',
      content: '删除后无法恢复。',
      onOk: async () => {
        try {
          await deleteExecutionRun(id);
          message.success('报告已删除');
          fetchData();
        } catch (e) {
          console.error(e);
        }
      }
    });
  };

  const uniqueFeatures = Array.from(new Set(testCases.map(c => c.feature).filter(Boolean)));
  const handleCreatePlan = async (values: any) => {
    if (!id) return;
    try {
      const case_filters: any = {};
      if (values.category) case_filters.category = values.category;
      if (values.feature && values.feature.length > 0) case_filters.feature = values.feature;
      
      await createTestPlan(id, {
        name: values.name,
        description: values.description,
        env: values.env,
        working_dir: values.working_dir,
        test_command: values.test_command,
        case_filters: Object.keys(case_filters).length > 0 ? case_filters : undefined,
        case_ids: values.case_ids && values.case_ids.length > 0 ? values.case_ids : undefined,
      });
      message.success('测试计划创建成功');
      setIsPlanModalOpen(false);
      planForm.resetFields();
      fetchData();
    } catch (error) {
      message.error('创建测试计划失败');
    }
  };

  const handleGenerateCases = async (reqId: string) => {
    try {
      await generateTestCases(reqId);
      message.success('测试用例生成中...');
      setTimeout(fetchData, 1500);
    } catch (error) {
      message.error('生成用例失败');
    }
  };



  const handleCreateRun = async (values: any) => {
    if (!id) return;
    try {
      await createExecutionRun(id, values.name);
      message.success('执行创建成功');
      setIsRunModalOpen(false);
      runForm.resetFields();
      fetchData();
    } catch (error) {
      message.error('创建执行失败');
    }
  };

  const handleCreateTask = async (values: any) => {
    if (!id) return;
    try {
      const config: any = {};
      if (values.agent_id) config.agent_id = values.agent_id;
      if (values.device_id) config.device_id = values.device_id;
      if (values.test_plan_id) config.test_plan_id = values.test_plan_id;
      
      await createScheduledTask(id, {
        name: values.name,
        description: values.description,
        cron_expression: values.cron_expression,
        task_type: 'test_execution',
        enabled: values.enabled ?? true,
        config
      });
      message.success('定时任务创建成功');
      setIsTaskModalOpen(false);
      taskForm.resetFields();
      setEditingTask(null);
      fetchData();
    } catch (error) {
      message.error('创建定时任务失败');
    }
  };

  const handleUpdateTask = async (values: any) => {
    if (!editingTask) return;
    try {
      const config: any = {};
      if (values.agent_id) config.agent_id = values.agent_id;
      if (values.device_id) config.device_id = values.device_id;
      if (values.test_plan_id) config.test_plan_id = values.test_plan_id;
      
      await updateScheduledTask(editingTask.id, {
        name: values.name,
        description: values.description,
        cron_expression: values.cron_expression,
        enabled: values.enabled,
        config
      });
      message.success('定时任务更新成功');
      setIsTaskModalOpen(false);
      taskForm.resetFields();
      setEditingTask(null);
      fetchData();
    } catch (error) {
      message.error('更新定时任务失败');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteScheduledTask(taskId);
      message.success('定时任务删除成功');
      fetchData();
    } catch (error) {
      message.error('删除定时任务失败');
    }
  };

  const handleTriggerTask = async (taskId: string) => {
    try {
      await triggerScheduledTask(taskId);
      message.success('任务已触发');
      fetchData();
    } catch (error) {
      message.error('触发任务失败');
    }
  };



  const openCreateTaskModal = () => {
    setEditingTask(null);
    taskForm.resetFields();
    setIsTaskModalOpen(true);
  };

  const openEditTaskModal = (task: ScheduledTask) => {
    setEditingTask(task);
    const config = task.config || {};
    taskForm.setFieldsValue({
      name: task.name,
      description: task.description,
      cron_expression: task.cron_expression,
      enabled: task.enabled,
      agent_id: config.agent_id,
      device_id: config.device_id,
      test_plan_id: config.test_plan_id
    });
    setIsTaskModalOpen(true);
  };

  const getStatusTag = (status: string) => {
    const colors: Record<string, string> = {
      candidate: 'default',
      adopted: 'blue',
      enabled: 'green',
      pending: 'orange',
      running: 'cyan',
      completed: 'green',
      passed: 'green',
      failed: 'red',
      skipped: 'orange'
    };
    const labels: Record<string, string> = {
      candidate: '候选',
      adopted: '已采纳',
      enabled: '已启用',
      pending: '待执行',
      running: '执行中',
      completed: '已完成',
      passed: '通过',
      failed: '失败',
      skipped: '跳过'
    };
    return <Tag color={colors[status] || 'default'}>{labels[status] || status}</Tag>;
  };



  const reqColumns = [
    { title: '标题', dataIndex: 'title', key: 'title', sorter: (a: Requirement, b: Requirement) => a.title.localeCompare(b.title) },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', sorter: (a: Requirement, b: Requirement) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(), render: (text: string) => text ? new Date(text.replace(' ', 'T').endsWith('Z') ? text.replace(' ', 'T') : text.replace(' ', 'T') + 'Z').toLocaleString() : '-' },
    {
      title: '操作', key: 'action', render: (_: any, record: Requirement) => (
        <Space>
          <Button type="link" onClick={() => handleGenerateCases(record.id)}>AI生成用例</Button>
        </Space>
      ),
    },
  ];

  const filteredRuns = useMemo(() => runs.filter(run => run.name.toLowerCase().includes(runSearchText.toLowerCase())), [runs, runSearchText]);

  const runColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id', render: (text: string) => <span style={{ color: '#888', fontSize: '12px' }}>{text.slice(0, 8)}...</span> },
    { title: '执行名称', dataIndex: 'name', key: 'name', sorter: (a: ExecutionRun, b: ExecutionRun) => a.name.localeCompare(b.name), render: (text: string, record: ExecutionRun) => <Link to={`/runs/${record.id}`}>{text}</Link> },
    { 
      title: '状态', 
      dataIndex: 'status', 
      key: 'status', 
      filters: [
        { text: '通过', value: 'passed' },
        { text: '失败', value: 'failed' },
        { text: '跳过', value: 'skipped' },
        { text: '执行中', value: 'running' },
        { text: '待执行', value: 'pending' },
      ],
      onFilter: (value: any, record: ExecutionRun) => record.status === value,
      render: getStatusTag 
    },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', sorter: (a: ExecutionRun, b: ExecutionRun) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(), render: (text: string) => text ? new Date(text.replace(' ', 'T').endsWith('Z') ? text.replace(' ', 'T') : text.replace(' ', 'T') + 'Z').toLocaleString() : '-' },
    { title: '操作', key: 'action', render: (_: any, record: ExecutionRun) => <Button type="link" danger size="small" onClick={() => handleDeleteRun(record.id)}>删除</Button> },
  ];

  const planColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id', render: (text: string) => <span style={{ color: '#888', fontSize: '12px' }}>{text.slice(0, 8)}...</span> },
    { title: '计划名称', dataIndex: 'name', key: 'name', sorter: (a: TestPlan, b: TestPlan) => a.name.localeCompare(b.name) },
    { title: '描述', dataIndex: 'description', key: 'description' },
    { 
      title: '环境', 
      dataIndex: 'env', 
      key: 'env', 
      filters: [
        { text: 'QA', value: 'QA' },
        { text: 'STAGING', value: 'STAGING' },
        { text: 'PROD', value: 'PROD' }
      ],
      onFilter: (value: any, record: TestPlan) => record.env === value,
      render: (text: string) => text ? <Tag color="blue">{text}</Tag> : '-' 
    },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', sorter: (a: TestPlan, b: TestPlan) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(), render: (text: string) => text ? new Date(text.replace(' ', 'T').endsWith('Z') ? text.replace(' ', 'T') : text.replace(' ', 'T') + 'Z').toLocaleString() : '-' },
    { 
      title: '最近执行状态', 
      key: 'latest_run_status', 
      filters: [
        { text: '通过', value: 'passed' },
        { text: '失败', value: 'failed' },
        { text: '跳过', value: 'skipped' },
        { text: '执行中', value: 'running' },
        { text: '待执行', value: 'pending' },
      ],
      onFilter: (value: any, record: TestPlan & { latest_run_status?: string }) => record.latest_run_status === value,
      render: (_: any, record: TestPlan & { latest_run_status?: string, latest_run_id?: string }) => {
        if (!record.latest_run_status) return <span style={{ color: '#999' }}>暂无记录</span>;
        
        return (
          <Space>
            {getStatusTag(record.latest_run_status)}
            {record.latest_run_id && (
              <Link to={`/runs/${record.latest_run_id}`} style={{ fontSize: '12px' }}>
                查看报告
              </Link>
            )}
          </Space>
        );
      }
    },
    {
      title: '操作', key: 'action', render: (_: any, record: TestPlan) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => {
            triggerForm.setFieldsValue({ 
              name: `Run: ${record.name}`,
              working_dir: record.working_dir,
              test_command: record.test_command,
              test_plan_id: record.id
            });
            setIsTriggerModalOpen(true);
          }} icon={<PlayCircleOutlined />}>执行</Button>
          <Popconfirm title="确定删除？" onConfirm={async () => {
            await deleteTestPlan(record.id);
            message.success('已删除');
            fetchData();
          }}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const taskColumns = [
    { title: '任务名称', dataIndex: 'name', key: 'name', sorter: (a: ScheduledTask, b: ScheduledTask) => a.name.localeCompare(b.name) },
    { 
      title: '测试计划', 
      dataIndex: 'config', 
      key: 'test_plan_id', 
      filters: testPlans.map(p => ({ text: p.name, value: p.id })),
      onFilter: (value: any, record: ScheduledTask) => record.config?.test_plan_id === value,
      render: (config: any) => {
        const planId = config?.test_plan_id;
        if (!planId) return '-';
        const plan = testPlans.find(p => p.id === planId);
        return plan ? plan.name : planId;
      }
    },
    { title: 'Cron表达式', dataIndex: 'cron_expression', key: 'cron_expression' },
    { 
      title: '状态', 
      dataIndex: 'enabled', 
      key: 'enabled', 
      filters: [
        { text: '启用', value: true },
        { text: '禁用', value: false },
      ],
      onFilter: (value: any, record: ScheduledTask) => record.enabled === value,
      render: (enabled: boolean) => <Tag color={enabled ? 'green' : 'default'}>{enabled ? '启用' : '禁用'}</Tag> 
    },
    { title: '上次运行', dataIndex: 'last_run_at', key: 'last_run_at', sorter: (a: ScheduledTask, b: ScheduledTask) => new Date(a.last_run_at || 0).getTime() - new Date(b.last_run_at || 0).getTime(), render: (text: string) => text ? new Date(text.replace(' ', 'T').endsWith('Z') ? text.replace(' ', 'T') : text.replace(' ', 'T') + 'Z').toLocaleString() : '-' },
    { title: '下次运行', dataIndex: 'next_run_at', key: 'next_run_at', sorter: (a: ScheduledTask, b: ScheduledTask) => new Date(a.next_run_at || 0).getTime() - new Date(b.next_run_at || 0).getTime(), render: (text: string) => text ? new Date(text.replace(' ', 'T').endsWith('Z') ? text.replace(' ', 'T') : text.replace(' ', 'T') + 'Z').toLocaleString() : '-' },
    {
      title: '操作', key: 'action', render: (_: any, record: ScheduledTask) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditTaskModal(record)}>编辑</Button>
          <Button type="link" size="small" icon={<PlayCircleOutlined />} onClick={() => handleTriggerTask(record.id)}>触发</Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDeleteTask(record.id)}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const onlineAgents = agents.filter(a => a.status === 'online');

  if (!project && !loading) return <div>项目不存在</div>;

  return (
    <div>
      <Title level={2}>{project?.name}</Title>
      <p style={{ marginBottom: 24, color: '#666' }}>{project?.description}</p>

      <Tabs 
        defaultActiveKey="1" 
        items={[
          {
            key: '1',
            label: '需求管理',
            children: (
              <>
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                  <span>共 {requirements.length} 条需求</span>
                  <Space>
                    <Button onClick={() => setIsJiraModalOpen(true)}>从 Jira 导入</Button>
                    <Button type="primary" onClick={() => setIsReqModalOpen(true)}>新建需求</Button>
                  </Space>
                </div>
                <Table dataSource={requirements} columns={reqColumns} rowKey="id" loading={loading} />
              </>
            )
          },
          {
            key: '5',
            label: '测试计划',
            children: (
              <>
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                  <span>共 {testPlans.length} 个测试计划</span>
                  <Button type="primary" onClick={() => setIsPlanModalOpen(true)}>新建测试计划</Button>
                </div>
                <Table 
                  dataSource={sortedTestPlans} 
                  columns={planColumns} 
                  rowKey="id" 
                  loading={loading}
                  expandable={{
                    expandedRowRender: (record) => {
                      const recentRuns = runs
                        .filter(r => r.name.includes(record.name))
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .slice(0, 5); // 展示最近5次

                      if (recentRuns.length === 0) {
                        return <div style={{ padding: '8px 16px', color: '#999' }}>暂无相关执行记录</div>;
                      }

                      return (
                        <div style={{ margin: '8px 16px' }}>
                          <Title level={5}>最近执行记录</Title>
                          <Table
                            dataSource={recentRuns}
                            columns={[
                              { 
                                title: '执行名称', 
                                dataIndex: 'name', 
                                key: 'name',
                                render: (text: string, run: ExecutionRun) => <Link to={`/runs/${run.id}`}>{text}</Link>
                              },
                              { 
                                title: '状态', 
                                dataIndex: 'status', 
                                key: 'status',
                                render: getStatusTag
                              },
                              { 
                                title: '执行时间', 
                                dataIndex: 'created_at', 
                                key: 'created_at',
                                render: (text: string) => text ? new Date(text.replace(' ', 'T').endsWith('Z') ? text.replace(' ', 'T') : text.replace(' ', 'T') + 'Z').toLocaleString() : '-'
                              },
                              {
                                title: '操作',
                                key: 'action',
                                render: (_: any, run: ExecutionRun) => (
                                  <Link to={`/runs/${run.id}`}>
                                    <Button type="link" size="small">查看报告</Button>
                                  </Link>
                                )
                              }
                            ]}
                            rowKey="id"
                            pagination={false}
                            size="small"
                          />
                        </div>
                      );
                    }
                  }}
                />
              </>
            )
          },
          {
            key: '2',
            label: '测试用例',
            children: (
              <div style={{ margin: '-16px' }}>
                <TestCaseManagement embeddedProjectId={id} />
              </div>
            )
          },
          {
            key: '3',
            label: '报告查询',
            children: (
              <>
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                  <Space>
                    <span>共 {filteredRuns.length} 份测试报告</span>
                    <Input.Search 
                      placeholder="搜索报告名称..." 
                      allowClear 
                      onSearch={setRunSearchText} 
                      onChange={(e) => setRunSearchText(e.target.value)}
                      style={{ width: 250 }} 
                    />
                  </Space>
                  <Space>
                    <Button type="primary" onClick={() => setIsTriggerModalOpen(true)} icon={<PlayCircleOutlined />}>
                      执行测试
                    </Button>
                  </Space>
                </div>
                <Table dataSource={filteredRuns} columns={runColumns} rowKey="id" loading={loading} />
              </>
            )
          },
          {
            key: '4',
            label: <span><ClockCircleOutlined />定时任务</span>,
            children: (
              <>
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                  <span>共 {scheduledTasks.length} 条定时任务</span>
                  <Button type="primary" onClick={openCreateTaskModal} icon={<ClockCircleOutlined />}>
                    新建定时任务
                  </Button>
                </div>
                <Table dataSource={scheduledTasks} columns={taskColumns} rowKey="id" loading={loading} />
              </>
            )
          }
        ]}
      />

      <Modal title="新建需求" open={isReqModalOpen} onCancel={() => setIsReqModalOpen(false)} onOk={() => form.submit()} width={600}>
        <Form form={form} layout="vertical" onFinish={handleCreateReq}>
          <Form.Item name="title" label="需求标题" rules={[{ required: true, message: '请输入需求标题' }]}>
            <Input placeholder="例如：登录功能" />
          </Form.Item>
          <Form.Item name="description" label="需求描述">
            <TextArea rows={4} placeholder="详细描述需求..." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="从 Jira 导入需求" open={isJiraModalOpen} onCancel={() => setIsJiraModalOpen(false)} onOk={() => jiraForm.submit()} width={600} confirmLoading={loading}>
        <Form form={jiraForm} layout="vertical" onFinish={handleJiraImport}>
          <Form.Item name="project_key" label="Jira 项目 Key (例如: PROJ)" rules={[{ required: true, message: '请输入 Jira 项目 Key' }]}>
            <Input placeholder="例如：PROJ" />
          </Form.Item>
          <Form.Item name="jql" label="JQL 查询语句" rules={[{ required: true, message: '请输入 JQL' }]}>
            <TextArea rows={3} placeholder="例如：project = PROJ AND issuetype = Story AND status = 'In Progress'" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="新建测试计划" open={isPlanModalOpen} onCancel={() => setIsPlanModalOpen(false)} onOk={() => planForm.submit()} width={600}>
        <Form form={planForm} layout="vertical" onFinish={handleCreatePlan}>
          <Form.Item name="name" label="计划名称" rules={[{ required: true, message: '请输入计划名称' }]}>
            <Input placeholder="例如：V1.0 回归测试计划" />
          </Form.Item>
          <Form.Item name="description" label="计划描述">
            <TextArea rows={3} placeholder="计划描述..." />
          </Form.Item>
          <Form.Item name="env" label="测试环境">
            <Select placeholder="选择测试环境" allowClear>
              <Select.Option value="QA">QA 环境</Select.Option>
              <Select.Option value="STAGING">Staging 预发环境</Select.Option>
              <Select.Option value="PROD">Prod 生产环境</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="working_dir" label="执行工作目录 (可选)">
            <Input placeholder="例如：/path/to/your/workspace 或相对路径" />
          </Form.Item>
          <Form.Item name="test_command" label="自动化执行命令 (可选)">
            <Input placeholder="例如：python3 -m autotest_runner run -plan examples/plan.yaml" />
          </Form.Item>
          <Form.Item name="category" label="执行用例分类">
            <Select placeholder="指定要执行的用例分类（可选）" allowClear>
              <Select.Option value="automated">自动化测试用例</Select.Option>
              <Select.Option value="manual">手工测试用例</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="feature" label="按模块筛选用例 (可选)">
            <Select placeholder="选择功能模块" mode="multiple" allowClear>
              {uniqueFeatures.map(f => (
                <Select.Option key={f as string} value={f}>{f}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="case_ids" label="手动选择用例 (可选)">
            <Select 
              mode="multiple" 
              placeholder="指定需要执行的特定用例" 
              allowClear 
              optionFilterProp="children"
              maxTagCount={3}
            >
              {testCases.map(tc => (
                <Select.Option key={tc.id} value={tc.id}>
                  {tc.feature ? `[${tc.feature}] ` : ''}{tc.title}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="新建执行记录" open={isRunModalOpen} onCancel={() => setIsRunModalOpen(false)} onOk={() => runForm.submit()} width={600}>
        <Form form={runForm} layout="vertical" onFinish={handleCreateRun}>
          <Form.Item name="name" label="执行名称" rules={[{ required: true, message: '请输入执行名称' }]}>
            <Input placeholder="例如：回归测试20240101" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={editingTask ? '编辑定时任务' : '新建定时任务'} open={isTaskModalOpen} onCancel={() => { setIsTaskModalOpen(false); setEditingTask(null); }} onOk={() => taskForm.submit()} width={600}>
        <Form form={taskForm} layout="vertical" onFinish={editingTask ? handleUpdateTask : handleCreateTask}>
          <Form.Item name="name" label="任务名称" rules={[{ required: true, message: '请输入任务名称' }]}>
            <Input placeholder="例如：每日回归测试" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={3} placeholder="任务描述..." />
          </Form.Item>
          <Form.Item name="cron_expression" label="Cron表达式" rules={[{ required: true, message: '请输入Cron表达式' }]}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Select options={CRON_PRESETS} placeholder="选择预设或手动输入" style={{ width: '100%' }} onSelect={(value) => taskForm.setFieldValue('cron_expression', value)} />
              <Input placeholder="例如：0 8 * * * 表示每天早上8点" />
            </Space>
          </Form.Item>
          <Form.Item name="test_plan_id" label="测试计划">
            <Select placeholder="选择测试计划" allowClear>
              {sortedTestPlans.map(plan => (
                <Select.Option key={plan.id} value={plan.id}>{plan.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="agent_id" label="指定Agent（可选）">
            <Select placeholder="选择Agent（不选则随机分配）" allowClear>
              {onlineAgents.map(agent => (
                <Select.Option key={agent.id} value={agent.id}>{agent.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="enabled" label="启用" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="立即执行测试" open={isTriggerModalOpen} onCancel={() => setIsTriggerModalOpen(false)} onOk={() => triggerForm.submit()} width={600}>
        <Form form={triggerForm} layout="vertical" onFinish={handleTriggerExecution}>
          <Form.Item name="name" label="执行名称" rules={[{ required: true, message: '请输入执行名称' }]}>
            <Input placeholder="例如：回归测试" />
          </Form.Item>
          <Form.Item name="agent_id" label="指定Agent（可选）">
            <Select placeholder="选择Agent（不选则随机分配）" allowClear>
              {onlineAgents.map(agent => (
                <Select.Option key={agent.id} value={agent.id}>{agent.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="priority" label="优先级" initialValue={0}>
            <Select>
              <Select.Option value={0}>默认</Select.Option>
              <Select.Option value={1}>低</Select.Option>
              <Select.Option value={5}>中</Select.Option>
              <Select.Option value={10}>高</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="working_dir" label="执行工作目录 (可选)">
            <Input placeholder="例如：/path/to/your/workspace 或相对路径" />
          </Form.Item>
          <Form.Item name="test_command" label="自动化执行命令 (可选)">
            <Input placeholder="例如：python3 -m autotest_runner run -plan examples/plan.yaml" />
          </Form.Item>
          <Form.Item name="test_plan_id" hidden>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
