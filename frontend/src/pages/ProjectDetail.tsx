import React, { useEffect, useState, useMemo } from 'react';
import {
  Tabs, Table, Button, Modal, Form, Input, Space, Tag, message, Typography, Select, Tooltip,
  Switch, Checkbox, Popconfirm
} from 'antd';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { EyeOutlined, EditOutlined, ClockCircleOutlined, PlayCircleOutlined } from '@ant-design/icons';
import {
  getProject, getRequirements, getTestCases, getExecutionRuns, createRequirement, createExecutionRun,
  generateTestCases, adoptTestCase, enableTestCase, Requirement, TestCase, ExecutionRun,
  getAgents, getScheduledTasks, createScheduledTask, updateScheduledTask, deleteScheduledTask,
  triggerScheduledTask, triggerExecution, Agent, ScheduledTask, importJiraRequirements,
  getTestPlans, createTestPlan, deleteTestPlan, TestPlan
} from '../api';

const { Title } = Typography;
const { Search } = Input;
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

  const [isReqModalOpen, setIsReqModalOpen] = useState(false);
  const [isJiraModalOpen, setIsJiraModalOpen] = useState(false);
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isTriggerModalOpen, setIsTriggerModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null);

  const [form] = Form.useForm();
  const [jiraForm] = Form.useForm();
  const [runForm] = Form.useForm();
  const [taskForm] = Form.useForm();
  const [planForm] = Form.useForm();
  const [triggerForm] = Form.useForm();

  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [runSearchText, setRunSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [proj, reqs, cases, executionRuns, allAgents, tasks, plans] = await Promise.all([
        getProject(id),
        getRequirements(id),
        getTestCases(id),
        getExecutionRuns(id),
        getAgents(),
        getScheduledTasks(id),
        getTestPlans(id)
      ]);
      setProject(proj);
      setRequirements(reqs);
      setTestCases(cases);
      setRuns(executionRuns);
      setAgents(allAgents);
      setScheduledTasks(tasks);
      setTestPlans(plans);
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

  const handleCreatePlan = async (values: any) => {
    if (!id) return;
    try {
      await createTestPlan(id, {
        name: values.name,
        description: values.description,
        env: values.env,
        working_dir: values.working_dir,
        test_command: values.test_command,
        case_filters: values.category ? { categories: [values.category] } : null,
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

  const handleAdoptCase = async (caseId: string) => {
    try {
      await adoptTestCase(caseId);
      message.success('用例已采纳');
      fetchData();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleEnableCase = async (caseId: string) => {
    try {
      await enableTestCase(caseId);
      message.success('用例已启用');
      fetchData();
    } catch (error) {
      message.error('操作失败');
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

  const handleTriggerExecution = async (values: any) => {
    if (!id) return;
    try {
      const response = await triggerExecution(id, {
        name: values.name,
        agent_id: values.agent_id,
        device_id: values.device_id,
        priority: values.priority || 0,
        test_case_ids: values.use_selected ? selectedCaseIds : undefined,
        working_dir: values.working_dir,
        test_command: values.test_command
      });
      message.success('执行已触发，即将跳转到报告详情');
      setIsTriggerModalOpen(false);
      triggerForm.resetFields();
      setSelectedCaseIds([]);
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
      device_id: config.device_id
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

  const getPriorityTag = (priority: string) => {
    const colors: Record<string, string> = {
      P0: 'red',
      P1: 'orange',
      P2: 'blue',
      P3: 'default'
    };
    return <Tag color={colors[priority] || 'default'}>{priority}</Tag>;
  };

  const reqColumns = [
    { title: '标题', dataIndex: 'title', key: 'title' },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', render: (text: string) => text ? new Date(text.replace(' ', 'T').endsWith('Z') ? text.replace(' ', 'T') : text.replace(' ', 'T') + 'Z').toLocaleString() : '-' },
    {
      title: '操作', key: 'action', render: (_: any, record: Requirement) => (
        <Space>
          <Button type="link" onClick={() => handleGenerateCases(record.id)}>AI生成用例</Button>
        </Space>
      ),
    },
  ];

  const filteredRuns = useMemo(() => runs.filter(run => run.name.toLowerCase().includes(runSearchText.toLowerCase())), [runs, runSearchText]);

  const filteredTestCases = useMemo(() => {
    return testCases.filter(item => {
      const matchSearch = searchText === '' || item.title.toLowerCase().includes(searchText.toLowerCase());
      const matchStatus = filterStatus === '' || item.status === filterStatus;
      const matchPriority = filterPriority === '' || item.priority === filterPriority;
      const matchCategory = filterCategory === '' || item.case_category === filterCategory;
      return matchSearch && matchStatus && matchPriority && matchCategory;
    });
  }, [testCases, searchText, filterStatus, filterPriority, filterCategory]);

  const caseColumns = [
    {
      title: '选择',
      key: 'selection',
      render: (_: any, record: TestCase) => (
        <Checkbox
          checked={selectedCaseIds.includes(record.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedCaseIds([...selectedCaseIds, record.id]);
            } else {
              setSelectedCaseIds(selectedCaseIds.filter(id => id !== record.id));
            }
          }}
        />
      ),
      width: 50
    },
    {
      title: '用例名称',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: TestCase) => (
        <Link to={`/test-cases/${record.id}`} style={{ color: '#1890ff' }}>
          {text}
        </Link>
      ),
    },
    {
      title: '用例说明',
      dataIndex: 'expected_result',
      key: 'expected_result',
      ellipsis: true,
      render: (text: string) => text || '-'
    },
    { title: '类型', dataIndex: 'case_category', key: 'case_category', render: (text: string) => <Tag>{text === 'manual' ? '手工' : '自动化'}</Tag> },
    { title: '优先级', dataIndex: 'priority', key: 'priority', render: getPriorityTag },
    { title: '状态', dataIndex: 'status', key: 'status', render: getStatusTag },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', render: (text: string) => text ? new Date(text.replace(' ', 'T').endsWith('Z') ? text.replace(' ', 'T') : text.replace(' ', 'T') + 'Z').toLocaleString() : '-' },
    {
      title: '操作', key: 'action', render: (_: any, record: TestCase) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Link to={`/test-cases/${record.id}`}>
              <Button type="link" size="small" icon={<EyeOutlined />} />
            </Link>
          </Tooltip>
          {record.status === 'candidate' && (
            <Button type="link" size="small" onClick={() => handleAdoptCase(record.id)}>采纳</Button>
          )}
          {record.status === 'adopted' && (
            <Button type="link" size="small" onClick={() => handleEnableCase(record.id)}>启用</Button>
          )}
        </Space>
      ),
    },
  ];

  const runColumns = [
    { title: '执行名称', dataIndex: 'name', key: 'name', render: (text: string, record: ExecutionRun) => <Link to={`/runs/${record.id}`}>{text}</Link> },
    { title: '状态', dataIndex: 'status', key: 'status', render: getStatusTag },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', render: (text: string) => text ? new Date(text.replace(' ', 'T').endsWith('Z') ? text.replace(' ', 'T') : text.replace(' ', 'T') + 'Z').toLocaleString() : '-' },
  ];

  const planColumns = [
    { title: '计划名称', dataIndex: 'name', key: 'name' },
    { title: '描述', dataIndex: 'description', key: 'description' },
    { title: '环境', dataIndex: 'env', key: 'env', render: (text: string) => text ? <Tag color="blue">{text}</Tag> : '-' },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', render: (text: string) => text ? new Date(text.replace(' ', 'T').endsWith('Z') ? text.replace(' ', 'T') : text.replace(' ', 'T') + 'Z').toLocaleString() : '-' },
    { 
      title: '最近执行状态', 
      key: 'latest_run_status', 
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
              test_command: record.test_command
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
    { title: '任务名称', dataIndex: 'name', key: 'name' },
    { title: 'Cron表达式', dataIndex: 'cron_expression', key: 'cron_expression' },
    { title: '状态', dataIndex: 'enabled', key: 'enabled', render: (enabled: boolean) => <Tag color={enabled ? 'green' : 'default'}>{enabled ? '启用' : '禁用'}</Tag> },
    { title: '上次运行', dataIndex: 'last_run_at', key: 'last_run_at', render: (text: string) => text ? new Date(text.replace(' ', 'T').endsWith('Z') ? text.replace(' ', 'T') : text.replace(' ', 'T') + 'Z').toLocaleString() : '-' },
    { title: '下次运行', dataIndex: 'next_run_at', key: 'next_run_at', render: (text: string) => text ? new Date(text.replace(' ', 'T').endsWith('Z') ? text.replace(' ', 'T') : text.replace(' ', 'T') + 'Z').toLocaleString() : '-' },
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

      <Tabs defaultActiveKey="1">
        <Tabs.TabPane tab="需求管理" key="1">
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
            <span>共 {requirements.length} 条需求</span>
            <Space>
              <Button onClick={() => setIsJiraModalOpen(true)}>从 Jira 导入</Button>
              <Button type="primary" onClick={() => setIsReqModalOpen(true)}>新建需求</Button>
            </Space>
          </div>
          <Table dataSource={requirements} columns={reqColumns} rowKey="id" loading={loading} />
        </Tabs.TabPane>

        <Tabs.TabPane tab="测试计划" key="5">
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
            <span>共 {testPlans.length} 个测试计划</span>
            <Button type="primary" onClick={() => setIsPlanModalOpen(true)}>新建测试计划</Button>
          </div>
          <Table 
            dataSource={testPlans} 
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
        </Tabs.TabPane>

        <Tabs.TabPane tab="测试用例" key="2">
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Space>
                <span>共 {filteredTestCases.length} 条用例 (总计 {testCases.length} 条)</span>
                {selectedCaseIds.length > 0 && <Tag color="blue">已选 {selectedCaseIds.length} 条</Tag>}
              </Space>
              <Space>
                <Link to={`/projects/${id}/test-cases`}>
                  <Button>用例管理</Button>
                </Link>
                <Button type="primary" onClick={() => setIsTriggerModalOpen(true)} icon={<PlayCircleOutlined />}>
                  执行测试
                </Button>
              </Space>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Search placeholder="搜索用例名称" style={{ width: 240 }} allowClear onChange={(e) => setSearchText(e.target.value)} />
              <Select placeholder="筛选状态" style={{ width: 120 }} allowClear onChange={setFilterStatus}>
                <Select.Option value="candidate">候选</Select.Option>
                <Select.Option value="adopted">已采纳</Select.Option>
                <Select.Option value="enabled">已启用</Select.Option>
              </Select>
              <Select placeholder="筛选优先级" style={{ width: 100 }} allowClear onChange={setFilterPriority}>
                <Select.Option value="P0">P0</Select.Option>
                <Select.Option value="P1">P1</Select.Option>
                <Select.Option value="P2">P2</Select.Option>
                <Select.Option value="P3">P3</Select.Option>
              </Select>
              <Select placeholder="筛选类型" style={{ width: 120 }} allowClear onChange={setFilterCategory}>
                <Select.Option value="manual">手工</Select.Option>
                <Select.Option value="automated">自动化</Select.Option>
              </Select>
            </div>
          </div>
          <Table dataSource={filteredTestCases} columns={caseColumns} rowKey="id" loading={loading} rowSelection={undefined} />
        </Tabs.TabPane>

        <Tabs.TabPane tab="报告查询" key="3">
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
        </Tabs.TabPane>

        <Tabs.TabPane tab={<span><ClockCircleOutlined />定时任务</span>} key="4">
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
            <span>共 {scheduledTasks.length} 条定时任务</span>
            <Button type="primary" onClick={openCreateTaskModal} icon={<ClockCircleOutlined />}>
              新建定时任务
            </Button>
          </div>
          <Table dataSource={scheduledTasks} columns={taskColumns} rowKey="id" loading={loading} />
        </Tabs.TabPane>
      </Tabs>

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
            <Input placeholder="例如：/Users/bytedance/Documents/AutoTestRunner" />
          </Form.Item>
          <Form.Item name="test_command" label="自动化执行命令 (可选)">
            <Input placeholder="例如：pytest tests/" />
          </Form.Item>
          <Form.Item name="category" label="执行用例分类">
            <Select placeholder="指定要执行的用例分类（可选）" allowClear>
              <Select.Option value="automated">自动化测试用例</Select.Option>
              <Select.Option value="manual">手工测试用例</Select.Option>
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
          <Form.Item name="use_selected" label="只执行选中的用例" valuePropName="checked" initialValue={false} extra={`已选择 ${selectedCaseIds.length} 条用例`}>
            <Switch disabled={selectedCaseIds.length === 0} />
          </Form.Item>
          <Form.Item name="working_dir" label="执行工作目录 (可选)">
            <Input placeholder="例如：/Users/bytedance/Documents/AutoTestRunner" />
          </Form.Item>
          <Form.Item name="test_command" label="自动化执行命令 (可选)">
            <Input placeholder="例如：pytest tests/" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
