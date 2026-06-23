import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Table,
    Button,
    Modal,
    Form,
    Space,
    Tag,
    Card,
    DatePicker,
    message,
    Typography,
    Row,
    Col,
    Statistic,
    Tabs
} from 'antd';
import {
    BarChartOutlined,
    DownloadOutlined,
    RobotOutlined
} from '@ant-design/icons';
import {
    getReportRecords,
    generateDailyReport,
    generateWeeklyReport,
    ReportRecord,
    getAllExecutionRuns,
    ExecutionRun,
    getProjects,
    Project
} from '../api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export const Reports: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('executions');
    const [records, setRecords] = useState<ReportRecord[]>([]);
    const [executions, setExecutions] = useState<ExecutionRun[]>([]);
    const [projectsMap, setProjectsMap] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [genModalVisible, setGenModalVisible] = useState(false);
    const [genType, setGenType] = useState<'daily' | 'weekly'>('daily');
    const [genDate, setGenDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
    const [viewingReport, setViewingReport] = useState<ReportRecord | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load projects once to map project IDs to names
            if (Object.keys(projectsMap).length === 0) {
                const projects = await getProjects();
                const pMap: Record<string, string> = {};
                projects.forEach((p: Project) => {
                    pMap[p.id] = p.name;
                });
                setProjectsMap(pMap);
            }

            if (activeTab === 'executions') {
                const execData = await getAllExecutionRuns();
                setExecutions(execData);
            } else {
                const recordData = await getReportRecords();
                setRecords(recordData);
            }
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const handleGenerateDaily = () => {
        setGenType('daily');
        setGenDate(dayjs().format('YYYY-MM-DD'));
        setGenModalVisible(true);
    };

    const handleGenerateWeekly = () => {
        setGenType('weekly');
        setGenDate(dayjs().format('YYYY-MM-DD'));
        setGenModalVisible(true);
    };

    const handleGenerate = async () => {
        try {
            // Placeholder project ID since it's required by the API but missing in this view
            const projectId = 'default';
            if (genType === 'daily') {
                await generateDailyReport(projectId, genDate);
            } else {
                await generateWeeklyReport(projectId, genDate);
            }
            message.success('报告生成成功');
            setGenModalVisible(false);
            loadData();
        } catch (error) {
            console.error('Failed to generate report:', error);
            message.error('Failed to generate report');
        }
    };

    const handleView = (record: ReportRecord) => {
        setViewingReport(record);
    };

    const getReportTypeColor = (type?: string) => {
        switch (type) {
            case 'daily': return 'blue';
            case 'weekly': return 'green';
            case 'version': return 'purple';
            case 'custom': return 'default';
            default: return 'default';
        }
    };

    const getStatusTag = (status: string) => {
        const colors: Record<string, string> = {
            pending: 'orange',
            running: 'cyan',
            completed: 'green',
            failed: 'red'
        };
        const labels: Record<string, string> = {
            pending: '待执行',
            running: '执行中',
            completed: '已完成',
            failed: '失败'
        };
        return <Tag color={colors[status] || 'default'}>{labels[status] || status}</Tag>;
    };

    const executionColumns = [
        {
            title: '项目名称',
            key: 'projectName',
            render: (_: any, record: ExecutionRun) => (
                <Button type="link" onClick={() => navigate(`/projects/${record.project_id}`)} style={{ padding: 0 }}>
                    {projectsMap[record.project_id] || record.project_id}
                </Button>
            )
        },
        {
            title: '执行名称',
            dataIndex: 'name',
            key: 'name',
            render: (text: string, record: ExecutionRun) => (
                <Button type="link" onClick={() => window.open(`/runs/${record.id}`, '_blank')} style={{ padding: 0 }}>
                    {text}
                </Button>
            )
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => getStatusTag(status)
        },
        {
            title: '创建时间',
            dataIndex: 'created_at',
            key: 'created_at',
            sorter: (a: ExecutionRun, b: ExecutionRun) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
            render: (date: string) => new Date(date).toLocaleString(),
        },
        {
            title: '操作',
            key: 'actions',
            render: (_: any, record: ExecutionRun) => (
                <Space>
                    <Button type="link" size="small" onClick={() => window.open(`/runs/${record.id}`, '_blank')}>
                        查看报告
                    </Button>
                </Space>
            )
        }
    ];

    const columns = [
        {
            title: '报告名称',
            dataIndex: 'name',
            key: 'name',
            sorter: (a: ReportRecord, b: ReportRecord) => a.name.localeCompare(b.name),
        },
        {
            title: '类型',
            dataIndex: 'report_type',
            key: 'report_type',
            filters: [
                { text: '日报', value: 'daily' },
                { text: '周报', value: 'weekly' },
                { text: '版本报告', value: 'version' },
                { text: '自定义', value: 'custom' },
            ],
            onFilter: (value: any, record: ReportRecord) => record.report_type === value,
            render: (type: string) => <Tag color={getReportTypeColor(type)}>{type}</Tag>,
        },
        {
            title: '时间范围',
            key: 'period',
            render: (_: any, record: ReportRecord) => (
                <span>
                    {record.start_date ? new Date(record.start_date).toLocaleDateString() : ''}
                    {record.end_date ? ` - ${new Date(record.end_date).toLocaleDateString()}` : ''}
                </span>
            ),
        },
        {
            title: '生成时间',
            dataIndex: 'created_at',
            key: 'created_at',
            sorter: (a: ReportRecord, b: ReportRecord) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
            render: (date: string) => new Date(date).toLocaleDateString(),
        },
        {
            title: '操作',
            key: 'actions',
            render: (_: any, record: ReportRecord) => (
                <Space>
                    <Button type="link" size="small" icon={<DownloadOutlined />} onClick={() => handleView(record)}>
                        查看分析
                    </Button>
                    <Button 
                        type="link" 
                        size="small" 
                        icon={<RobotOutlined />} 
                        onClick={() => {
                            const content = record.content || JSON.stringify(record.content_json);
                            navigate('/ai-assistant', {
                                state: {
                                    initialQuestion: `请帮我深入分析一下这份测试报告：\n\n${content}`
                                }
                            });
                        }}
                    >
                        AI 洞察
                    </Button>
                    {record.execution_run_id && (
                        <Button type="link" size="small" onClick={() => window.open(`/runs/${record.execution_run_id}`, '_blank')}>
                            测试明细
                        </Button>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div>
            <Title level={3} style={{ marginBottom: 24 }}>分析与报告</Title>
            <Tabs 
                activeKey={activeTab} 
                onChange={setActiveTab}
                items={[
                    {
                        key: 'executions',
                        label: '测试执行报告',
                        children: (
                            <Card>
                                <Table
                                    columns={executionColumns}
                                    dataSource={executions}
                                    rowKey="id"
                                    loading={loading}
                                />
                            </Card>
                        )
                    },
                    {
                        key: 'ai_reports',
                        label: 'AI 分析报告记录',
                        children: (
                            <>
                                <Row gutter={16} style={{ marginBottom: 16 }}>
                                    <Col span={8}>
                                    <Card>
                                        <Statistic
                                        title="总报告数"
                                        value={records.length}
                                        prefix={<BarChartOutlined />}
                                        />
                                    </Card>
                                    </Col>
                                    <Col span={8}>
                                    <Card>
                                        <Statistic
                                        title="日报数量"
                                        value={records.filter(r => r.report_type === 'daily').length}
                                        valueStyle={{ color: '#3f8600' }}
                                        />
                                    </Card>
                                    </Col>
                                    <Col span={8}>
                                    <Card>
                                        <Statistic
                                        title="周报数量"
                                        value={records.filter(r => r.report_type === 'weekly').length}
                                        valueStyle={{ color: '#1890ff' }}
                                        />
                                    </Card>
                                    </Col>
                                </Row>

                                <Card>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                    <Title level={4} style={{ margin: 0 }}>分析与报告记录</Title>
                                    <Space>
                                        <Button type="primary" onClick={handleGenerateDaily}>
                                        生成日报
                                        </Button>
                                        <Button type="primary" onClick={handleGenerateWeekly}>
                                        生成周报
                                        </Button>
                                    </Space>
                                    </div>
                                    <Table
                                    columns={columns}
                                    dataSource={records}
                                    rowKey="id"
                                    loading={loading}
                                    />
                                </Card>
                            </>
                        )
                    }
                ]}
            />

            <Modal
                title={`生成 ${genType === 'daily' ? '日报' : '周报'}`}
                open={genModalVisible}
                onCancel={() => setGenModalVisible(false)}
                onOk={handleGenerate}
            >
                <Form layout="vertical">
                <Form.Item label="日期">
                    <DatePicker
                    value={dayjs(genDate)}
                    onChange={(date) => setGenDate(date?.format('YYYY-MM-DD') || '')}
                    style={{ width: '100%' }}
                    />
                </Form.Item>
                </Form>
            </Modal>

            <Modal
                title={viewingReport?.name}
                open={!!viewingReport}
                onCancel={() => setViewingReport(null)}
                footer={
                    <Space>
                        <Button onClick={() => setViewingReport(null)}>关闭</Button>
                        <Button 
                            type="primary" 
                            icon={<RobotOutlined />}
                            onClick={() => {
                                const content = viewingReport?.content || JSON.stringify(viewingReport?.content_json);
                                navigate('/ai-assistant', {
                                    state: {
                                        initialQuestion: `请帮我深入分析一下这份测试报告：\n\n${content}`
                                    }
                                });
                            }}
                        >
                            AI 进一步分析
                        </Button>
                    </Space>
                }
                width={800}
            >
                {viewingReport && (
                <div>
                    <div style={{ marginBottom: 16 }}>
                    <Text type="secondary">生成时间: {new Date(viewingReport.created_at).toLocaleString()}</Text>
                    </div>
                    {viewingReport.content ? (
                        <div dangerouslySetInnerHTML={{ __html: viewingReport.content }} />
                    ) : (
                        <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 4, overflow: 'auto', maxHeight: 400 }}>
                        {JSON.stringify(viewingReport.content_json, null, 2)}
                        </pre>
                    )}
                </div>
                )}
            </Modal>
        </div>
    );
};
