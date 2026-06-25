import React, { useEffect, useMemo, useState } from 'react';
import {
    Button,
    Card,
    Col,
    Input,
    Modal,
    Row,
    Space,
    Statistic,
    Table,
    Typography
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DownloadOutlined, ExperimentOutlined, LinkOutlined } from '@ant-design/icons';
import { ReleaseArtifact, getReleaseArtifacts } from '../api';

const { Title, Text } = Typography;

const formatDateTime = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('zh-CN', { hour12: false });
};

const formatBytes = (size?: number) => {
    if (!size && size !== 0) return '-';
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = size;
    let idx = 0;
    while (value >= 1024 && idx < units.length - 1) {
        value /= 1024;
        idx += 1;
    }
    return `${value.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
};

export const Artifacts: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [artifacts, setArtifacts] = useState<ReleaseArtifact[]>([]);
    const [artifactVersion, setArtifactVersion] = useState('');
    const [artifactBranch, setArtifactBranch] = useState('');
    const [viewingArtifact, setViewingArtifact] = useState<ReleaseArtifact | null>(null);

    const artifactStats = useMemo(() => {
        const totalSize = artifacts.reduce((sum, item) => sum + (item.file_size || 0), 0);
        return {
            total: artifacts.length,
            versions: new Set(artifacts.map((item) => item.version)).size,
            totalSize
        };
    }, [artifacts]);

    const loadArtifacts = async () => {
        setLoading(true);
        try {
            setArtifacts(await getReleaseArtifacts({
                version: artifactVersion || undefined,
                branch: artifactBranch || undefined
            }));
        } catch (error) {
            console.error('Failed to load artifacts:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadArtifacts();
    }, []);

    const artifactColumns: ColumnsType<ReleaseArtifact> = [
        {
            title: '版本',
            dataIndex: 'version',
            key: 'version',
            render: (version: string, record) => (
                <Button type="link" style={{ padding: 0 }} onClick={() => setViewingArtifact(record)}>
                    {version}
                </Button>
            )
        },
        { title: '制品名称', dataIndex: 'name', key: 'name' },
        { title: '分支', dataIndex: 'branch', key: 'branch', render: (branch: string) => branch || '-' },
        { title: 'Commit', dataIndex: 'commit_sha', key: 'commit_sha', render: (sha: string) => sha || '-' },
        { title: '大小', dataIndex: 'file_size', key: 'file_size', render: formatBytes },
        {
            title: '构建时间',
            dataIndex: 'built_at',
            key: 'built_at',
            sorter: (a, b) => new Date(a.built_at || a.created_at).getTime() - new Date(b.built_at || b.created_at).getTime(),
            defaultSortOrder: 'descend',
            render: (date: string, record) => formatDateTime(date || record.created_at)
        },
        {
            title: '操作',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    {record.download_url && (
                        <Button type="link" size="small" icon={<DownloadOutlined />} onClick={() => window.open(record.download_url, '_blank')}>
                            下载
                        </Button>
                    )}
                    {record.pipeline_url && (
                        <Button type="link" size="small" icon={<LinkOutlined />} onClick={() => window.open(record.pipeline_url, '_blank')}>
                            流水线
                        </Button>
                    )}
                </Space>
            )
        }
    ];

    return (
        <div>
            <Title level={3} style={{ marginBottom: 24 }}>制品管理</Title>
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={8}><Card><Statistic title="制品总数" value={artifactStats.total} prefix={<ExperimentOutlined />} /></Card></Col>
                <Col span={8}><Card><Statistic title="版本数" value={artifactStats.versions} valueStyle={{ color: '#1677ff' }} /></Card></Col>
                <Col span={8}><Card><Statistic title="累计大小" value={formatBytes(artifactStats.totalSize)} /></Card></Col>
            </Row>
            <Card>
                <Space style={{ marginBottom: 16 }} wrap>
                    <Input
                        allowClear
                        placeholder="按版本搜索"
                        value={artifactVersion}
                        onChange={(event) => setArtifactVersion(event.target.value)}
                        style={{ width: 180 }}
                    />
                    <Input
                        allowClear
                        placeholder="按分支精确筛选"
                        value={artifactBranch}
                        onChange={(event) => setArtifactBranch(event.target.value)}
                        style={{ width: 220 }}
                    />
                    <Button type="primary" onClick={loadArtifacts}>查询</Button>
                </Space>
                <Table columns={artifactColumns} dataSource={artifacts} rowKey="id" loading={loading} />
            </Card>

            <Modal
                title={viewingArtifact?.name}
                open={!!viewingArtifact}
                onCancel={() => setViewingArtifact(null)}
                footer={(
                    <Space>
                        <Button onClick={() => setViewingArtifact(null)}>关闭</Button>
                        {viewingArtifact?.download_url && (
                            <Button type="primary" icon={<DownloadOutlined />} onClick={() => window.open(viewingArtifact.download_url, '_blank')}>
                                下载制品
                            </Button>
                        )}
                    </Space>
                )}
                width={760}
            >
                {viewingArtifact && (
                    <Row gutter={[16, 12]}>
                        <Col span={12}><Text type="secondary">版本: </Text>{viewingArtifact.version}</Col>
                        <Col span={12}><Text type="secondary">分支: </Text>{viewingArtifact.branch || '-'}</Col>
                        <Col span={12}><Text type="secondary">Commit: </Text>{viewingArtifact.commit_sha || '-'}</Col>
                        <Col span={12}><Text type="secondary">大小: </Text>{formatBytes(viewingArtifact.file_size)}</Col>
                        <Col span={12}><Text type="secondary">构建时间: </Text>{formatDateTime(viewingArtifact.built_at || viewingArtifact.created_at)}</Col>
                        <Col span={12}><Text type="secondary">存储: </Text>{viewingArtifact.storage_type}</Col>
                        <Col span={24}><Text type="secondary">SHA256: </Text>{viewingArtifact.file_sha256 || '-'}</Col>
                        <Col span={24}>
                            <Space>
                                {viewingArtifact.pipeline_url && (
                                    <Button icon={<LinkOutlined />} onClick={() => window.open(viewingArtifact.pipeline_url, '_blank')}>
                                        查看流水线
                                    </Button>
                                )}
                                {viewingArtifact.job_url && (
                                    <Button icon={<LinkOutlined />} onClick={() => window.open(viewingArtifact.job_url, '_blank')}>
                                        查看出包 Job
                                    </Button>
                                )}
                            </Space>
                        </Col>
                    </Row>
                )}
            </Modal>
        </div>
    );
};
