import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, Tag, message, Space, Upload, Tooltip } from 'antd';
import { UploadOutlined, BugOutlined, EditOutlined } from '@ant-design/icons';
import { useParams, Link } from 'react-router-dom';
import { api, createDefect, IntegrationConfig, getIntegrationConfigs } from '../api';

export const ExecutionRun: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [results, setResults] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingResultId, setEditingResultId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<any[]>([]);
  
  // Bug creation state
  const [isBugModalOpen, setIsBugModalOpen] = useState(false);
  const [bugForm] = Form.useForm();
  const [currentTestCaseId, setCurrentTestCaseId] = useState<string>('');
  const [currentResultId, setCurrentResultId] = useState<string>('');
  const [integrationConfigs, setIntegrationConfigs] = useState<IntegrationConfig[]>([]);

  const [runDetails, setRunDetails] = useState<any>(null);

  const fetchResults = async () => {
    try {
      const runRes = await api.get(`/execution-runs/${id}`);
      setRunDetails(runRes.data);
      const res = await api.get(`/execution-runs/${id}/results`);
      setResults(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchIntegrations = async () => {
    try {
      const configs = await getIntegrationConfigs();
      setIntegrationConfigs(configs);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchResults();
    fetchIntegrations();
  }, [id]);

  const openEditModal = (record: any) => {
    setEditingResultId(record.id);
    form.setFieldsValue({
      status: record.status !== 'pending' ? record.status : undefined,
      error_message: record.error_message || '',
    });
    setFileList(record.log_url ? [{ uid: '-1', name: 'attachment', status: 'done', url: record.log_url }] : []);
    setIsModalOpen(true);
  };

  const handleSubmitResult = async (values: any) => {
    let log_url = '';
    if (fileList.length > 0 && fileList[0].response) {
      log_url = fileList[0].response.url;
    } else if (fileList.length > 0 && fileList[0].url) {
      log_url = fileList[0].url;
    }

    const payload = {
      ...values,
      test_case_id: values.test_case_id || 'virtual-case-for-plan',
      log_url
    };

    try {
      if (editingResultId) {
        await api.put(`/execution-results/${editingResultId}`, payload);
        message.success('测试结果已更新');
      } else {
        await api.post(`/execution-runs/${id}/results`, payload);
        message.success('测试结果已录入');
      }
      setIsModalOpen(false);
      form.resetFields();
      setFileList([]);
      setEditingResultId(null);
      fetchResults();
    } catch (e) {
      message.error('操作失败');
    }
  };

  const handleUploadChange = ({ fileList: newFileList }: any) => {
    setFileList(newFileList);
  };

  const openBugModal = (record: any) => {
    setCurrentTestCaseId(record.test_case_id);
    setCurrentResultId(record.id);
    bugForm.setFieldsValue({
      title: `[Bug] ${record.case_title || '测试执行失败'}`,
      description: record.error_message ? `错误信息：\n${record.error_message}` : '',
      severity: 'high',
      priority: 'P1'
    });
    setIsBugModalOpen(true);
  };

  const handleCreateBug = async (values: any) => {
    try {
      await createDefect(runDetails?.project_id || 'default', {
        title: values.title,
        description: values.description,
        severity: values.severity,
        priority: values.priority,
        status: 'open',
        test_case_id: currentTestCaseId,
        execution_result_id: currentResultId,
        external_source: values.integration_id ? integrationConfigs.find(c => c.id === values.integration_id)?.integration_type : undefined,
      });
      message.success('Bug 创建成功' + (values.integration_id ? '，并已同步到外部系统' : ''));
      setIsBugModalOpen(false);
      bugForm.resetFields();
    } catch (e) {
      message.error('Bug 创建失败');
    }
  };

  const columns = [
    { title: '用例名称', dataIndex: 'case_title', key: 'case_title', render: (t: string, r: any) => <div><div>{t}</div><div style={{fontSize: 12, color: '#888'}}>{r.test_case_id.slice(0,8)}...</div></div> },
    { title: '用例描述', dataIndex: 'case_description', key: 'case_description', ellipsis: true },
    { title: '执行状态', dataIndex: 'status', key: 'status', 
      filters: [
        { text: '通过', value: 'passed' },
        { text: '失败', value: 'failed' },
        { text: '跳过', value: 'skipped' },
        { text: '异常', value: 'error' },
        { text: '待执行', value: 'pending' },
      ],
      onFilter: (value: any, record: any) => record.status === value,
      render: (t: string) => {
      const colors: any = { passed: 'green', failed: 'red', skipped: 'default', error: 'orange', pending: 'blue' };
      const labels: any = { passed: '通过', failed: '失败', skipped: '跳过', error: '异常', pending: '待执行' };
      return <Tag color={colors[t] || 'default'}>{labels[t] || t.toUpperCase()}</Tag>;
    }},
    { title: '错误信息/附件', dataIndex: 'error_message', key: 'error_message', render: (t: string, r: any) => (
      <div>
        <div>{t}</div>
        {r.log_url && (
          <a href={r.log_url.startsWith('http') || r.log_url.startsWith('/') ? r.log_url : `http://localhost:8000${r.log_url}`} target="_blank" rel="noreferrer">
            查看附件/日志
          </a>
        )}
      </div>
    )},
    { title: '执行时间', dataIndex: 'executed_at', key: 'executed_at', sorter: (a: any, b: any) => new Date(a.executed_at).getTime() - new Date(b.executed_at).getTime(), render: (t: string) => t ? new Date(t).toLocaleString() : '-' },
    {
      title: '操作', key: 'action', render: (_: any, record: any) => (
        <Space>
          <Tooltip title="更新执行结果/上传附件">
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)}>
              录入结果
            </Button>
          </Tooltip>
          {record.status === 'failed' && (
            <Tooltip title="一键创建缺陷(Bug)并同步">
              <Button type="link" danger size="small" icon={<BugOutlined />} onClick={() => openBugModal(record)}>
                提Bug
              </Button>
            </Tooltip>
          )}
        </Space>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>执行批次详情: {runDetails?.name || id}</h2>
        <Space>
          <Link to={runDetails?.project_id ? `/projects/${runDetails.project_id}` : "/projects"}><Button>返回项目详情</Button></Link>
          <Button type="primary" onClick={() => { setEditingResultId(null); setIsModalOpen(true); }}>录入手工测试结果</Button>
        </Space>
      </div>

      <Table dataSource={results} columns={columns} rowKey="id" />

      <Modal title="提交手工测试结果" open={isModalOpen} onCancel={() => { setIsModalOpen(false); setFileList([]); setEditingResultId(null); }} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={handleSubmitResult}>
          {!editingResultId && (
            <Form.Item name="test_case_id" label="测试用例 ID" rules={[{ required: true, message: '请填写用例 ID' }]}>
              <Input placeholder="输入待执行的用例 UUID" />
            </Form.Item>
          )}
          <Form.Item name="status" label="测试状态" rules={[{ required: true, message: '请选择状态' }]}>
            <Select placeholder="请选择执行结果">
              <Select.Option value="passed">通过 (Passed)</Select.Option>
              <Select.Option value="failed">失败 (Failed)</Select.Option>
              <Select.Option value="skipped">跳过 (Skipped)</Select.Option>
              <Select.Option value="error">环境异常 (Error)</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="error_message" label="备注/错误描述">
            <Input.TextArea rows={3} placeholder="请简要描述现象..." />
          </Form.Item>
          <Form.Item label="附件上传 (可选)">
            <Upload 
              action="http://localhost:8000/api/upload" 
              listType="picture" 
              maxCount={1}
              fileList={fileList}
              onChange={handleUploadChange}
            >
              <Button icon={<UploadOutlined />}>点击上传截图或日志</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="一键创建缺陷 (Bug)" open={isBugModalOpen} onCancel={() => setIsBugModalOpen(false)} onOk={() => bugForm.submit()}>
        <Form form={bugForm} layout="vertical" onFinish={handleCreateBug}>
          <Form.Item name="title" label="Bug 标题" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="详细描述">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="severity" label="严重程度" initialValue="high">
            <Select>
              <Select.Option value="critical">致命 (Critical)</Select.Option>
              <Select.Option value="high">高 (High)</Select.Option>
              <Select.Option value="medium">中 (Medium)</Select.Option>
              <Select.Option value="low">低 (Low)</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="priority" label="优先级" initialValue="P1">
            <Select>
              <Select.Option value="P0">P0</Select.Option>
              <Select.Option value="P1">P1</Select.Option>
              <Select.Option value="P2">P2</Select.Option>
              <Select.Option value="P3">P3</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="integration_id" label="同步到外部系统 (可选)">
            <Select placeholder="选择配置好的 Jira 或 飞书 项目进行同步" allowClear>
              {integrationConfigs.map(c => (
                <Select.Option key={c.id} value={c.id}>
                  {c.name} ({c.integration_type})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
