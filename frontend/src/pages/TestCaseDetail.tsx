import React, { useEffect, useState } from 'react';
import { Card, Descriptions, Form, Input, Select, Button, Space, Tag, Typography, Spin, message, Divider } from 'antd';
import { Link, useParams } from 'react-router-dom';
import { FileTextOutlined, ArrowLeftOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons';
import { getTestCase, updateTestCase, TestCase } from '../api';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

export const TestCaseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testCase, setTestCase] = useState<TestCase | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [form] = Form.useForm();

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getTestCase(id);
      setTestCase(data);
      form.setFieldsValue({
        ...data,
        steps: data.steps?.join('\n') || ''
      });
    } catch (error) {
      console.error('Failed to fetch test case:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleSave = async (values: any) => {
    if (!id) return;
    setSaving(true);
    try {
      const stepsArray = values.steps
        ? values.steps.split('\n').filter((s: string) => s.trim())
        : [];
      
      await updateTestCase(id, {
        ...values,
        steps: stepsArray
      });
      
      message.success('测试用例已更新');
      setIsEditing(false);
      fetchData();
    } catch (error) {
      console.error('Failed to save test case:', error);
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const getStatusTag = (status: string) => {
    const colors: Record<string, string> = {
      candidate: 'default',
      adopted: 'blue',
      enabled: 'green'
    };
    const labels: Record<string, string> = {
      candidate: '候选',
      adopted: '已采纳',
      enabled: '已启用'
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

  if (!testCase && !loading) return <div>测试用例不存在</div>;

  return (
    <div>
      <Space style={{ marginBottom: 24 }}>
        <Link to="/projects">
          <Button icon={<ArrowLeftOutlined />}>返回项目列表</Button>
        </Link>
        {testCase && (
          <Link to={`/projects/${testCase.project_id}`}>
            <Button>返回项目</Button>
          </Link>
        )}
      </Space>

      <Title level={2}>
        <FileTextOutlined style={{ marginRight: 8 }} />
        测试用例详情
      </Title>

      <Spin spinning={loading}>
        <Card
          extra={
            isEditing ? (
              <Space>
                <Button onClick={() => { setIsEditing(false); form.resetFields(); }}>
                  取消
                </Button>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={saving}
                  onClick={() => form.submit()}
                >
                  保存
                </Button>
              </Space>
            ) : (
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => setIsEditing(true)}
              >
                编辑
              </Button>
            )
          }
        >
          {isEditing ? (
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSave}
            >
              <Form.Item
                name="title"
                label="用例标题"
                rules={[{ required: true, message: '请输入用例标题' }]}
              >
                <Input placeholder="请输入用例标题" />
              </Form.Item>

              <Form.Item
                name="case_category"
                label="用例类型"
                rules={[{ required: true, message: '请选择用例类型' }]}
              >
                <Select>
                  <Option value="manual">手工测试</Option>
                  <Option value="automated">自动化测试</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="priority"
                label="优先级"
                rules={[{ required: true, message: '请选择优先级' }]}
              >
                <Select>
                  <Option value="P0">P0 - 最高</Option>
                  <Option value="P1">P1 - 高</Option>
                  <Option value="P2">P2 - 中</Option>
                  <Option value="P3">P3 - 低</Option>
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
                <TextArea
                  rows={6}
                  placeholder="每行一个步骤"
                />
              </Form.Item>

              <Form.Item
                name="expected_result"
                label="预期结果"
              >
                <TextArea
                  rows={4}
                  placeholder="请输入预期结果"
                />
              </Form.Item>
            </Form>
          ) : (
            <div>
              <Descriptions column={2} style={{ marginBottom: 24 }}>
                <Descriptions.Item label="用例标题" span={2}>
                  {testCase?.title}
                </Descriptions.Item>
                <Descriptions.Item label="用例类型">
                  <Tag>{testCase?.case_category === 'manual' ? '手工测试' : '自动化测试'}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="优先级">
                  {testCase && getPriorityTag(testCase.priority)}
                </Descriptions.Item>
                <Descriptions.Item label="状态">
                  {testCase && getStatusTag(testCase.status)}
                </Descriptions.Item>
                <Descriptions.Item label="创建时间">
                  {testCase && new Date(testCase.created_at).toLocaleString()}
                </Descriptions.Item>
              </Descriptions>

              <Divider />

              <Title level={4}>测试步骤</Title>
              {testCase?.steps && testCase.steps.length > 0 ? (
                <ol>
                  {testCase.steps.map((step, index) => (
                    <li key={index} style={{ marginBottom: 8 }}>{step}</li>
                  ))}
                </ol>
              ) : (
                <Text type="secondary">暂无测试步骤</Text>
              )}

              <Divider />

              <Title level={4}>预期结果</Title>
              <Text>{testCase?.expected_result || '暂无预期结果'}</Text>
            </div>
          )}
        </Card>
      </Spin>
    </div>
  );
};
