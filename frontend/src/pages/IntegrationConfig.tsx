import React, { useState, useEffect } from 'react';
import {
    Table,
    Button,
    Modal,
    Form,
    Input,
    Select,
    Space,
    Tag,
    Card,
    message,
    Typography
} from 'antd';
import {
    PlusOutlined,
    SyncOutlined
} from '@ant-design/icons';
import {
    getIntegrationConfigs,
    createIntegrationConfig,
    updateIntegrationConfig,
    syncJira,
    syncFeishu,
    IntegrationConfig
} from '../api';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

export const IntegrationConfigPage: React.FC = () => {
    const [configs, setConfigs] = useState<IntegrationConfig[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingConfig, setEditingConfig] = useState<IntegrationConfig | null>(null);
    const [form] = Form.useForm();

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await getIntegrationConfigs();
            setConfigs(data);
        } catch (error) {
            console.error('Failed to load integration configs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleAdd = () => {
        setEditingConfig(null);
        form.resetFields();
        setModalVisible(true);
    };

    const handleEdit = (config: IntegrationConfig) => {
        setEditingConfig(config);
        form.setFieldsValue({
            ...config,
            config: JSON.stringify(config.config, null, 2)
        });
        setModalVisible(true);
    };

    const handleSubmit = async (values: any) => {
        try {
            let config;
            try {
                config = JSON.parse(values.config || '{}');
            } catch {
                config = {};
            }
            const data = { ...values, config };
            
            if (editingConfig) {
                await updateIntegrationConfig(editingConfig.id, data);
                message.success('Integration config updated successfully');
            } else {
                await createIntegrationConfig(data);
                message.success('Integration config created successfully');
            }
            setModalVisible(false);
            loadData();
        } catch (error) {
            console.error('Failed to save config:', error);
        }
    };

    const handleSync = async (config: IntegrationConfig, type: 'jira' | 'feishu') => {
        try {
            let result;
            if (type === 'jira') {
                result = await syncJira(config.id, {});
            } else {
                result = await syncFeishu(config.id, {});
            }
            message.success(result.message);
        } catch (error) {
            console.error('Failed to sync:', error);
            message.error('Sync failed');
        }
    };

    const getPlatformColor = (platform?: string) => {
        switch (platform) {
            case 'jira': return 'blue';
            case 'feishu': return 'cyan';
            case 'slack': return 'purple';
            default: return 'default';
        }
    };

    const columns = [
        {
            title: '名称',
            dataIndex: 'name',
            key: 'name',
            sorter: (a: IntegrationConfig, b: IntegrationConfig) => a.name.localeCompare(b.name),
        },
        {
            title: '平台',
            dataIndex: 'integration_type',
            key: 'platform',
            filters: [
                { text: 'Jira', value: 'jira' },
                { text: '飞书 (Feishu)', value: 'feishu' },
                { text: 'Slack', value: 'slack' },
            ],
            onFilter: (value: any, record: IntegrationConfig) => record.integration_type === value,
            render: (platform: string) => <Tag color={getPlatformColor(platform)}>{platform}</Tag>,
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            filters: [
                { text: '已启用', value: 'active' },
                { text: '已停用', value: 'inactive' },
            ],
            onFilter: (value: any, record: IntegrationConfig) => record.status === value,
            render: (status: string) => <Tag color={status === 'active' ? 'green' : 'default'}>{status === 'active' ? '已启用' : '已停用'}</Tag>,
        },
        {
            title: '创建时间',
            dataIndex: 'created_at',
            key: 'created_at',
            sorter: (a: IntegrationConfig, b: IntegrationConfig) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
            render: (date: string) => new Date(date).toLocaleDateString(),
        },
        {
            title: '操作',
            key: 'actions',
            render: (_: any, record: IntegrationConfig) => (
                <Space>
                    <Button type="link" size="small" onClick={() => handleEdit(record)}>
                    编辑
                    </Button>
                    {record.integration_type === 'jira' && (
                        <Button type="link" size="small" icon={<SyncOutlined />} onClick={() => handleSync(record, 'jira')}>
                        同步 Jira
                        </Button>
                    )}
                    {record.integration_type === 'feishu' && (
                        <Button type="link" size="small" icon={<SyncOutlined />} onClick={() => handleSync(record, 'feishu')}>
                        同步飞书
                        </Button>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div>
            <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0 }}>集成配置</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                    添加配置
                </Button>
                </div>
                <Table
                columns={columns}
                dataSource={configs}
                rowKey="id"
                loading={loading}
                />
            </Card>

            <Modal
                title={editingConfig ? '编辑集成配置' : '添加集成配置'}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                onOk={() => form.submit()}
                width={700}
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                <Form.Item name="name" label="名称" rules={[{ required: true }]}>
                    <Input />
                </Form.Item>
                <Form.Item name="integration_type" label="平台" rules={[{ required: true }]}>
                    <Select>
                    <Option value="jira">Jira</Option>
                    <Option value="feishu">飞书 (Feishu)</Option>
                    <Option value="slack">Slack</Option>
                    <Option value="wechat">微信 (WeChat)</Option>
                    <Option value="custom">自定义</Option>
                    </Select>
                </Form.Item>
                <Form.Item name="status" label="状态" initialValue="active">
                    <Select>
                        <Option value="active">已启用</Option>
                        <Option value="inactive">已停用</Option>
                    </Select>
                </Form.Item>
                <Form.Item name="config" label="配置详情 (JSON)">
                    <TextArea rows={6} placeholder='{"api_key": "...", "base_url": "..."}' />
                </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};
