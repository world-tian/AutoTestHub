import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Button,
    Card,
    Checkbox,
    Col,
    Divider,
    Form,
    Input,
    InputNumber,
    List,
    Radio,
    Row,
    Space,
    Table,
    Tag,
    Typography,
    message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
    DisconnectOutlined,
    EditOutlined,
    LinkOutlined,
    ReloadOutlined,
    SearchOutlined,
    SendOutlined,
    DeleteOutlined,
} from '@ant-design/icons';
import {
    connectBleDevice,
    disconnectAllBleDevices,
    disconnectBleDevice,
    getBleState,
    renameBleDevice,
    scanBleDevices,
    sendBleMessage,
    type BleDeviceState,
    type BleMessageState,
} from '../api';

const timeLabel = (value?: string) => {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

type SendMode = 'text' | 'json' | 'raw';

export const BluetoothToolV2: React.FC = () => {
    const [devices, setDevices] = useState<BleDeviceState[]>([]);
    const [messages, setMessages] = useState<BleMessageState[]>([]);
    const [scanning, setScanning] = useState(false);
    const [lastScanAt, setLastScanAt] = useState<string | undefined>();
    const [selectedAddress, setSelectedAddress] = useState('');
    const [query, setQuery] = useState('RSS');
    const [scanSeconds, setScanSeconds] = useState(6);
    const [sendMode, setSendMode] = useState<SendMode>('text');
    const [broadcast, setBroadcast] = useState(false);
    const [appendNewline, setAppendNewline] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [renameForm] = Form.useForm();
    const [sendForm] = Form.useForm();

    const selectedDevice = useMemo(
        () => devices.find((device) => device.address === selectedAddress),
        [devices, selectedAddress],
    );

    const displayName = selectedDevice?.alias || selectedDevice?.name || '-';
    const sendModeHelp: Record<SendMode, string> = {
        text: '普通文本：直接发送输入内容，适合测试命令或简单消息。',
        json: 'JSON：先校验 JSON，再按标准 JSON 字符串发送。',
        raw: '原样发送：不做格式处理，也不自动补换行。',
    };

    const loadState = async () => {
        const state = await getBleState();
        setDevices(state.devices);
        setMessages(state.messages);
        setScanning(state.scanning);
        setLastScanAt(state.last_scan_at);
        if (!selectedAddress) {
            const fallback = state.connected_addresses[0] || state.devices[0]?.address || '';
            if (fallback) setSelectedAddress(fallback);
        }
    };

    useEffect(() => {
        void loadState();
        const timer = window.setInterval(() => {
            void loadState();
        }, 5000);
        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        renameForm.setFieldsValue({ name: displayName === '-' ? '' : displayName });
    }, [renameForm, displayName]);

    const handleScan = async () => {
        setScanning(true);
        try {
            const result = await scanBleDevices({ seconds: scanSeconds, query });
            setDevices(result);
            const state = await getBleState();
            setMessages(state.messages);
            setLastScanAt(state.last_scan_at);
            if (!selectedAddress && result.length > 0) {
                setSelectedAddress(result[0].address);
            }
            message.success(`找到 ${result.length} 个设备`);
        } catch (error) {
            console.error('scan failed', error);
            message.error('扫描失败');
        } finally {
            setScanning(false);
        }
    };

    const handleConnect = async (address: string) => {
        setActionLoading(`connect:${address}`);
        try {
            await connectBleDevice(address);
            message.success('已连接');
            setSelectedAddress(address);
            await loadState();
        } catch (error) {
            console.error('connect failed', error);
        } finally {
            setActionLoading(null);
        }
    };

    const handleDisconnect = async (address: string) => {
        setActionLoading(`disconnect:${address}`);
        try {
            await disconnectBleDevice(address);
            message.success('已断开');
            await loadState();
        } catch (error) {
            console.error('disconnect failed', error);
        } finally {
            setActionLoading(null);
        }
    };

    const handleDisconnectAll = async () => {
        setActionLoading('disconnect-all');
        try {
            await disconnectAllBleDevices();
            message.success('已断开全部设备');
            await loadState();
        } catch (error) {
            console.error('disconnect all failed', error);
        } finally {
            setActionLoading(null);
        }
    };

    const handleRename = async (values: { name: string }) => {
        if (!selectedAddress) {
            message.info('请先选择设备');
            return;
        }
        setActionLoading(`rename:${selectedAddress}`);
        try {
            await renameBleDevice({ address: selectedAddress, name: values.name });
            message.success('名称已保存');
            await loadState();
        } catch (error) {
            console.error('rename failed', error);
        } finally {
            setActionLoading(null);
        }
    };

    const handleSend = async (values: { messageText: string }) => {
        const text = values.messageText.trim();
        if (!text) return;
        if (!broadcast && !selectedAddress) {
            message.info('请先选择设备');
            return;
        }

        let payloadText = text;
        let shouldAppendNewline = appendNewline;
        if (sendMode === 'json') {
            try {
                payloadText = JSON.stringify(JSON.parse(text));
            } catch {
                message.error('JSON 格式不合法');
                return;
            }
            shouldAppendNewline = false;
        } else if (sendMode === 'raw') {
            shouldAppendNewline = false;
        }

        setActionLoading('send');
        try {
            await sendBleMessage({
                address: broadcast ? undefined : selectedAddress,
                message: payloadText,
                append_newline: shouldAppendNewline,
                broadcast,
            });
            message.success('已发送');
            sendForm.resetFields(['messageText']);
            await loadState();
        } catch (error) {
            console.error('send failed', error);
        } finally {
            setActionLoading(null);
        }
    };

    const columns: ColumnsType<BleDeviceState> = [
        {
            title: '设备',
            key: 'device',
            render: (_, record) => (
                <Space direction="vertical" size={0}>
                    <Space size={8}>
                        <span>{record.alias || record.name}</span>
                        {record.alias ? <Tag color="blue">Alias</Tag> : null}
                        {record.is_connected ? (
                            <Tag color="green">Connected</Tag>
                        ) : record.is_connecting ? (
                            <Tag color="gold">Connecting</Tag>
                        ) : (
                            <Tag>Idle</Tag>
                        )}
                    </Space>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {record.address}
                    </Typography.Text>
                </Space>
            ),
        },
        {
            title: 'RSSI',
            dataIndex: 'rssi',
            width: 100,
            render: (rssi: number) => `${rssi} dBm`,
        },
        {
            title: '最近扫描',
            dataIndex: 'last_seen_at',
            width: 180,
            render: (value: string | undefined) => timeLabel(value),
        },
        {
            title: '错误',
            dataIndex: 'last_error',
            render: (value: string | undefined) => (
                <Typography.Text type="danger" ellipsis={{ tooltip: value }}>
                    {value || '-'}
                </Typography.Text>
            ),
        },
        {
            title: '操作',
            key: 'actions',
            width: 220,
            render: (_, record) => (
                <Space>
                    <Button
                        size="small"
                        icon={<LinkOutlined />}
                        type={record.is_connected ? 'default' : 'primary'}
                        onClick={() => handleConnect(record.address)}
                        loading={actionLoading === `connect:${record.address}`}
                        disabled={record.is_connected || record.is_connecting}
                    >
                        Connect
                    </Button>
                    <Button
                        size="small"
                        icon={<DisconnectOutlined />}
                        danger
                        onClick={() => handleDisconnect(record.address)}
                        loading={actionLoading === `disconnect:${record.address}`}
                        disabled={!record.is_connected}
                    >
                        Disconnect
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Card
                title={
                    <Space>
                        <LinkOutlined />
                        <span>蓝牙工具</span>
                    </Space>
                }
                extra={<Tag color={scanning ? 'gold' : 'green'}>{scanning ? 'Scanning' : 'Ready'}</Tag>}
            >
                <Row gutter={12} align="middle">
                    <Col flex="auto">
                        <Input
                            prefix={<SearchOutlined />}
                            placeholder="搜索设备名称或地址"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            allowClear
                        />
                    </Col>
                    <Col>
                        <InputNumber
                            min={1}
                            max={30}
                            value={scanSeconds}
                            onChange={(value) => setScanSeconds(Number(value || 6))}
                            style={{ width: 104 }}
                        />
                    </Col>
                    <Col>
                        <Button type="primary" icon={<ReloadOutlined />} onClick={handleScan} loading={scanning}>
                            扫描
                        </Button>
                    </Col>
                    <Col>
                        <Button danger icon={<DisconnectOutlined />} onClick={handleDisconnectAll} loading={actionLoading === 'disconnect-all'}>
                            全部断开
                        </Button>
                    </Col>
                </Row>
                <Divider />
                <Row gutter={12}>
                    <Col span={8}>
                        <Card size="small">
                            <Typography.Text type="secondary">Devices</Typography.Text>
                            <div style={{ fontSize: 28, fontWeight: 600 }}>{devices.length}</div>
                        </Card>
                    </Col>
                    <Col span={8}>
                        <Card size="small">
                            <Typography.Text type="secondary">Connected</Typography.Text>
                            <div style={{ fontSize: 28, fontWeight: 600 }}>{devices.filter((item) => item.is_connected).length}</div>
                        </Card>
                    </Col>
                    <Col span={8}>
                        <Card size="small">
                            <Typography.Text type="secondary">Last Scan</Typography.Text>
                            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{timeLabel(lastScanAt)}</div>
                        </Card>
                    </Col>
                </Row>
            </Card>

            <Row gutter={16} align="stretch">
                <Col xs={24} xl={15}>
                    <Card
                        title="扫描结果"
                        extra={
                            <Button size="small" icon={<DeleteOutlined />} onClick={() => setDevices([])}>
                                清空列表
                            </Button>
                        }
                    >
                        <Table rowKey="address" columns={columns} dataSource={devices} pagination={false} />
                    </Card>
                </Col>
                <Col xs={24} xl={9}>
                    <Space direction="vertical" size={16} style={{ width: '100%' }}>
                        <Card title="当前设备">
                            <Space direction="vertical" style={{ width: '100%' }} size={12}>
                                <div>
                                    <Typography.Text type="secondary">Name</Typography.Text>
                                    <div style={{ fontWeight: 600 }}>{displayName}</div>
                                </div>
                                <div>
                                    <Typography.Text type="secondary">Address</Typography.Text>
                                    <div style={{ fontWeight: 600, wordBreak: 'break-all' }}>{selectedDevice?.address || '-'}</div>
                                </div>
                                <div>
                                    <Typography.Text type="secondary">Status</Typography.Text>
                                    <div style={{ fontWeight: 600 }}>
                                        {selectedDevice?.is_connected ? 'Connected' : selectedDevice?.is_connecting ? 'Connecting' : 'Idle'}
                                    </div>
                                </div>
                                <Form form={renameForm} layout="vertical" onFinish={handleRename}>
                                    <Form.Item name="name" label="Rename" rules={[{ required: true, message: '请输入名称' }]}>
                                        <Input prefix={<EditOutlined />} placeholder="本地别名或设备名" />
                                    </Form.Item>
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        block
                                        loading={actionLoading === `rename:${selectedAddress}`}
                                        disabled={!selectedAddress}
                                    >
                                        更新名称
                                    </Button>
                                </Form>
                            </Space>
                        </Card>

                        <Card title="发送消息">
                            <Form layout="vertical" onFinish={handleSend} form={sendForm}>
                                <Form.Item label="发送模式">
                                    <Radio.Group value={sendMode} onChange={(e) => setSendMode(e.target.value as SendMode)}>
                                        <Radio.Button value="text">普通文本</Radio.Button>
                                        <Radio.Button value="json">JSON</Radio.Button>
                                        <Radio.Button value="raw">原样发送</Radio.Button>
                                    </Radio.Group>
                                </Form.Item>
                                <Alert type="info" showIcon message={sendModeHelp[sendMode]} style={{ marginBottom: 12 }} />
                                <Form.Item name="messageText" label="消息内容" rules={[{ required: true, message: '请输入要发送的内容' }]}>
                                    <Input.TextArea
                                        rows={5}
                                        placeholder={
                                            sendMode === 'json'
                                                ? '{"cmd":"ping","seq":1}'
                                                : sendMode === 'raw'
                                                    ? '原样内容'
                                                    : '输入测试消息'
                                        }
                                    />
                                </Form.Item>
                                <Space wrap style={{ marginBottom: 12 }}>
                                    <Checkbox checked={appendNewline} onChange={(e) => setAppendNewline(e.target.checked)} disabled={sendMode !== 'text'}>
                                        末尾追加换行
                                    </Checkbox>
                                    <Checkbox checked={broadcast} onChange={(e) => setBroadcast(e.target.checked)}>
                                        广播到所有已连接设备
                                    </Checkbox>
                                </Space>
                                <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                                    说明：普通文本会按开关决定是否补 `\n`；JSON 和原样发送默认不补换行，避免改变协议内容。
                                </Typography.Text>
                                <Button
                                    type="primary"
                                    icon={<SendOutlined />}
                                    htmlType="submit"
                                    block
                                    loading={actionLoading === 'send'}
                                    disabled={!broadcast && !selectedAddress}
                                >
                                    发送
                                </Button>
                            </Form>
                        </Card>
                    </Space>
                </Col>
            </Row>

            <Card title="消息日志">
                <List
                    size="small"
                    dataSource={messages.slice().reverse()}
                    locale={{ emptyText: '暂无消息' }}
                    renderItem={(item) => (
                        <List.Item>
                            <Space direction="vertical" size={0} style={{ width: '100%' }}>
                                <Space size={8}>
                                    <Tag color={item.direction === 'tx' ? 'green' : item.direction === 'rx' ? 'blue' : 'gold'}>
                                        {item.direction.toUpperCase()}
                                    </Tag>
                                    <Typography.Text type="secondary">{timeLabel(item.timestamp)}</Typography.Text>
                                    <Typography.Text type="secondary">{item.address}</Typography.Text>
                                </Space>
                                <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                                    {item.message}
                                </Typography.Paragraph>
                            </Space>
                        </List.Item>
                    )}
                />
            </Card>

            <Alert
                type="warning"
                showIcon
                message="改名优先尝试设备标准写入；如果设备不支持，只会保存为本地别名，不再报错。"
            />
        </Space>
    );
};
