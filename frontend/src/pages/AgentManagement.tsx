import React, { useState, useEffect } from 'react';
import {
    Table,
    Card,
    Space,
    Button,
    Tag,
    Modal,
    Select,
    message,
    Statistic,
    Row,
    Col,
    Tooltip,
    Popconfirm,
    Descriptions,
    Divider,
} from 'antd';
import {
    ReloadOutlined,
    DeleteOutlined,
    InfoCircleOutlined,
    DesktopOutlined,
    CheckCircleOutlined,
    ExclamationCircleOutlined,
    PauseCircleOutlined,
} from '@ant-design/icons';
import {
    getAgents,
    deleteAgent,
    getDevices,
    getExecutionQueue,
    Agent,
    Device,
    ExecutionQueueItem,
} from '../api';

const { Option } = Select;

const AgentManagement: React.FC = () => {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
    const [agentDevices, setAgentDevices] = useState<Device[]>([]);
    const [agentTasks, setAgentTasks] = useState<ExecutionQueueItem[]>([]);

    const loadAgents = async () => {
        setLoading(true);
        try {
            const data = await getAgents(statusFilter || undefined);
            setAgents(data);
        } catch (error) {
            console.error('Failed to load agents:', error);
            message.error('加载 Agent 列表失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAgents();
    }, [statusFilter]);

    const handleViewDetail = async (agent: Agent) => {
        setSelectedAgent(agent);
        try {
            const [devices, tasks] = await Promise.all([
                getDevices({ agent_id: agent.id }),
                getExecutionQueue({ agent_id: agent.id }),
            ]);
            setAgentDevices(devices);
            setAgentTasks(tasks);
        } catch (error) {
            console.error('Failed to load agent details:', error);
        }
        setDetailModalVisible(true);
    };

    const handleDeleteAgent = async (agentId: string) => {
        try {
            await deleteAgent(agentId);
            message.success('Agent 删除成功');
            loadAgents();
        } catch (error) {
            console.error('Failed to delete agent:', error);
            message.error('删除 Agent 失败');
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'online':
                return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
            case 'offline':
                return <PauseCircleOutlined style={{ color: '#d9d9d9' }} />;
            case 'busy':
                return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
            default:
                return <InfoCircleOutlined />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'online':
                return 'success';
            case 'offline':
                return 'default';
            case 'busy':
                return 'warning';
            default:
                return 'default';
        }
    };

    const columns = [
        {
            title: '状态',
            key: 'status',
            width: 80,
            render: (_: any, record: Agent) => (
                <Tag color={getStatusColor(record.status)} icon={getStatusIcon(record.status)}>
                    {record.status === 'online' ? '在线' : record.status === 'offline' ? '离线' : '忙碌'}
                </Tag>
            ),
        },
        {
            title: 'Agent 名称',
            dataIndex: 'name',
            key: 'name',
            render: (text: string, record: Agent) => (
                <Space>
                    <DesktopOutlined />
                    <span style={{ cursor: 'pointer' }} onClick={() => handleViewDetail(record)}>
                        {text}
                    </span>
                </Space>
            ),
        },
        {
            title: '主机',
            dataIndex: 'host',
            key: 'host',
        },
        {
            title: '操作系统',
            dataIndex: 'os',
            key: 'os',
        },
        {
            title: 'CPU 核数',
            dataIndex: 'cpu_cores',
            key: 'cpu_cores',
        },
        {
            title: '内存',
            dataIndex: 'memory',
            key: 'memory',
        },
        {
            title: '健康度',
            key: 'health_score',
            render: (_: any, record: Agent) => {
                if (record.health_score === undefined) return '-';
                const score = record.health_score;
                let color = '#52c41a';
                if (score < 50) color = '#ff4d4f';
                else if (score < 80) color = '#faad14';
                return <span style={{ color, fontWeight: 'bold' }}>{score}/100</span>;
            },
        },
        {
            title: '最后心跳',
            key: 'last_heartbeat',
            render: (_: any, record: Agent) => {
                if (!record.last_heartbeat) return '-';
                // 后端返回的是 UTC 时间（如 2024-05-29T02:00:00），如果它没有带 Z，浏览器会解析成本地时间
                // 这里手动加上 'Z' 来强制按 UTC 解析并转为本地时间显示
                const dateStr = record.last_heartbeat.endsWith('Z') 
                    ? record.last_heartbeat 
                    : `${record.last_heartbeat}Z`;
                return new Date(dateStr).toLocaleString();
            }
        },
        {
            title: '操作',
            key: 'actions',
            render: (_: any, record: Agent) => (
                <Space>
                    <Tooltip title="查看详情">
                        <Button
                            type="text"
                            icon={<InfoCircleOutlined />}
                            onClick={() => handleViewDetail(record)}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="确认删除"
                        description="确定要删除这个 Agent 吗？"
                        onConfirm={() => handleDeleteAgent(record.id)}
                        okText="确定"
                        cancelText="取消"
                    >
                        <Tooltip title="删除">
                            <Button type="text" danger icon={<DeleteOutlined />} />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const stats = {
        total: agents.length,
        online: agents.filter(a => a.status === 'online').length,
        busy: agents.filter(a => a.status === 'busy').length,
        offline: agents.filter(a => a.status === 'offline').length,
    };

    return (
        <div>
            <Card>
                <Row gutter={16} style={{ marginBottom: 24 }}>
                    <Col span={6}>
                        <Statistic title="总 Agent 数" value={stats.total} prefix={<DesktopOutlined />} />
                    </Col>
                    <Col span={6}>
                        <Statistic title="在线" value={stats.online} valueStyle={{ color: '#3f8600' }} />
                    </Col>
                    <Col span={6}>
                        <Statistic title="忙碌" value={stats.busy} valueStyle={{ color: '#cf1322' }} />
                    </Col>
                    <Col span={6}>
                        <Statistic title="离线" value={stats.offline} valueStyle={{ color: '#8c8c8c' }} />
                    </Col>
                </Row>

                <Space style={{ marginBottom: 16 }}>
                    <Select
                        placeholder="状态筛选"
                        style={{ width: 150 }}
                        allowClear
                        value={statusFilter || undefined}
                        onChange={(value) => setStatusFilter(value)}
                    >
                        <Option value="online">在线</Option>
                        <Option value="offline">离线</Option>
                        <Option value="busy">忙碌</Option>
                    </Select>
                    <Button icon={<ReloadOutlined />} onClick={loadAgents} loading={loading}>
                        刷新
                    </Button>
                </Space>

                <Table
                    columns={columns}
                    dataSource={agents}
                    rowKey="id"
                    loading={loading}
                />
            </Card>

            {/* Agent 详情模态框 */}
            <Modal
                title={`Agent 详情 - ${selectedAgent?.name}`}
                open={detailModalVisible}
                onCancel={() => setDetailModalVisible(false)}
                footer={[<Button key="close" onClick={() => setDetailModalVisible(false)}>关闭</Button>]}
                width={800}
            >
                {selectedAgent && (
                    <div>
                        <Descriptions bordered column={2} style={{ marginBottom: 16 }}>
                            <Descriptions.Item label="ID">{selectedAgent.id}</Descriptions.Item>
                            <Descriptions.Item label="状态">
                                <Tag color={getStatusColor(selectedAgent.status)}>
                                    {selectedAgent.status === 'online' ? '在线' : selectedAgent.status === 'offline' ? '离线' : '忙碌'}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="主机">{selectedAgent.host || '-'}</Descriptions.Item>
                            <Descriptions.Item label="操作系统">{selectedAgent.os || '-'}</Descriptions.Item>
                            <Descriptions.Item label="CPU 核数">{selectedAgent.cpu_cores || '-'}</Descriptions.Item>
                            <Descriptions.Item label="内存">{selectedAgent.memory || '-'}</Descriptions.Item>
                            <Descriptions.Item label="磁盘空间">{selectedAgent.disk_space || '-'}</Descriptions.Item>
                            <Descriptions.Item label="健康度">{selectedAgent.health_score !== undefined ? `${selectedAgent.health_score}/100` : '-'}</Descriptions.Item>
                            <Descriptions.Item label="创建时间">{new Date(selectedAgent.created_at).toLocaleString()}</Descriptions.Item>
                            <Descriptions.Item label="最后心跳">
                                {selectedAgent.last_heartbeat ? new Date(selectedAgent.last_heartbeat.endsWith('Z') ? selectedAgent.last_heartbeat : `${selectedAgent.last_heartbeat}Z`).toLocaleString() : '-'}
                            </Descriptions.Item>
                        </Descriptions>

                        {selectedAgent.description && (
                            <>
                                <Divider orientation="left">描述</Divider>
                                <p>{selectedAgent.description}</p>
                            </>
                        )}

                        <Divider orientation="left">连接的设备 ({agentDevices.length})</Divider>
                        <Table
                            columns={[
                                { title: '设备名称', dataIndex: 'name', key: 'name' },
                                { title: '设备 ID', dataIndex: 'device_id', key: 'device_id' },
                                { title: '类型', dataIndex: 'device_type', key: 'device_type' },
                                {
                                    title: '状态',
                                    dataIndex: 'status',
                                    key: 'status',
                                    render: (status: string) => (
                                        <Tag color={status === 'online' ? 'success' : 'default'}>
                                            {status}
                                        </Tag>
                                    ),
                                },
                            ]}
                            dataSource={agentDevices}
                            rowKey="id"
                            pagination={false}
                            size="small"
                        />

                        <Divider orientation="left">执行任务 ({agentTasks.length})</Divider>
                        <Table
                            columns={[
                                { title: '任务 ID', dataIndex: 'id', key: 'id' },
                                { title: '执行 ID', dataIndex: 'run_id', key: 'run_id' },
                                {
                                    title: '状态',
                                    dataIndex: 'status',
                                    key: 'status',
                                    render: (status: string) => {
                                        const colors: Record<string, string> = {
                                            pending: 'blue',
                                            running: 'processing',
                                            completed: 'success',
                                            failed: 'error',
                                        };
                                        return <Tag color={colors[status] || 'default'}>{status}</Tag>;
                                    },
                                },
                                { title: '优先级', dataIndex: 'priority', key: 'priority' },
                                {
                                    title: '加入时间',
                                    dataIndex: 'queued_at',
                                    key: 'queued_at',
                                    render: (time: string) => new Date(time).toLocaleString(),
                                },
                            ]}
                            dataSource={agentTasks}
                            rowKey="id"
                            pagination={false}
                            size="small"
                        />
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default AgentManagement;
