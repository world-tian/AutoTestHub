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
    ToolOutlined,
    ThunderboltOutlined,
    BulbOutlined
} from '@ant-design/icons';
import {
    getToolDefinitions,
    createToolDefinition,
    getToolInstances,
    createToolInstance,
    executeTool,
    initializePresetTools,
    ToolDefinition,
    ToolInstance
} from '../api';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface ToolboxProps {
    projectId?: string;
}

export const Toolbox: React.FC<ToolboxProps> = ({ projectId }) => {
    const [definitions, setDefinitions] = useState<ToolDefinition[]>([]);
    const [instances, setInstances] = useState<ToolInstance[]>([]);
    const [loading, setLoading] = useState(false);
    const [defModalVisible, setDefModalVisible] = useState(false);
    const [instModalVisible, setInstModalVisible] = useState(false);
    const [execModalVisible, setExecModalVisible] = useState(false);
    const [selectedInstance, setSelectedInstance] = useState<ToolInstance | null>(null);
    const [execParams, setExecParams] = useState<string>('{}');
    const [execResult, setExecResult] = useState<any>(null);
    const [executing, setExecuting] = useState(false);
    const [defForm] = Form.useForm();
    const [instForm] = Form.useForm();

    const loadData = async () => {
        setLoading(true);
        try {
            const [defsData, instsData] = await Promise.all([
                getToolDefinitions(),
                getToolInstances(projectId ? { project_id: projectId } : undefined)
            ]);
            setDefinitions(defsData);
            setInstances(instsData);
        } catch (error) {
            console.error('Failed to load toolbox:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [projectId]);

    const handleInitializePresets = async () => {
        try {
            const result = await initializePresetTools();
            message.success(result.message);
            loadData();
        } catch (error) {
            console.error('Failed to initialize presets:', error);
        }
    };

    const handleAddDefinition = () => {
        defForm.resetFields();
        setDefModalVisible(true);
    };

    const handleAddInstance = () => {
        instForm.resetFields();
        setInstModalVisible(true);
    };

    const handleSubmitDefinition = async (values: any) => {
        try {
            await createToolDefinition(values);
            message.success('工具定义创建成功');
            setDefModalVisible(false);
            loadData();
        } catch (error) {
            console.error('Failed to create definition:', error);
        }
    };

    const handleSubmitInstance = async (values: any) => {
        try {
            const data = projectId ? { ...values, project_id: projectId } : values;
            await createToolInstance(data);
            message.success('工具实例创建成功');
            setInstModalVisible(false);
            loadData();
        } catch (error) {
            console.error('Failed to create instance:', error);
        }
    };

    const handleExecute = async (instance: ToolInstance) => {
        setSelectedInstance(instance);
        setExecParams('{}');
        setExecResult(null);
        setExecModalVisible(true);
    };

    const doExecute = async () => {
        if (!selectedInstance) return;
        setExecuting(true);
        try {
            let params;
            try {
                params = JSON.parse(execParams);
            } catch {
                params = {};
            }
            const result = await executeTool({
                tool_instance_id: selectedInstance.id,
                parameters: params
            });
            setExecResult(result);
            message.success('工具执行成功');
        } catch (error) {
            console.error('Failed to execute tool:', error);
            message.error('Failed to execute tool');
        } finally {
            setExecuting(false);
        }
    };

    const getCategoryColor = (category?: string) => {
        switch (category) {
            case 'adb': return 'blue';
            case 'serial': return 'orange';
            case 'power': return 'green';
            case 'relay': return 'purple';
            default: return 'default';
        }
    };

    const defColumns = [
        {
            title: '名称',
            dataIndex: 'name',
            key: 'name',
            render: (name: string, record: ToolDefinition) => (
                <Space>
                    {record.category === 'adb' && <BulbOutlined />}
                    {record.category === 'serial' && <ToolOutlined />}
                    {record.category === 'power' && <ThunderboltOutlined />}
                    {name}
                </Space>
            ),
        },
        {
            title: '分类',
            dataIndex: 'category',
            key: 'category',
            render: (category: string) => (
                <Tag color={getCategoryColor(category)}>{category || 'general'}</Tag>
            ),
        },
        {
            title: '类型',
            dataIndex: 'tool_type',
            key: 'tool_type',
        },
        {
            title: '能力',
            dataIndex: 'capabilities',
            key: 'capabilities',
            render: (caps: string[]) => (
                <Space wrap>
                    {(caps || []).map(cap => <Tag key={cap}>{cap}</Tag>)}
                </Space>
            ),
        },
        {
            title: '创建时间',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (date: string) => new Date(date).toLocaleDateString(),
        },
    ];

    const instColumns = [
        {
            title: '名称',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: '工具定义',
            key: 'tool_def',
            render: (_: any, record: ToolInstance) => {
                const def = definitions.find(d => d.id === record.tool_definition_id);
                return def ? def.name : '-';
            },
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => <Tag color={status === 'active' ? 'green' : 'default'}>{status === 'active' ? '活跃' : '未激活'}</Tag>,
        },
        {
            title: '创建时间',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (date: string) => new Date(date).toLocaleDateString(),
        },
        {
            title: '操作',
            key: 'actions',
            render: (_: any, record: ToolInstance) => (
                <Space>
                    <Button type="primary" size="small" onClick={() => handleExecute(record)}>
                        执行
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <Card title="工具定义列表" style={{ marginBottom: 16 }}>
                <Space style={{ marginBottom: 16 }}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAddDefinition}>
                        添加定义
                    </Button>
                    <Button onClick={handleInitializePresets}>
                        初始化预设工具
                    </Button>
                </Space>
                <Table
                    columns={defColumns}
                    dataSource={definitions}
                    rowKey="id"
                    loading={loading}
                />
            </Card>

            <Card title="工具实例">
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddInstance} style={{ marginBottom: 16 }}>
                    添加实例
                </Button>
                <Table
                    columns={instColumns}
                    dataSource={instances}
                    rowKey="id"
                    loading={loading}
                />
            </Card>

            <Modal
                title="添加工具定义"
                open={defModalVisible}
                onCancel={() => setDefModalVisible(false)}
                onOk={() => defForm.submit()}
                width={700}
            >
                <Form form={defForm} layout="vertical" onFinish={handleSubmitDefinition}>
                    <Form.Item name="name" label="名称" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="description" label="描述">
                        <TextArea rows={3} />
                    </Form.Item>
                    <Form.Item name="tool_type" label="工具类型" rules={[{ required: true }]} initialValue="agent_tool">
                        <Select>
                            <Option value="python_plugin">Python Plugin</Option>
                            <Option value="http">HTTP Tool</Option>
                            <Option value="shell">Shell Tool</Option>
                            <Option value="agent_tool">Agent Tool</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="category" label="分类">
                        <Select>
                            <Option value="adb">ADB</Option>
                            <Option value="serial">Serial</Option>
                            <Option value="power">Power</Option>
                            <Option value="relay">Relay</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="is_public" label="公开" valuePropName="checked" initialValue={true}>
                        <input type="checkbox" />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title="添加工具实例"
                open={instModalVisible}
                onCancel={() => setInstModalVisible(false)}
                onOk={() => instForm.submit()}
            >
                <Form form={instForm} layout="vertical" onFinish={handleSubmitInstance}>
                    <Form.Item name="name" label="名称" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="tool_definition_id" label="工具定义" rules={[{ required: true }]}>
                        <Select>
                            {definitions.map(d => (
                                <Option key={d.id} value={d.id}>{d.name}</Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item name="status" label="状态" initialValue="active">
                        <Select>
                            <Option value="active">活跃 (Active)</Option>
                            <Option value="inactive">未激活 (Inactive)</Option>
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title={`执行工具: ${selectedInstance?.name}`}
                open={execModalVisible}
                onCancel={() => setExecModalVisible(false)}
                onOk={doExecute}
                okButtonProps={{ loading: executing }}
                width={700}
            >
                <div>
                    <Title level={5}>参数 (JSON)</Title>
                    <TextArea
                        rows={4}
                        value={execParams}
                        onChange={(e) => setExecParams(e.target.value)}
                        placeholder='{"param": "value"}'
                    />
                    {execResult && (
                        <div style={{ marginTop: 16 }}>
                            <Title level={5}>结果</Title>
                            <pre style={{ backgroundColor: '#f5f5f5', padding: 16, borderRadius: 4 }}>
                                {JSON.stringify(execResult, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
};
