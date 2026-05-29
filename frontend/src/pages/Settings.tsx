import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Select, Button, message, Typography, Divider, Alert, Spin, Tabs } from 'antd';
import { SettingOutlined, RobotOutlined, SaveOutlined, MailOutlined, BellOutlined, ApiOutlined, ThunderboltOutlined, SafetyOutlined, FileTextOutlined, DeploymentUnitOutlined } from '@ant-design/icons';
import { getAllConfigs, updateConfig, getAIProviders, AIProviderInfo, ConfigResponse } from '../api';


const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// // 配置分组定义
// const CONFIG_GROUPS = [
//     {
//         key: 'ai',
//         title: '大模型配置',
//         icon: <RobotOutlined />,
//         keys: ['ai_provider', 'ai_api_key', 'ai_base_url', 'ai_model_name']
//     },
//     {
//         key: 'prompt',
//         title: 'Prompt 配置',
//         icon: <FileTextOutlined />,
//         keys: ['prompt_requirement_analysis', 'prompt_case_generation', 'prompt_report_interpretation', 'prompt_failure_analysis']
//     },
//     {
//         key: 'email',
//         title: '邮件配置',
//         icon: <MailOutlined />,
//         keys: ['email_smtp_host', 'email_smtp_port', 'email_sender', 'email_password']
//     },
//     {
//         key: 'notification',
//         title: '通知配置',
//         icon: <BellOutlined />,
//         keys: ['feishu_webhook', 'feishu_secret', 'wechat_webhook']
//     },
//     {
//         key: 'requirement',
//         title: '需求源配置',
//         icon: <ApiOutlined />,
//         keys: ['jira_url', 'jira_username', 'jira_api_token', 'feishu_project_app_id', 'feishu_project_app_secret']
//     },
//     {
//         key: 'execution',
//         title: '执行配置',
//         icon: <ThunderboltOutlined />,
//         keys: ['execution_timeout_seconds', 'execution_retry_count', 'execution_concurrency', 'loop_enabled', 'loop_count', 'loop_interval_seconds']
//     },
//     {
//         key: 'security',
//         title: '安全配置',
//         icon: <SafetyOutlined />,
//         keys: ['security_command_whitelist', 'security_dangerous_action_confirm']
//     },
//     {
//         key: 'assistant',
//         title: 'AI 助手配置',
//         icon: <RobotOutlined />,
//         keys: ['ai_assistant_enabled_intents', 'ai_assistant_need_confirmation']
//     },
//     {
//         key: 'log',
//         title: '日志配置',
//         icon: <DeploymentUnitOutlined />,
//         keys: ['log_level', 'log_retain_days']
//     }
// ];

export const Settings: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [configs, setConfigs] = useState<ConfigResponse[]>([]);
    const [providers, setProviders] = useState<AIProviderInfo[]>([]);
    const [form] = Form.useForm();

    const loadData = async () => {
        setLoading(true);
        try {
            const [configList, providerList] = await Promise.all([
                getAllConfigs(),
                getAIProviders()
            ]);
            setConfigs(configList);
            setProviders(providerList);

            // 填充表单
            const formData: any = {};
            configList.forEach(cfg => {
                formData[cfg.key] = cfg.value;
            });
            form.setFieldsValue(formData);
        } catch (error) {
            console.error('Failed to load data:', error);
            message.error('加载配置失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleSave = async (values: any) => {
        setSaving(true);
        try {
            for (const key of Object.keys(values)) {
                const configItem = configs.find(c => c.key === key);
                await updateConfig(key, {
                    key,
                    value: values[key] ?? '',
                    description: configItem?.description
                });
            }
            message.success('配置保存成功');
            loadData();
        } catch (error) {
            console.error('Failed to save config:', error);
            message.error('保存配置失败');
        } finally {
            setSaving(false);
        }
    };

    // 获取当前 AI 服务提供商信息
    // const getCurrentProviderInfo = () => {
    //     const providerKey = configs.find(c => c.key === 'ai_provider');
    //     return providers.find(p => p.type === providerKey?.value);
    // };

    const aiProviderValue = Form.useWatch('ai_provider', form);

    // 获取配置项描述
    const getConfigDescription = (key: string) => {
        const cfg = configs.find(c => c.key === key);
        return cfg?.description;
    };

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <Title level={2}>
                <SettingOutlined style={{ marginRight: 8 }} />
                配置中心
            </Title>
            <Text type="secondary">统一管理平台所有配置项，包括大模型、通知、执行、安全等</Text>

            <Divider />

            <Spin spinning={loading}>
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSave}
                >
                    <Tabs defaultActiveKey="ai">
                        {/* AI 模型配置 */}
                        <Tabs.TabPane tab={<><RobotOutlined /> 大模型配置</>} key="ai">
                            <Card>
                                <Alert
                                    message="大模型服务配置"
                                    description="选择合适的AI服务提供商，并填写相应的API密钥。Mock模式用于本地测试，不产生真实费用。"
                                    type="info"
                                    style={{ marginBottom: 16 }}
                                />

                                <Form.Item
                                    name="ai_provider"
                                    label="AI服务提供商"
                                    rules={[{ required: true, message: '请选择AI服务提供商' }]}
                                >
                                    <Select placeholder="选择AI服务提供商">
                                        {providers.map(provider => (
                                            <Option key={provider.type} value={provider.type}>
                                                {provider.name}
                                            </Option>
                                        ))}
                                    </Select>
                                </Form.Item>

                                {aiProviderValue && aiProviderValue !== 'mock' && (
                                    <>
                                        <Form.Item
                                            name="ai_api_key"
                                            label="API密钥"
                                            extra={getConfigDescription('ai_api_key')}
                                        >
                                            <Input.Password placeholder="请输入API密钥" />
                                        </Form.Item>

                                        <Form.Item
                                            name="ai_base_url"
                                            label="API基础URL (可选)"
                                            extra={getConfigDescription('ai_base_url')}
                                        >
                                            <Input placeholder="例如：https://api.example.com/v1" />
                                        </Form.Item>

                                        <Form.Item
                                            name="ai_model_name"
                                            label="模型名称 (可选)"
                                            extra={getConfigDescription('ai_model_name')}
                                        >
                                            <Input placeholder="输入模型名称，支持自定义" />
                                        </Form.Item>
                                    </>
                                )}

                                {aiProviderValue === 'mock' && (
                                    <Alert
                                        message="当前使用Mock模式"
                                        description="Mock模式下AI服务不会调用真实API，使用预设的响应数据。适用于开发和测试。"
                                        type="warning"
                                    />
                                )}
                            </Card>
                        </Tabs.TabPane>

                        {/* Prompt 配置 */}
                        <Tabs.TabPane tab={<><FileTextOutlined /> Prompt 配置</>} key="prompt">
                            <Card>
                                <Form.Item
                                    name="prompt_requirement_analysis"
                                    label="需求分析 Prompt"
                                    extra={getConfigDescription('prompt_requirement_analysis')}
                                >
                                    <TextArea rows={6} placeholder="输入需求分析的Prompt模板..." />
                                </Form.Item>

                                <Form.Item
                                    name="prompt_case_generation"
                                    label="测试用例生成 Prompt"
                                    extra={getConfigDescription('prompt_case_generation')}
                                >
                                    <TextArea rows={6} placeholder="输入测试用例生成的Prompt模板..." />
                                </Form.Item>

                                <Form.Item
                                    name="prompt_report_interpretation"
                                    label="报告解读 Prompt"
                                    extra={getConfigDescription('prompt_report_interpretation')}
                                >
                                    <TextArea rows={6} placeholder="输入测试报告解读的Prompt模板..." />
                                </Form.Item>

                                <Form.Item
                                    name="prompt_failure_analysis"
                                    label="失败归因分析 Prompt"
                                    extra={getConfigDescription('prompt_failure_analysis')}
                                >
                                    <TextArea rows={6} placeholder="输入失败归因分析的Prompt模板..." />
                                </Form.Item>
                            </Card>
                        </Tabs.TabPane>

                        {/* 邮件配置 */}
                        <Tabs.TabPane tab={<><MailOutlined /> 邮件配置</>} key="email">
                            <Card>
                                <Form.Item
                                    name="email_smtp_host"
                                    label="SMTP 服务器地址"
                                    extra={getConfigDescription('email_smtp_host')}
                                >
                                    <Input placeholder="例如：smtp.example.com" />
                                </Form.Item>

                                <Form.Item
                                    name="email_smtp_port"
                                    label="SMTP 端口"
                                    extra={getConfigDescription('email_smtp_port')}
                                >
                                    <Input type="number" placeholder="例如：587" />
                                </Form.Item>

                                <Form.Item
                                    name="email_sender"
                                    label="发件人邮箱"
                                    extra={getConfigDescription('email_sender')}
                                >
                                    <Input placeholder="例如：autotest@example.com" />
                                </Form.Item>

                                <Form.Item
                                    name="email_password"
                                    label="邮箱密码/授权码"
                                    extra={getConfigDescription('email_password')}
                                >
                                    <Input.Password placeholder="输入密码或授权码" />
                                </Form.Item>
                            </Card>
                        </Tabs.TabPane>

                        {/* 通知配置 */}
                        <Tabs.TabPane tab={<><BellOutlined /> 通知配置</>} key="notification">
                            <Card>
                                <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                                    配置飞书、企业微信等通知渠道
                                </Text>

                                <Divider orientation="left">飞书通知</Divider>

                                <Form.Item
                                    name="feishu_webhook"
                                    label="飞书机器人 Webhook"
                                    extra={getConfigDescription('feishu_webhook')}
                                >
                                    <Input placeholder="例如：https://open.feishu.cn/open-apis/bot/v2/hook/xxx" />
                                </Form.Item>

                                <Form.Item
                                    name="feishu_secret"
                                    label="飞书签名密钥（可选）"
                                    extra={getConfigDescription('feishu_secret')}
                                >
                                    <Input.Password placeholder="输入签名密钥" />
                                </Form.Item>

                                <Divider orientation="left">企业微信通知</Divider>

                                <Form.Item
                                    name="wechat_webhook"
                                    label="企业微信群机器人 Webhook"
                                    extra={getConfigDescription('wechat_webhook')}
                                >
                                    <Input placeholder="例如：https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx" />
                                </Form.Item>
                            </Card>
                        </Tabs.TabPane>

                        {/* 需求源配置 */}
                        <Tabs.TabPane tab={<><ApiOutlined /> 需求源配置</>} key="requirement">
                            <Card>
                                <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                                    配置 Jira、飞书项目等需求同步源
                                </Text>

                                <Divider orientation="left">Jira 配置</Divider>

                                <Form.Item
                                    name="jira_url"
                                    label="Jira 服务器地址"
                                    extra={getConfigDescription('jira_url')}
                                >
                                    <Input placeholder="例如：https://your-jira.atlassian.net" />
                                </Form.Item>

                                <Form.Item
                                    name="jira_username"
                                    label="Jira 用户名"
                                    extra={getConfigDescription('jira_username')}
                                >
                                    <Input placeholder="输入 Jira 用户名" />
                                </Form.Item>

                                <Form.Item
                                    name="jira_api_token"
                                    label="Jira API Token"
                                    extra={getConfigDescription('jira_api_token')}
                                >
                                    <Input.Password placeholder="输入 Jira API Token" />
                                </Form.Item>

                                <Divider orientation="left">飞书项目配置</Divider>

                                <Form.Item
                                    name="feishu_project_app_id"
                                    label="飞书项目 App ID"
                                    extra={getConfigDescription('feishu_project_app_id')}
                                >
                                    <Input placeholder="输入飞书项目 App ID" />
                                </Form.Item>

                                <Form.Item
                                    name="feishu_project_app_secret"
                                    label="飞书项目 App Secret"
                                    extra={getConfigDescription('feishu_project_app_secret')}
                                >
                                    <Input.Password placeholder="输入飞书项目 App Secret" />
                                </Form.Item>
                            </Card>
                        </Tabs.TabPane>

                        {/* 执行配置 */}
                        <Tabs.TabPane tab={<><ThunderboltOutlined /> 执行配置</>} key="execution">
                            <Card>
                                <Form.Item
                                    name="execution_timeout_seconds"
                                    label="执行超时时间（秒）"
                                    extra={getConfigDescription('execution_timeout_seconds')}
                                >
                                    <Input type="number" placeholder="例如：1800" />
                                </Form.Item>

                                <Form.Item
                                    name="execution_retry_count"
                                    label="失败重试次数"
                                    extra={getConfigDescription('execution_retry_count')}
                                >
                                    <Input type="number" placeholder="例如：0" min={0} />
                                </Form.Item>

                                <Form.Item
                                    name="execution_concurrency"
                                    label="并发执行数"
                                    extra={getConfigDescription('execution_concurrency')}
                                >
                                    <Input type="number" placeholder="例如：1" min={1} />
                                </Form.Item>

                                <Divider />

                                <Text strong>循环执行配置</Text>

                                <Form.Item
                                    name="loop_enabled"
                                    label="启用循环执行"
                                    extra={getConfigDescription('loop_enabled')}
                                >
                                    <Select>
                                        <Option value="true">是</Option>
                                        <Option value="false">否</Option>
                                    </Select>
                                </Form.Item>

                                <Form.Item
                                    name="loop_count"
                                    label="循环执行次数"
                                    extra={getConfigDescription('loop_count')}
                                >
                                    <Input type="number" placeholder="例如：1" min={1} />
                                </Form.Item>

                                <Form.Item
                                    name="loop_interval_seconds"
                                    label="循环间隔时间（秒）"
                                    extra={getConfigDescription('loop_interval_seconds')}
                                >
                                    <Input type="number" placeholder="例如：0" min={0} />
                                </Form.Item>
                            </Card>
                        </Tabs.TabPane>

                        {/* 安全配置 */}
                        <Tabs.TabPane tab={<><SafetyOutlined /> 安全配置</>} key="security">
                            <Card>
                                <Form.Item
                                    name="security_command_whitelist"
                                    label="命令白名单"
                                    extra={getConfigDescription('security_command_whitelist')}
                                >
                                    <TextArea rows={4} placeholder="输入允许的命令，多个用逗号分隔" />
                                </Form.Item>

                                <Form.Item
                                    name="security_dangerous_action_confirm"
                                    label="危险操作二次确认"
                                    extra={getConfigDescription('security_dangerous_action_confirm')}
                                >
                                    <Select>
                                        <Option value="true">是</Option>
                                        <Option value="false">否</Option>
                                    </Select>
                                </Form.Item>
                            </Card>
                        </Tabs.TabPane>

                        {/* AI 助手配置 */}
                        <Tabs.TabPane tab={<><RobotOutlined /> AI 助手配置</>} key="assistant">
                            <Card>
                                <Form.Item
                                    name="ai_assistant_enabled_intents"
                                    label="可用意图"
                                    extra={getConfigDescription('ai_assistant_enabled_intents')}
                                >
                                    <Input placeholder="例如：generate_cases,query_status,analyze_report" />
                                </Form.Item>

                                <Form.Item
                                    name="ai_assistant_need_confirmation"
                                    label="执行前需要确认"
                                    extra={getConfigDescription('ai_assistant_need_confirmation')}
                                >
                                    <Select>
                                        <Option value="true">是</Option>
                                        <Option value="false">否</Option>
                                    </Select>
                                </Form.Item>
                            </Card>
                        </Tabs.TabPane>

                        {/* 日志配置 */}
                        <Tabs.TabPane tab={<><DeploymentUnitOutlined /> 日志配置</>} key="log">
                            <Card>
                                <Form.Item
                                    name="log_level"
                                    label="日志级别"
                                    extra={getConfigDescription('log_level')}
                                >
                                    <Select>
                                        <Option value="debug">Debug</Option>
                                        <Option value="info">Info</Option>
                                        <Option value="warning">Warning</Option>
                                        <Option value="error">Error</Option>
                                    </Select>
                                </Form.Item>

                                <Form.Item
                                    name="log_retain_days"
                                    label="日志保留天数"
                                    extra={getConfigDescription('log_retain_days')}
                                >
                                    <Input type="number" placeholder="例如：30" min={1} />
                                </Form.Item>
                            </Card>
                        </Tabs.TabPane>
                    </Tabs>

                    <div style={{ marginTop: 24, textAlign: 'right' }}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            icon={<SaveOutlined />}
                            loading={saving}
                            size="large"
                        >
                            保存配置
                        </Button>
                    </div>
                </Form>
            </Spin>
        </div>
    );
};
