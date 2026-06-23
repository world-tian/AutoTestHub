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
    DatePicker,
    message,
    Typography,
    Progress
} from 'antd';
import {
    PlusOutlined,
    EditOutlined
} from '@ant-design/icons';
import {
    getVersionIterations,
    createVersionIteration,
    updateVersionIteration,
    VersionIteration
} from '../api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

export const VersionIterations: React.FC = () => {
    const [iterations, setIterations] = useState<VersionIteration[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingIteration, setEditingIteration] = useState<VersionIteration | null>(null);
    const [form] = Form.useForm();

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await getVersionIterations();
            setIterations(data);
        } catch (error) {
            console.error('Failed to load iterations:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleAdd = () => {
        setEditingIteration(null);
        form.resetFields();
        setModalVisible(true);
    };

    const handleEdit = (iteration: VersionIteration) => {
        setEditingIteration(iteration);
        form.setFieldsValue({
            ...iteration,
            start_date: dayjs(iteration.start_date),
            end_date: iteration.end_date ? dayjs(iteration.end_date) : null
        });
        setModalVisible(true);
    };

    const handleSubmit = async (values: any) => {
        try {
            const data = {
                ...values,
                start_date: values.start_date?.format('YYYY-MM-DD'),
                end_date: values.end_date?.format('YYYY-MM-DD')
            };
            
            if (editingIteration) {
                await updateVersionIteration(editingIteration.id, data);
                message.success('迭代更新成功');
            } else {
                await createVersionIteration('default', data);
                message.success('迭代创建成功');
            }
            setModalVisible(false);
            loadData();
        } catch (error) {
            console.error('Failed to save iteration:', error);
        }
    };

    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'planned': return 'blue';
            case 'in_progress': return 'green';
            case 'testing': return 'orange';
            case 'released': return 'purple';
            case 'archived': return 'default';
            default: return 'default';
        }
    };

    const calculateProgress = (iteration: VersionIteration) => {
        if (!iteration.total_cases || iteration.total_cases === 0) return 0;
        return Math.round(((iteration.passed_cases || 0) / iteration.total_cases) * 100);
    };

    const columns = [
        {
            title: '名称',
            dataIndex: 'name',
            key: 'name',
            sorter: (a: VersionIteration, b: VersionIteration) => a.name.localeCompare(b.name),
        },
        {
            title: '版本号',
            dataIndex: 'version',
            key: 'version',
            sorter: (a: VersionIteration, b: VersionIteration) => (a.version || '').localeCompare(b.version || ''),
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            filters: [
                { text: '计划中', value: 'planned' },
                { text: '进行中', value: 'in_progress' },
                { text: '测试中', value: 'testing' },
                { text: '已发布', value: 'released' },
                { text: '已归档', value: 'archived' },
            ],
            onFilter: (value: any, record: VersionIteration) => record.status === value,
            render: (status: string) => {
                const map: Record<string, string> = {
                    planned: '计划中',
                    in_progress: '进行中',
                    testing: '测试中',
                    released: '已发布',
                    archived: '已归档'
                };
                return <Tag color={getStatusColor(status)}>{map[status] || status}</Tag>;
            },
        },
        {
            title: '时间周期',
            key: 'period',
            render: (_: any, record: VersionIteration) => (
                <span>
                    {record.start_date ? new Date(record.start_date).toLocaleDateString() : ''}
                    {record.end_date ? ` - ${new Date(record.end_date).toLocaleDateString()}` : ''}
                </span>
            ),
        },
        {
            title: '进度',
            key: 'progress',
            render: (_: any, record: VersionIteration) => (
                <Progress percent={calculateProgress(record)} size="small" />
            ),
        },
        {
            title: '创建时间',
            dataIndex: 'created_at',
            key: 'created_at',
            sorter: (a: VersionIteration, b: VersionIteration) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
            render: (date: string) => new Date(date).toLocaleDateString(),
        },
        {
            title: '操作',
            key: 'actions',
            render: (_: any, record: VersionIteration) => (
                <Space>
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
                    编辑
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0 }}>版本迭代管理</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                    新建迭代
                </Button>
                </div>
                <Table
                columns={columns}
                dataSource={iterations}
                rowKey="id"
                loading={loading}
                />
            </Card>

            <Modal
                title={editingIteration ? '编辑迭代' : '新建迭代'}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                onOk={() => form.submit()}
                width={700}
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                <Form.Item name="name" label="迭代名称" rules={[{ required: true }]}>
                    <Input placeholder="例如: v1.0.0 Sprint 1" />
                </Form.Item>
                <Form.Item name="version" label="版本号">
                    <Input placeholder="1.0.0" />
                </Form.Item>
                <Form.Item name="status" label="状态" initialValue="planned">
                    <Select>
                    <Option value="planned">计划中 (Planned)</Option>
                    <Option value="in_progress">进行中 (In Progress)</Option>
                    <Option value="testing">测试中 (Testing)</Option>
                    <Option value="released">已发布 (Released)</Option>
                    <Option value="archived">已归档 (Archived)</Option>
                    </Select>
                </Form.Item>
                <Form.Item name="start_date" label="开始日期">
                    <DatePicker style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="end_date" label="结束日期">
                    <DatePicker style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="description" label="描述">
                    <TextArea rows={4} />
                </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};
