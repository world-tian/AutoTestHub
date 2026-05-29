import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input } from 'antd';
import { Link } from 'react-router-dom';
import { api } from '../api';

export const Projects: React.FC = () => {
  const [projects, setProjects] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchProjects = async () => {
    const res = await api.get('/projects');
    setProjects(res.data);
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreate = async (values: any) => {
    await api.post('/projects', values);
    setIsModalOpen(false);
    form.resetFields();
    fetchProjects();
  };

  const columns = [
    {
      title: '项目名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: any) => <Link to={`/projects/${record.id}`}>{text}</Link>,
    },
    {
      title: '项目描述',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => new Date(text).toLocaleString(),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>项目列表</h2>
        <Button type="primary" onClick={() => setIsModalOpen(true)}>新建项目</Button>
      </div>
      <Table dataSource={projects} columns={columns} rowKey="id" />

      <Modal title="新建项目" open={isModalOpen} onCancel={() => setIsModalOpen(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="name" label="项目名称" rules={[{ required: true, message: '请输入项目名称' }]}>
            <Input placeholder="例如：智能硬件测试一期" />
          </Form.Item>
          <Form.Item name="description" label="项目描述">
            <Input.TextArea rows={4} placeholder="项目说明..." />
          </Form.Item>
          <Form.Item name="working_dir" label="默认工作目录 (可选)">
            <Input placeholder="例如：/Users/bytedance/Documents/AutoTestRunner" />
          </Form.Item>
          <Form.Item name="test_command" label="默认执行命令 (可选)">
            <Input placeholder="例如：pytest tests/" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
