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
    message
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import {
    getDefects,
    createDefect,
    updateDefect,
    deleteDefect,
    Defect,
    getTestCases
} from '../api';

const { TextArea } = Input;
const { Option } = Select;

interface DefectManagementProps {
    projectId?: string;
}

export const DefectManagement: React.FC<DefectManagementProps> = ({ projectId }) => {
    const [defects, setDefects] = useState<Defect[]>([]);
    const [testCases, setTestCases] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingDefect, setEditingDefect] = useState<Defect | null>(null);
    const [form] = Form.useForm();

    const loadData = async () => {
        setLoading(true);
        try {
            const [defectsData, casesData] = await Promise.all([
                getDefects(projectId ? { project_id: projectId } : undefined),
                projectId ? getTestCases(projectId) : []
            ]);
            setDefects(defectsData);
            setTestCases(casesData || []);
        } catch (error) {
            console.error('Failed to load defects:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [projectId]);

    const handleAdd = () => {
        setEditingDefect(null);
        form.resetFields();
        setModalVisible(true);
    };

    const handleEdit = (record: Defect) => {
        setEditingDefect(record);
        form.setFieldsValue(record);
        setModalVisible(true);
    };

    const handleDelete = async (record: Defect) => {
        try {
            await deleteDefect(record.id);
            message.success('缺陷删除成功');
            loadData();
        } catch (error) {
            console.error('Failed to delete defect:', error);
        }
    };

    const handleSubmit = async (values: any) => {
        try {
            if (editingDefect) {
                await updateDefect(editingDefect.id, values);
                message.success('缺陷更新成功');
            } else if (projectId) {
                await createDefect(projectId, values);
                message.success('缺陷创建成功');
            }
            setModalVisible(false);
            loadData();
        } catch (error) {
            console.error('Failed to save defect:', error);
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'red';
            case 'high': return 'orange';
            case 'medium': return 'gold';
            case 'low': return 'green';
            default: return 'default';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'open': return 'red';
            case 'in_progress': return 'blue';
            case 'resolved': return 'green';
            case 'closed': return 'default';
            default: return 'default';
        }
    };

    const columns = [
        {
            title: '标题',
            dataIndex: 'title',
            key: 'title',
            sorter: (a: Defect, b: Defect) => a.title.localeCompare(b.title),
        },
        {
            title: '严重程度',
            dataIndex: 'severity',
            key: 'severity',
            filters: [
                { text: '致命', value: 'critical' },
                { text: '高', value: 'high' },
                { text: '中', value: 'medium' },
                { text: '低', value: 'low' },
            ],
            onFilter: (value: any, record: Defect) => record.severity === value,
            render: (severity: string) => {
                const map: Record<string, string> = {
                    critical: '致命',
                    high: '高',
                    medium: '中',
                    low: '低'
                };
                return <Tag color={getSeverityColor(severity)}>{map[severity] || severity}</Tag>;
            },
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
            onFilter: (value: any, record: Defect) => record.priority === value,
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            filters: [
                { text: '新建', value: 'open' },
                { text: '处理中', value: 'in_progress' },
                { text: '已解决', value: 'resolved' },
                { text: '已关闭', value: 'closed' },
            ],
            onFilter: (value: any, record: Defect) => record.status === value,
            render: (status: string) => {
                const map: Record<string, string> = {
                    open: '新建',
                    in_progress: '处理中',
                    resolved: '已解决',
                    closed: '已关闭'
                };
                return <Tag color={getStatusColor(status)}>{map[status] || status}</Tag>;
            },
        },
        {
            title: '关联用例',
            dataIndex: 'test_case_id',
            key: 'test_case_id',
            filters: testCases.map(t => ({ text: t.title, value: t.id })),
            onFilter: (value: any, record: Defect) => record.test_case_id === value,
            render: (caseId: string) => {
                const tc = testCases.find(t => t.id === caseId);
                return tc ? tc.title : '-';
            },
        },
        {
            title: '创建时间',
            dataIndex: 'created_at',
            key: 'created_at',
            sorter: (a: Defect, b: Defect) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
            render: (date: string) => new Date(date).toLocaleDateString(),
        },
        {
            title: '操作',
            key: 'actions',
            render: (_: any, record: Defect) => (
                <Space size="middle">
                    <Button
                        type="link"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(record)}
                    >
                        编辑
                    </Button>
                    <Button
                        type="link"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDelete(record)}
                    >
                        删除
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <Card title="缺陷管理">
            <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAdd}
                style={{ marginBottom: 16 }}
            >
                新增缺陷
            </Button>
            <Table
                columns={columns}
                dataSource={defects}
                rowKey="id"
                loading={loading}
            />

            <Modal
                title={editingDefect ? "编辑缺陷" : "新增缺陷"}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                onOk={() => form.submit()}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                >
                    <Form.Item
                        name="title"
                        label="标题"
                        rules={[{ required: true, message: '请输入缺陷标题' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item name="description" label="描述">
                        <TextArea rows={4} />
                    </Form.Item>
                    <Form.Item
                        name="severity"
                        label="严重程度"
                        initialValue="medium"
                    >
                        <Select>
                            <Option value="critical">致命 (Critical)</Option>
                            <Option value="high">高 (High)</Option>
                            <Option value="medium">中 (Medium)</Option>
                            <Option value="low">低 (Low)</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item
                        name="priority"
                        label="优先级"
                        initialValue="P2"
                    >
                        <Select>
                            <Option value="P0">P0</Option>
                            <Option value="P1">P1</Option>
                            <Option value="P2">P2</Option>
                            <Option value="P3">P3</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item
                        name="status"
                        label="状态"
                        initialValue="open"
                    >
                        <Select>
                            <Option value="open">新建 (Open)</Option>
                            <Option value="in_progress">处理中 (In Progress)</Option>
                            <Option value="resolved">已解决 (Resolved)</Option>
                            <Option value="closed">已关闭 (Closed)</Option>
                        </Select>
                    </Form.Item>
                    {testCases.length > 0 && (
                        <Form.Item name="test_case_id" label="测试用例">
                            <Select>
                                {testCases.map(tc => (
                                    <Option key={tc.id} value={tc.id}>{tc.title}</Option>
                                ))}
                            </Select>
                        </Form.Item>
                    )}
                    <Form.Item name="external_id" label="外部 ID">
                        <Input placeholder="JIRA/Issue ID" />
                    </Form.Item>
                    <Form.Item name="external_url" label="外部链接">
                        <Input placeholder="https://..." />
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    );
};
