import React, { useEffect, useMemo, useState } from 'react';
import {
    Button,
    Card,
    Col,
    DatePicker,
    Modal,
    Popconfirm,
    Row,
    Segmented,
    Select,
    Space,
    Statistic,
    Table,
    Typography
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { DeleteOutlined, DownloadOutlined, ExperimentOutlined, LinkOutlined, ReloadOutlined } from '@ant-design/icons';
import { ReleaseArtifact, api, deleteReleaseArtifact, getReleaseArtifacts } from '../api';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

type TimeQuickFilter = 'all' | 'today' | '7d' | '30d' | 'custom';

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

const artifactTime = (artifact: ReleaseArtifact) => artifact.built_at || artifact.created_at;

const inTimeRange = (
    artifact: ReleaseArtifact,
    quickFilter: TimeQuickFilter,
    customRange: [Dayjs | null, Dayjs | null] | null
) => {
    if (quickFilter === 'all') return true;

    const value = artifactTime(artifact);
    if (!value) return false;

    const builtAt = dayjs(value);
    if (!builtAt.isValid()) return false;

    if (quickFilter === 'today') {
        return builtAt.isAfter(dayjs().startOf('day')) && builtAt.isBefore(dayjs().endOf('day'));
    }

    if (quickFilter === '7d') {
        return builtAt.isAfter(dayjs().subtract(7, 'day').startOf('day'));
    }

    if (quickFilter === '30d') {
        return builtAt.isAfter(dayjs().subtract(30, 'day').startOf('day'));
    }

    if (customRange?.[0] && customRange?.[1]) {
        return builtAt.isAfter(customRange[0].startOf('day')) && builtAt.isBefore(customRange[1].endOf('day'));
    }

    return true;
};

export const Artifacts: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [allArtifacts, setAllArtifacts] = useState<ReleaseArtifact[]>([]);
    const [artifactVersion, setArtifactVersion] = useState<string>();
    const [artifactBranch, setArtifactBranch] = useState<string>();
    const [timeQuickFilter, setTimeQuickFilter] = useState<TimeQuickFilter>('all');
    const [customRange, setCustomRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
    const [viewingArtifact, setViewingArtifact] = useState<ReleaseArtifact | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);

    const versionOptions = useMemo(() => (
        Array.from(new Set(allArtifacts.map((item) => item.version).filter(Boolean)))
            .sort((a, b) => b.localeCompare(a))
            .map((version) => ({ label: version, value: version }))
    ), [allArtifacts]);

    const branchOptions = useMemo(() => (
        Array.from(new Set(allArtifacts.map((item) => item.branch).filter(Boolean) as string[]))
            .sort((a, b) => a.localeCompare(b))
            .map((branch) => ({ label: branch, value: branch }))
    ), [allArtifacts]);

    const artifacts = useMemo(() => (
        allArtifacts.filter((item) => {
            const matchesVersion = !artifactVersion || item.version === artifactVersion;
            const matchesBranch = !artifactBranch || item.branch === artifactBranch;
            const matchesTime = inTimeRange(item, timeQuickFilter, customRange);
            return matchesVersion && matchesBranch && matchesTime;
        })
    ), [allArtifacts, artifactVersion, artifactBranch, timeQuickFilter, customRange]);

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
            setAllArtifacts(await getReleaseArtifacts());
        } catch (error) {
            console.error('Failed to load artifacts:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadArtifacts();
        api.get('/auth/me')
            .then((res) => setIsAdmin(res.data?.is_superuser || res.data?.username === 'admin'))
            .catch(() => setIsAdmin(false));
    }, []);

    const handleDeleteArtifact = async (artifactId: string) => {
        await deleteReleaseArtifact(artifactId);
        if (viewingArtifact?.id === artifactId) {
            setViewingArtifact(null);
        }
        await loadArtifacts();
    };

    const resetFilters = () => {
        setArtifactVersion(undefined);
        setArtifactBranch(undefined);
        setTimeQuickFilter('all');
        setCustomRange(null);
    };

    const hasDownload = (record: ReleaseArtifact) => {
        if (record.download_url) return true;
        if (record.extra_data) {
            try {
                const extra = typeof record.extra_data === 'string'
                    ? JSON.parse(record.extra_data)
                    : record.extra_data;
                if (extra && extra.nas_url) return true;
            } catch (e) {}
        }
        return false;
    };

    const handleDownload = async (record: ReleaseArtifact) => {
        let nasUrl = '';
        if (record.extra_data) {
            try {
                const extra = typeof record.extra_data === 'string'
                    ? JSON.parse(record.extra_data)
                    : record.extra_data;
                if (extra && extra.nas_url) {
                    nasUrl = extra.nas_url;
                }
            } catch (e) {}
        }

        if (nasUrl) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1000);
            try {
                // 探测局域网网盘的 Web Station 8081 端口连通性 (使用 no-cors 跨越跨域限制)
                await fetch('http://192.168.110.26:8081/test_new_webdav.md', {
                    mode: 'no-cors',
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                console.log('LAN detected, downloading directly from NAS:', nasUrl);
                window.open(nasUrl, '_blank');
                return;
            } catch (err) {
                clearTimeout(timeoutId);
                console.log('LAN probe failed or timeout, checking public fallback');
                if (!record.download_url) {
                    Modal.warning({
                        title: '无法下载制品',
                        content: '当前未连通公司局域网，且该固件大包未开启公网备份（UPLOAD_TO_GITLAB=0）。请连入局域网内下载！'
                    });
                    return;
                }
            }
        }

        if (record.download_url) {
            window.open(`/api/artifacts/${record.id}/download`, '_blank');
        }
    };

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
            sorter: (a, b) => new Date(artifactTime(a)).getTime() - new Date(artifactTime(b)).getTime(),
            defaultSortOrder: 'descend',
            render: (date: string, record) => formatDateTime(date || record.created_at)
        },
        {
            title: '操作',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    {hasDownload(record) && (
                        <Button type="link" size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(record)}>
                            下载
                        </Button>
                    )}
                    {record.pipeline_url && (
                        <Button type="link" size="small" icon={<LinkOutlined />} onClick={() => window.open(record.pipeline_url, '_blank')}>
                            流水线
                        </Button>
                    )}
                    {isAdmin && (
                        <Popconfirm
                            title="确认删除该制品记录？"
                            description="只删除 AutoTestHub 中的制品元数据，不会删除 GitLab 里的 artifact 文件。"
                            okText="删除"
                            cancelText="取消"
                            okButtonProps={{ danger: true }}
                            onConfirm={() => handleDeleteArtifact(record.id)}
                        >
                            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                                删除
                            </Button>
                        </Popconfirm>
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
                    <Select
                        allowClear
                        showSearch
                        placeholder="按版本快速筛选"
                        value={artifactVersion}
                        onChange={setArtifactVersion}
                        options={versionOptions}
                        optionFilterProp="label"
                        style={{ width: 260 }}
                    />
                    <Select
                        allowClear
                        showSearch
                        placeholder="按分支筛选"
                        value={artifactBranch}
                        onChange={setArtifactBranch}
                        options={branchOptions}
                        optionFilterProp="label"
                        style={{ width: 240 }}
                    />
                    <Segmented
                        value={timeQuickFilter}
                        onChange={(value) => setTimeQuickFilter(value as TimeQuickFilter)}
                        options={[
                            { label: '全部时间', value: 'all' },
                            { label: '今天', value: 'today' },
                            { label: '近 7 天', value: '7d' },
                            { label: '近 30 天', value: '30d' },
                            { label: '自定义', value: 'custom' }
                        ]}
                    />
                    <RangePicker
                        allowClear
                        disabled={timeQuickFilter !== 'custom'}
                        value={customRange}
                        onChange={(range) => {
                            setCustomRange(range);
                            if (range) setTimeQuickFilter('custom');
                        }}
                    />
                    <Button icon={<ReloadOutlined />} onClick={loadArtifacts}>刷新</Button>
                    <Button onClick={resetFilters}>重置</Button>
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
                        {viewingArtifact && hasDownload(viewingArtifact) && (
                            <Button type="primary" icon={<DownloadOutlined />} onClick={() => handleDownload(viewingArtifact)}>
                                下载制品
                            </Button>
                        )}
                        {isAdmin && viewingArtifact && (
                            <Popconfirm
                                title="确认删除该制品记录？"
                                description="只删除 AutoTestHub 中的制品元数据，不会删除 GitLab 里的 artifact 文件。"
                                okText="删除"
                                cancelText="取消"
                                okButtonProps={{ danger: true }}
                                onConfirm={() => handleDeleteArtifact(viewingArtifact.id)}
                            >
                                <Button danger icon={<DeleteOutlined />}>删除</Button>
                            </Popconfirm>
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
