import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, Tag, message, Space } from 'antd';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';

export const ExecutionRun: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [results, setResults] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchResults = async () => {
    try {
      const res = await api.get(`/execution-runs/${id}/results`);
      setResults(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [id]);

  const handleSubmitResult = async (values: any) => {
    await api.post(`/execution-runs/${id}/results`, values);
    setIsModalOpen(false);
    form.resetFields();
    message.success('测试结果已录入');
    fetchResults();
  };

  const columns = [
    { title: '用例 ID (UUID)', dataIndex: 'test_case_id', key: 'test_case_id' },
    { title: '执行状态', dataIndex: 'status', key: 'status', render: (t: string) => {
      const colors: any = { passed: 'green', failed: 'red', skipped: 'default', error: 'orange' };
      const labels: any = { passed: '通过', failed: '失败', skipped: '跳过', error: '异常' };
      return <Tag color={colors[t] || 'default'}>{labels[t] || t.toUpperCase()}</Tag>;
    }},
    { title: '错误信息/日志', dataIndex: 'error_message', key: 'error_message' },
    { title: '执行时间', dataIndex: 'executed_at', key: 'executed_at', render: (t: string) => new Date(t).toLocaleString() },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>执行批次详情 (结果报告)</h2>
        <Space>
          <Link to="/projects"><Button>返回项目列表</Button></Link>
          <Button type="primary" onClick={() => setIsModalOpen(true)}>录入手工测试结果</Button>
        </Space>
      </div>

      <Table dataSource={results} columns={columns} rowKey="id" />

      <Modal title="提交手工测试结果" open={isModalOpen} onCancel={() => setIsModalOpen(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={handleSubmitResult}>
          <Form.Item name="test_case_id" label="测试用例 ID" rules={[{ required: true, message: '请填写用例 ID' }]}>
            <Input placeholder="输入待执行的用例 UUID" />
          </Form.Item>
          <Form.Item name="status" label="测试状态" rules={[{ required: true, message: '请选择状态' }]}>
            <Select placeholder="请选择执行结果">
              <Select.Option value="passed">通过 (Passed)</Select.Option>
              <Select.Option value="failed">失败 (Failed)</Select.Option>
              <Select.Option value="skipped">跳过 (Skipped)</Select.Option>
              <Select.Option value="error">环境异常 (Error)</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="error_message" label="错误描述 / 日志备注 (失败时必填)">
            <Input.TextArea rows={3} placeholder="请简要描述错误现象或粘贴日志片段" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
