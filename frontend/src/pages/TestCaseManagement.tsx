import React, { useEffect, useState, useMemo } from 'react';
import { Table, Button, Modal, Form, Input, Select, Tag, message, Space, Typography, Popconfirm, Card, Row, Col, Statistic, Tooltip, Tabs, Tree } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, RobotOutlined, CheckCircleOutlined, ArrowLeftOutlined, UnorderedListOutlined, PartitionOutlined, CheckOutlined } from '@ant-design/icons';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { getProject, getProjects, getRequirements, getTestCases, createTestCase, updateTestCase, deleteTestCase, generateTestCasesV2, adoptTestCase, enableTestCase, Requirement, TestCase, Project } from '../api';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

export const TestCaseManagement: React.FC<{ embeddedProjectId?: string }> = ({ embeddedProjectId }) => {
  const location = useLocation();
  const navigate = useNavigate();
  // Get projectId from URL search params if exists
  const queryParams = new URLSearchParams(location.search);
  const initialProjectId = queryParams.get('project_id') || undefined;

  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(embeddedProjectId || initialProjectId);
  const [projects, setProjects] = useState<Project[]>([]);
  const [project, setProject] = useState<any>(null);
  
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<TestCase | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'tree'>('table');
  const [generateMode, setGenerateMode] = useState<'req' | 'text'>('req');
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [featureFilter, setFeatureFilter] = useState<string | undefined>(undefined);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [generateForm] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // Load all projects for the dropdown
  useEffect(() => {
    getProjects().then(setProjects).catch(console.error);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const cases = await getTestCases(selectedProjectId);
      setTestCases(cases);
      
      if (selectedProjectId) {
        const [proj, reqs] = await Promise.all([
          getProject(selectedProjectId),
          getRequirements(selectedProjectId)
        ]);
        setProject(proj);
        setRequirements(reqs);
      } else {
        setProject(null);
        setRequirements([]);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedProjectId]);

  const handleProjectChange = (val: string) => {
    setSelectedProjectId(val);
    navigate(`/test-cases${val ? `?project_id=${val}` : ''}`, { replace: true });
  };


  const getStatusTag = (status: string) => {
    const colors: Record<string, string> = {
      candidate: 'default',
      adopted: 'blue',
      enabled: 'green',
    };
    const labels: Record<string, string> = {
      candidate: '候选',
      adopted: '已采纳',
      enabled: '已启用',
    };
    return <Tag color={colors[status] || 'default'}>{labels[status] || status}</Tag>;
  };

  const getPriorityTag = (priority: string) => {
    const colors: Record<string, string> = {
      P0: 'red',
      P1: 'orange',
      P2: 'blue',
      P3: 'default',
    };
    return <Tag color={colors[priority] || 'default'}>{priority}</Tag>;
  };

  const handleCreateCase = async (values: any) => {
    if (!selectedProjectId) {
      message.error('请先选择一个项目');
      return;
    }
    try {
      await createTestCase(selectedProjectId, values);
      message.success('用例创建成功');
      setIsCreateModalOpen(false);
      form.resetFields();
      fetchData();
    } catch (error) {
      message.error('创建用例失败');
    }
  };

  const handleEditCase = async (values: any) => {
    if (!editingCase) return;
    try {
      const steps = values.steps ? values.steps.split('\n').filter((s: string) => s.trim()) : [];
      await updateTestCase(editingCase.id, { ...values, steps });
      message.success('用例更新成功');
      setIsEditModalOpen(false);
      editForm.resetFields();
      setEditingCase(null);
      fetchData();
    } catch (error) {
      message.error('更新用例失败');
    }
  };

  const handleDeleteCase = async (caseId: string) => {
    try {
      await deleteTestCase(caseId);
      message.success('用例删除成功');
      fetchData();
    } catch (error) {
      message.error('删除用例失败');
    }
  };

  const handleGenerateCases = async (values: any) => {
    if (!selectedProjectId) return;
    if (generateMode === 'req' && !values.requirement_id) {
      message.error('请选择需求');
      return;
    }
    if (generateMode === 'text' && !values.content) {
      message.error('请输入内容');
      return;
    }
    
    try {
      setIsGenerating(true);
      const payload: any = { feature: values.feature };
      if (generateMode === 'req') {
        payload.requirement_id = values.requirement_id;
      } else {
        payload.content = values.content;
      }
      
      await generateTestCasesV2(selectedProjectId, payload);
      message.success('测试用例生成成功');
      setIsGenerateModalOpen(false);
      generateForm.resetFields();
      setTimeout(fetchData, 500);
    } catch (error) {
      message.error('生成用例失败');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBatchAdopt = async () => {
    const candidates = testCases.filter(c => c.status === 'candidate');
    if (candidates.length === 0) {
      message.info('没有需要采纳的候选用例');
      return;
    }
    const hide = message.loading(`正在采纳 ${candidates.length} 个用例...`, 0);
    try {
      await Promise.all(candidates.map(c => adoptTestCase(c.id)));
      message.success(`成功采纳 ${candidates.length} 个用例`);
      fetchData();
    } catch (error) {
      message.error('批量采纳失败');
    } finally {
      hide();
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的用例');
      return;
    }
    const hide = message.loading(`正在删除 ${selectedRowKeys.length} 个用例...`, 0);
    try {
      await Promise.all(selectedRowKeys.map(key => deleteTestCase(key as string)));
      message.success(`成功删除 ${selectedRowKeys.length} 个用例`);
      setSelectedRowKeys([]);
      fetchData();
    } catch (error) {
      message.error('批量删除失败');
    } finally {
      hide();
    }
  };

  const handleOpenEditModal = (record: TestCase) => {
    setEditingCase(record);
    editForm.setFieldsValue({
      ...record,
      steps: record.steps?.join('\n') || '',
    });
    setIsEditModalOpen(true);
  };

  const uniqueFeatures = useMemo(() => {
    const features = testCases.map(c => c.feature).filter(Boolean);
    return Array.from(new Set(features));
  }, [testCases]);

  const columns: any[] = [
    {
      title: '用例标题',
      dataIndex: 'title',
      key: 'title',
      sorter: (a: TestCase, b: TestCase) => a.title.localeCompare(b.title),
      render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: '用例说明',
      dataIndex: 'expected_result',
      key: 'expected_result',
      ellipsis: true,
      render: (text: string) => text || '-',
    },
    {
      title: '关联需求',
      dataIndex: 'requirement_id',
      key: 'requirement_id',
      filters: requirements.map(r => ({ text: r.title, value: r.id })),
      onFilter: (value: any, record: TestCase) => record.requirement_id === value,
      render: (reqId: string) => {
        const req = requirements.find(r => r.id === reqId);
        return req ? <Tag color="blue">{req.title}</Tag> : '-';
      },
    },
    {
      title: '功能模块',
      dataIndex: 'feature',
      key: 'feature',
      filters: uniqueFeatures.map(f => ({ text: f, value: f })),
      onFilter: (value: any, record: TestCase) => record.feature === value,
      render: (text: string) => text ? <Tag color="purple">{text}</Tag> : '-',
    },
    {
      title: '类型',
      dataIndex: 'case_category',
      key: 'case_category',
      filters: [
        { text: '手工', value: 'manual' },
        { text: '自动化', value: 'automated' },
      ],
      onFilter: (value: any, record: TestCase) => record.case_category === value,
      render: (text: string) => <Tag>{text === 'manual' ? '手工' : '自动化'}</Tag>,
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      filters: [
        { text: 'P0', value: 'P0' },
        { text: 'P1', value: 'P1' },
        { text: 'P2', value: 'P2' },
        { text: 'P3', value: 'P3' },
      ],
      onFilter: (value: any, record: TestCase) => record.priority === value,
      sorter: (a: TestCase, b: TestCase) => {
        const order: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
        return (order[a.priority] ?? 99) - (order[b.priority] ?? 99);
      },
      render: getPriorityTag,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      filters: [
        { text: '候选', value: 'candidate' },
        { text: '已采纳', value: 'adopted' },
        { text: '已启用', value: 'enabled' },
      ],
      onFilter: (value: any, record: TestCase) => record.status === value,
      render: getStatusTag,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      sorter: (a: TestCase, b: TestCase) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      width: 280,
      render: (_: any, record: TestCase) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleOpenEditModal(record)} />
          </Tooltip>
          <Tooltip title="编辑">
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleOpenEditModal(record)} />
          </Tooltip>
          {record.status === 'candidate' && (
            <Button type="link" size="small" onClick={async () => {
              await adoptTestCase(record.id);
              fetchData();
              message.success('用例已采纳');
            }}>
              采纳
            </Button>
          )}
          {record.status === 'adopted' && (
            <Button type="link" size="small" onClick={async () => {
              await enableTestCase(record.id);
              fetchData();
              message.success('用例已启用');
            }}>
              启用
            </Button>
          )}
          <Popconfirm
            title="确认删除"
            description="确定要删除这个测试用例吗？"
            onConfirm={() => handleDeleteCase(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const treeData = useMemo(() => {
    // 按照 Requirement / Feature -> Case Category -> Cases 的层级分组
    const tree: any[] = [];
    const featureMap = new Map<string, any>();
    
    testCases.forEach(tc => {
      let groupName = tc.feature || '未分类功能';
      if (tc.requirement_id) {
        const req = requirements.find(r => r.id === tc.requirement_id);
        if (req) groupName = `需求: ${req.title}`;
      }
      
      if (!featureMap.has(groupName)) {
        featureMap.set(groupName, {
          title: groupName,
          key: `group-${groupName}`,
          children: []
        });
        tree.push(featureMap.get(groupName));
      }
      
      const groupNode = featureMap.get(groupName);
      
      // 子节点按自动化/手工分类
      let catNode = groupNode.children.find((c: any) => c.title === (tc.case_category === 'automated' ? '自动化用例' : '手工用例'));
      if (!catNode) {
        catNode = {
          title: tc.case_category === 'automated' ? '自动化用例' : '手工用例',
          key: `cat-${groupName}-${tc.case_category}`,
          children: []
        };
        groupNode.children.push(catNode);
      }
      
      catNode.children.push({
        title: (
          <Space>
            <span>{tc.title}</span>
            {getPriorityTag(tc.priority)}
            {getStatusTag(tc.status)}
            {tc.expected_result && <span style={{ color: '#888', fontSize: '12px', marginLeft: '8px' }}>- {tc.expected_result}</span>}
          </Space>
        ),
        key: tc.id,
        isLeaf: true,
        record: tc
      });
    });
    
    return tree;
  }, [testCases, requirements]);

  const stats = useMemo(() => {
    const total = testCases.length;
    const candidate = testCases.filter(c => c.status === 'candidate').length;
    const adopted = testCases.filter(c => c.status === 'adopted').length;
    const enabled = testCases.filter(c => c.status === 'enabled').length;
    return { total, candidate, adopted, enabled };
  }, [testCases]);

  const filteredTestCases = useMemo(() => {
    if (!featureFilter) return testCases;
    return testCases.filter(c => c.feature === featureFilter);
  }, [testCases, featureFilter]);

  return (
    <div>
      {!embeddedProjectId && (
        <Space style={{ marginBottom: 24 }}>
          <Select 
            placeholder="选择项目查看" 
            style={{ width: 240 }} 
            value={selectedProjectId} 
            onChange={handleProjectChange}
            allowClear
          >
            {projects.map(p => (
              <Option key={p.id} value={p.id}>{p.name}</Option>
            ))}
          </Select>
          {selectedProjectId && (
            <Link to={`/projects/${selectedProjectId}`}>
              <Button icon={<ArrowLeftOutlined />}>进入项目详情</Button>
            </Link>
          )}
        </Space>
      )}
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        {!embeddedProjectId ? (
          <div>
            <Title level={2} style={{ margin: 0 }}>全局用例管理</Title>
            {project && <span style={{ color: '#666' }}>当前筛选项目: {project.name}</span>}
          </div>
        ) : <div />}
        <Space>
          {selectedRowKeys.length > 0 && (
            <Popconfirm
              title={`确定要删除选中的 ${selectedRowKeys.length} 个用例吗？`}
              onConfirm={handleBatchDelete}
              okText="删除"
              cancelText="取消"
            >
              <Button danger icon={<DeleteOutlined />}>
                一键删除
              </Button>
            </Popconfirm>
          )}
          <Button 
            type="primary"
            ghost
            icon={<CheckOutlined />} 
            onClick={handleBatchAdopt}
            disabled={!selectedProjectId || !testCases.some(c => c.status === 'candidate')}
          >
            一键采纳
          </Button>
          <Button 
            type="default" 
            icon={<RobotOutlined />} 
            onClick={() => setIsGenerateModalOpen(true)}
            disabled={!selectedProjectId}
          >
            AI 智能生成
          </Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => setIsCreateModalOpen(true)}
            disabled={!selectedProjectId}
          >
            新建用例
          </Button>
        </Space>
      </div>

      {!selectedProjectId ? (
        <Card style={{ textAlign: 'center', padding: '60px 0', background: '#fafafa', border: '1px dashed #d9d9d9' }}>
          <Typography.Title level={4} style={{ color: '#888' }}>请在左上角选择一个项目</Typography.Title>
          <p style={{ color: '#aaa' }}>用例必须归属于某个项目。选择项目后即可查看、新建和生成测试用例。</p>
        </Card>
      ) : (
        <>
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Card>
                <Statistic title="总用例数" value={stats.total} prefix={<CheckCircleOutlined />} />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title="候选用例" value={stats.candidate} valueStyle={{ color: '#999' }} />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title="已采纳" value={stats.adopted} valueStyle={{ color: '#1890ff' }} />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title="已启用" value={stats.enabled} valueStyle={{ color: '#52c41a' }} />
              </Card>
            </Col>
          </Row>

          <div style={{ marginBottom: 16 }}>
            <span style={{ marginRight: 8 }}>筛选功能模块:</span>
            <Select 
              style={{ width: 200 }} 
              placeholder="全部模块" 
              allowClear 
              value={featureFilter}
              onChange={(val) => setFeatureFilter(val)}
            >
              {uniqueFeatures.map(f => (
                <Select.Option key={f} value={f}>{f}</Select.Option>
              ))}
            </Select>
          </div>

          <Tabs 
            activeKey={viewMode} 
            onChange={(k) => setViewMode(k as any)}
            items={[
              {
                key: 'table',
                label: <span><UnorderedListOutlined /> 列表视图</span>,
                children: (
                  <Table
                    rowSelection={{
                      selectedRowKeys,
                      onChange: (newSelectedRowKeys) => setSelectedRowKeys(newSelectedRowKeys),
                    }}
                    dataSource={filteredTestCases}
                    columns={columns}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                      current: pagination.current,
                      pageSize: pagination.pageSize,
                      showSizeChanger: true,
                      showTotal: (total) => `共 ${total} 条`,
                      onChange: (page, pageSize) => {
                        setPagination({ current: page, pageSize });
                      }
                    }}
                  />
                )
              },
              {
                key: 'tree',
                label: <span><PartitionOutlined /> 脑图/树状视图</span>,
                children: (
                  <Card style={{ minHeight: 400 }}>
                    {treeData.length > 0 ? (
                      <Tree
                        showLine
                        defaultExpandAll
                        treeData={treeData}
                        titleRender={(nodeData: any) => {
                          if (nodeData.isLeaf) {
                            return (
                              <div onClick={() => handleOpenEditModal(nodeData.record)} style={{ cursor: 'pointer' }}>
                                {nodeData.title}
                              </div>
                            );
                          }
                          return <strong>{nodeData.title}</strong>;
                        }}
                      />
                    ) : (
                      <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>暂无用例数据</div>
                    )}
                  </Card>
                )
              }
            ]}
          />
        </>
      )}

      <Modal
        title="新建测试用例"
        open={isCreateModalOpen}
        onCancel={() => {
          setIsCreateModalOpen(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateCase}>
          <Form.Item
            name="title"
            label="用例标题"
            rules={[{ required: true, message: '请输入用例标题' }]}
          >
            <Input placeholder="请输入用例标题" />
          </Form.Item>

          <Form.Item
            name="requirement_id"
            label="关联需求"
          >
            <Select placeholder="选择关联需求（可选）" allowClear>
              {requirements.map(req => (
                <Option key={req.id} value={req.id}>{req.title}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="feature"
            label="功能模块"
            rules={[{ required: true, message: '请输入功能模块' }]}
          >
            <Input placeholder="关联功能模块" />
          </Form.Item>

          <Form.Item
            name="case_category"
            label="用例类型"
            rules={[{ required: true, message: '请选择用例类型' }]}
          >
            <Select placeholder="选择用例类型">
              <Option value="manual">手工测试</Option>
              <Option value="automated">自动化测试</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="priority"
            label="优先级"
            rules={[{ required: true, message: '请选择优先级' }]}
          >
            <Select placeholder="选择优先级">
              <Option value="P0">P0 - 最高优先级</Option>
              <Option value="P1">P1 - 高优先级</Option>
              <Option value="P2">P2 - 中优先级</Option>
              <Option value="P3">P3 - 低优先级</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="status"
            label="初始状态"
            rules={[{ required: true, message: '请选择初始状态' }]}
            initialValue="candidate"
          >
            <Select>
              <Option value="candidate">候选</Option>
              <Option value="adopted">已采纳</Option>
              <Option value="enabled">已启用</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="steps"
            label="测试步骤"
          >
            <TextArea rows={6} placeholder="每行一个测试步骤" />
          </Form.Item>

          <Form.Item
            name="expected_result"
            label="预期结果"
          >
            <TextArea rows={4} placeholder="请输入预期结果" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="编辑测试用例"
        open={isEditModalOpen}
        onCancel={() => {
          setIsEditModalOpen(false);
          editForm.resetFields();
          setEditingCase(null);
        }}
        onOk={() => editForm.submit()}
        width={700}
      >
        <Form form={editForm} layout="vertical" onFinish={handleEditCase}>
          <Form.Item
            name="title"
            label="用例标题"
            rules={[{ required: true, message: '请输入用例标题' }]}
          >
            <Input placeholder="请输入用例标题" />
          </Form.Item>

          <Form.Item
            name="requirement_id"
            label="关联需求"
          >
            <Select placeholder="选择关联需求（可选）" allowClear>
              {requirements.map(req => (
                <Option key={req.id} value={req.id}>{req.title}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="feature"
            label="功能模块"
            rules={[{ required: true, message: '请输入功能模块' }]}
          >
            <Input placeholder="关联功能模块" />
          </Form.Item>

          <Form.Item
            name="case_category"
            label="用例类型"
            rules={[{ required: true, message: '请选择用例类型' }]}
          >
            <Select placeholder="选择用例类型">
              <Option value="manual">手工测试</Option>
              <Option value="automated">自动化测试</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="priority"
            label="优先级"
            rules={[{ required: true, message: '请选择优先级' }]}
          >
            <Select placeholder="选择优先级">
              <Option value="P0">P0 - 最高优先级</Option>
              <Option value="P1">P1 - 高优先级</Option>
              <Option value="P2">P2 - 中优先级</Option>
              <Option value="P3">P3 - 低优先级</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select>
              <Option value="candidate">候选</Option>
              <Option value="adopted">已采纳</Option>
              <Option value="enabled">已启用</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="steps"
            label="测试步骤"
          >
            <TextArea rows={6} placeholder="每行一个测试步骤" />
          </Form.Item>

          <Form.Item
            name="expected_result"
            label="预期结果"
          >
            <TextArea rows={4} placeholder="请输入预期结果" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="AI 智能生成测试用例"
        open={isGenerateModalOpen}
        onCancel={() => {
          setIsGenerateModalOpen(false);
          generateForm.resetFields();
        }}
        onOk={() => generateForm.submit()}
        confirmLoading={isGenerating}
        width={700}
      >
        <Form form={generateForm} layout="vertical" onFinish={handleGenerateCases}>
          <Tabs 
            activeKey={generateMode} 
            onChange={(k) => setGenerateMode(k as any)}
            items={[
              {
                key: 'req',
                label: '基于已有需求生成',
                children: (
                  <Form.Item
                    name="requirement_id"
                    label="选择需求"
                    rules={generateMode === 'req' ? [{ required: true, message: '请选择需求' }] : []}
                  >
                    <Select placeholder="选择一个需求来生成用例">
                      {requirements.map(req => (
                        <Option key={req.id} value={req.id}>{req.title}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                )
              },
              {
                key: 'text',
                label: '基于文本/文档生成',
                children: (
                  <Form.Item
                    name="content"
                    label="需求描述 / 业务逻辑 / PRD内容"
                    rules={generateMode === 'text' ? [{ required: true, message: '请输入内容' }] : []}
                  >
                    <TextArea 
                      rows={8} 
                      placeholder="在这里粘贴任何业务描述、需求文档内容、或者接口逻辑，AI会自动为您梳理出测试点并生成结构化测试用例。" 
                    />
                  </Form.Item>
                )
              }
            ]}
          />
          <Form.Item
            name="feature"
            label="功能模块"
            rules={[{ required: true, message: '请指定功能模块' }]}
          >
            <Input placeholder="输入此批用例所属的功能模块 (如: 登录、支付)" />
          </Form.Item>
        </Form>
        <div style={{ color: '#666', fontSize: '13px', marginTop: 16, padding: '12px', background: '#f5f5f5', borderRadius: 4 }}>
          <p style={{ margin: '0 0 8px 0' }}>💡 <strong>AI 生成说明：</strong></p>
          <p style={{ margin: '0 0 4px 0' }}>• AI 会分析业务逻辑，自动生成 <strong>自动化测试</strong> 和 <strong>手工测试</strong> 用例</p>
          <p style={{ margin: '0 0 4px 0' }}>• 生成的用例初始状态为 <Tag>候选</Tag>，不会立即生效</p>
          <p style={{ margin: 0 }}>• 建议在列表中审核生成结果，点击 <strong>采纳</strong> 或 <strong>启用</strong></p>
        </div>
      </Modal>
    </div>
  );
};
