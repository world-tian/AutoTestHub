import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Button,
    Card,
    Col,
    DatePicker,
    Form,
    Modal,
    Row,
    Space,
    Statistic,
    Table,
    Tabs,
    Tag,
    Typography,
    message
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { BarChartOutlined, FileSearchOutlined, LinkOutlined, RobotOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
    CIReport,
    CIReportJob,
    ExecutionRun,
    Project,
    ReportRecord,
    generateDailyReport,
    generateWeeklyReport,
    getAllExecutionRuns,
    getCIReport,
    getCIReports,
    getProjects,
    getReportRecords
} from '../api';

const { Title, Text } = Typography;

const formatDateTime = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('zh-CN', { hour12: false });
};

const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('zh-CN');
};

const formatDuration = (sec?: number) => {
    if (sec === undefined || sec === null) return '-';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}分${s}秒` : `${s}秒`;
};

const statusTag = (status?: string) => {
    const map: Record<string, [string, string]> = {
        pending: ['orange', '待执行'],
        running: ['cyan', '执行中'],
        completed: ['green', '已完成'],
        success: ['green', '成功'],
        failed: ['red', '失败'],
        skipped: ['default', '跳过'],
        canceled: ['orange', '已取消'],
        manual: ['purple', '手动']
    };
    const [color, label] = map[status || ''] || ['default', status || '-'];
    return <Tag color={color}>{label}</Tag>;
};

export const Reports: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('executions');
    const [loading, setLoading] = useState(false);
    const [projectsMap, setProjectsMap] = useState<Record<string, string>>({});
    const [executions, setExecutions] = useState<ExecutionRun[]>([]);
    const [ciReports, setCiReports] = useState<CIReport[]>([]);
    const [records, setRecords] = useState<ReportRecord[]>([]);
    const [viewingReport, setViewingReport] = useState<ReportRecord | null>(null);
    const [viewingCI, setViewingCI] = useState<CIReport | null>(null);
    const [genModalVisible, setGenModalVisible] = useState(false);
    const [genType, setGenType] = useState<'daily' | 'weekly'>('daily');
    const [genDate, setGenDate] = useState(dayjs().format('YYYY-MM-DD'));

    const loadProjectsMap = async () => {
        if (Object.keys(projectsMap).length > 0) return;
        const projects = await getProjects();
        const nextMap: Record<string, string> = {};
        projects.forEach((project: Project) => {
            nextMap[project.id] = project.name;
        });
        setProjectsMap(nextMap);
    };

    const loadData = async () => {
        setLoading(true);
        try {
            await loadProjectsMap();
            if (activeTab === 'executions') {
                setExecutions(await getAllExecutionRuns());
            } else if (activeTab === 'ci') {
                setCiReports(await getCIReports());
            } else {
                setRecords(await getReportRecords());
            }
        } catch (error) {
            console.error('Failed to load reports:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const openCIDetail = async (record: CIReport) => {
        try {
            setViewingCI(await getCIReport(record.id));
        } catch {
            setViewingCI(record);
        }
    };

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
            message.error('报告生成失败');
        }
    };

    const executionColumns: ColumnsType<ExecutionRun> = [
        {
            title: '项目',
            key: 'projectName',
            render: (_, record) => (
                <Button type="link" onClick={() => navigate(`/projects/${record.project_id}`)} style={{ padding: 0 }}>
                    {projectsMap[record.project_id] || record.project_id}
                </Button>
            )
        },
        {
            title: '执行名称',
            dataIndex: 'name',
            key: 'name',
            render: (text: string, record) => (
                <Button type="link" onClick={() => window.open(`/runs/${record.id}`, '_blank')} style={{ padding: 0 }}>
                    {text}
                </Button>
            )
        },
        { title: '状态', dataIndex: 'status', key: 'status', render: statusTag },
        {
            title: '创建时间',
            dataIndex: 'created_at',
            key: 'created_at',
            sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
            defaultSortOrder: 'descend',
            render: formatDateTime
        },
        {
            title: '操作',
            key: 'actions',
            render: (_, record) => (
                <Button type="link" size="small" onClick={() => window.open(`/runs/${record.id}`, '_blank')}>
                    查看报告
                </Button>
            )
        }
    ];

    const ciColumns: ColumnsType<CIReport> = [
        {
            title: '报告名称',
            dataIndex: 'name',
            key: 'name',
            render: (text: string, record) => (
                <Button type="link" style={{ padding: 0 }} onClick={() => openCIDetail(record)}>
                    {text}
                </Button>
            )
        },
        {
            title: '分支',
            dataIndex: 'branch',
            key: 'branch',
            render: (branch: string, record) => <span>{branch} <Text type="secondary">@{record.commit_sha}</Text></span>
        },
        { title: '触发人', dataIndex: 'trigger_name', key: 'trigger_name', render: (name: string) => name || '-' },
        { title: '结果', dataIndex: 'status', key: 'status', render: statusTag },
        { title: '覆盖率', dataIndex: 'coverage', key: 'coverage', render: (coverage: string) => coverage || '-' },
        { title: '耗时', dataIndex: 'duration', key: 'duration', render: formatDuration },
        {
            title: '生成时间',
            dataIndex: 'created_at',
            key: 'created_at',
            sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
            defaultSortOrder: 'descend',
            render: formatDateTime
        },
        {
            title: '操作',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button type="link" size="small" onClick={() => openCIDetail(record)}>详情</Button>
                    {record.pipeline_url && (
                        <Button type="link" size="small" icon={<LinkOutlined />} onClick={() => window.open(record.pipeline_url, '_blank')}>
                            GitLab
                        </Button>
                    )}
                </Space>
            )
        }
    ];

    const ciJobColumns: ColumnsType<CIReportJob> = [
        { title: '阶段', dataIndex: 'stage', key: 'stage' },
        { title: 'Job', dataIndex: 'name', key: 'name' },
        { title: '结果', dataIndex: 'status', key: 'status', render: statusTag },
        { title: '耗时', dataIndex: 'duration', key: 'duration', render: formatDuration },
        { title: '覆盖率', dataIndex: 'coverage', key: 'coverage', render: (coverage: string) => coverage || '-' },
        {
            title: '日志',
            key: 'log',
            render: (_, job) => job.web_url
                ? <Button type="link" size="small" onClick={() => window.open(job.web_url, '_blank')}>GitLab 查看</Button>
                : '-'
        }
    ];

    const reportColumns: ColumnsType<ReportRecord> = [
        { title: '报告名称', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
        {
            title: '类型',
            dataIndex: 'report_type',
            key: 'report_type',
            render: (type: string) => <Tag color={type === 'daily' ? 'blue' : type === 'weekly' ? 'green' : 'purple'}>{type}</Tag>
        },
        {
            title: '时间范围',
            key: 'period',
            render: (_, record) => `${record.start_date ? formatDate(record.start_date) : ''}${record.end_date ? ` - ${formatDate(record.end_date)}` : ''}`
        },
        {
            title: '生成时间',
            dataIndex: 'created_at',
            key: 'created_at',
            sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
            render: formatDate
        },
        {
            title: '操作',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button type="link" size="small" icon={<FileSearchOutlined />} onClick={() => setViewingReport(record)}>
                        查看分析
                    </Button>
                    <Button
                        type="link"
                        size="small"
                        icon={<RobotOutlined />}
                        onClick={() => {
                            const content = record.content || JSON.stringify(record.content_json);
                            navigate('/ai-assistant', {
                                state: { initialQuestion: `请深入分析这份测试报告：\n\n${content}` }
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
            )
        }
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
                                <Table columns={executionColumns} dataSource={executions} rowKey="id" loading={loading} />
                            </Card>
                        )
                    },
                    {
                        key: 'ci',
                        label: '持续集成报告',
                        children: (
                            <>
                                <Row gutter={16} style={{ marginBottom: 16 }}>
                                    <Col span={8}><Card><Statistic title="流水线总数" value={ciReports.length} prefix={<BarChartOutlined />} /></Card></Col>
                                    <Col span={8}><Card><Statistic title="成功" value={ciReports.filter((item) => item.status === 'success').length} valueStyle={{ color: '#3f8600' }} /></Card></Col>
                                    <Col span={8}><Card><Statistic title="失败" value={ciReports.filter((item) => item.status === 'failed').length} valueStyle={{ color: '#cf1322' }} /></Card></Col>
                                </Row>
                                <Card>
                                    <Title level={4} style={{ marginTop: 0 }}>持续集成报告</Title>
                                    <Table columns={ciColumns} dataSource={ciReports} rowKey="id" loading={loading} />
                                </Card>
                            </>
                        )
                    },
                    {
                        key: 'ai_reports',
                        label: 'AI 分析报告记录',
                        children: (
                            <>
                                <Row gutter={16} style={{ marginBottom: 16 }}>
                                    <Col span={8}><Card><Statistic title="总报告数" value={records.length} prefix={<BarChartOutlined />} /></Card></Col>
                                    <Col span={8}><Card><Statistic title="日报数量" value={records.filter((item) => item.report_type === 'daily').length} valueStyle={{ color: '#3f8600' }} /></Card></Col>
                                    <Col span={8}><Card><Statistic title="周报数量" value={records.filter((item) => item.report_type === 'weekly').length} valueStyle={{ color: '#1890ff' }} /></Card></Col>
                                </Row>
                                <Card>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                        <Title level={4} style={{ margin: 0 }}>分析与报告记录</Title>
                                        <Space>
                                            <Button type="primary" onClick={handleGenerateDaily}>生成日报</Button>
                                            <Button type="primary" onClick={handleGenerateWeekly}>生成周报</Button>
                                        </Space>
                                    </div>
                                    <Table columns={reportColumns} dataSource={records} rowKey="id" loading={loading} />
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
                footer={(
                    <Space>
                        <Button onClick={() => setViewingReport(null)}>关闭</Button>
                        <Button
                            type="primary"
                            icon={<RobotOutlined />}
                            onClick={() => {
                                const content = viewingReport?.content || JSON.stringify(viewingReport?.content_json);
                                navigate('/ai-assistant', {
                                    state: { initialQuestion: `请深入分析这份测试报告：\n\n${content}` }
                                });
                            }}
                        >
                            AI 进一步分析
                        </Button>
                    </Space>
                )}
                width={800}
            >
                {viewingReport && (
                    <div>
                        <div style={{ marginBottom: 16 }}>
                            <Text type="secondary">生成时间: {formatDateTime(viewingReport.created_at)}</Text>
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

            <Modal
                title={viewingCI?.name}
                open={!!viewingCI}
                onCancel={() => setViewingCI(null)}
                footer={(
                    <Space>
                        <Button onClick={() => setViewingCI(null)}>关闭</Button>
                        {viewingCI?.pipeline_url && (
                            <Button type="primary" onClick={() => window.open(viewingCI.pipeline_url, '_blank')}>
                                在 GitLab 查看流水线
                            </Button>
                        )}
                    </Space>
                )}
                width={1000}
            >
                {viewingCI && (
                    <div>
                        <Row gutter={[16, 8]} style={{ marginBottom: 16 }}>
                            <Col span={8}><Text type="secondary">触发人: </Text>{viewingCI.trigger_name || '-'}</Col>
                            <Col span={8}><Text type="secondary">结果: </Text>{statusTag(viewingCI.status)}</Col>
                            <Col span={8}><Text type="secondary">来源: </Text>{viewingCI.source || '-'}</Col>
                            <Col span={8}><Text type="secondary">分支: </Text>{viewingCI.branch} @{viewingCI.commit_sha}</Col>
                            <Col span={8}><Text type="secondary">覆盖率: </Text>{viewingCI.coverage || '-'}</Col>
                            <Col span={8}><Text type="secondary">总耗时: </Text>{formatDuration(viewingCI.duration)}</Col>
                            <Col span={24}><Text type="secondary">生成时间: </Text>{formatDateTime(viewingCI.created_at)}</Col>
                        </Row>
                        <Title level={5}>各环节执行情况</Title>
                        <Table
                            columns={ciJobColumns}
                            dataSource={viewingCI.jobs || []}
                            rowKey="id"
                            size="small"
                            pagination={false}
                            expandable={{
                                expandedRowRender: (job: CIReportJob) => (
                                    <pre style={{ background: '#1e1e1e', color: '#d4d4d4', padding: 12, borderRadius: 4, overflow: 'auto', maxHeight: 400, fontSize: 12, whiteSpace: 'pre-wrap' }}>
                                        {job.log || '(无日志)'}
                                    </pre>
                                ),
                                rowExpandable: (job) => !!job.log
                            }}
                        />
                    </div>
                )}
            </Modal>
        </div>
    );
};
