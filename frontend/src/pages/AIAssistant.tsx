import React, { useState, useRef, useEffect } from 'react';
import { Card, Input, Button, List, Typography, Avatar, Spin, message } from 'antd';
import { RobotOutlined, UserOutlined, SendOutlined, BulbOutlined } from '@ant-design/icons';
import { chatWithAI, ChatMessage } from '../api';

const { Text } = Typography;
const { TextArea } = Input;

const QuickQuestions = [
    '如何生成测试用例？',
    '如何分析测试报告？',
    '推荐一些测试最佳实践',
    '测试用例的优先级怎么设置？'
];

export const AIAssistant: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: 'assistant',
            content: '您好！我是AutoTestHub的AI助手。我可以帮助您生成测试用例、分析测试报告，或回答测试相关的问题。请问有什么可以帮助您的？'
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMessage: ChatMessage = {
            role: 'user',
            content: input.trim()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const response = await chatWithAI([...messages, userMessage]);
            const assistantMessage: ChatMessage = {
                role: 'assistant',
                content: response.content
            };
            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Failed to chat:', error);
            message.error('AI助手响应失败，请稍后重试');
        } finally {
            setLoading(false);
        }
    };

    const handleQuickQuestion = (question: string) => {
        setInput(question);
    };

    return (
        <div style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
            <Card 
                title={<><BulbOutlined style={{ marginRight: 8 }} />AI测试助手</>}
                style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 24px' }}
            >
                {/* 快速问题 */}
                <div style={{ padding: '16px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>快速提问：</Text>
                    <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {QuickQuestions.map((q, i) => (
                            <Button
                                key={i}
                                size="small"
                                type="dashed"
                                onClick={() => handleQuickQuestion(q)}
                            >
                                {q}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* 消息列表 */}
                <div 
                    style={{ 
                        flex: 1, 
                        overflowY: 'auto', 
                        padding: '16px 0',
                    }}
                >
                    <List
                        dataSource={messages}
                        renderItem={(msg, idx) => (
                            <div
                                key={idx}
                                style={{
                                    display: 'flex',
                                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                    marginBottom: 16
                                }}
                            >
                                {msg.role === 'assistant' && (
                                    <Avatar icon={<RobotOutlined />} style={{ backgroundColor: '#1890ff', marginRight: 12 }} />
                                )}
                                <div
                                    style={{
                                        maxWidth: '70%',
                                        padding: '12px 16px',
                                        borderRadius: 8,
                                        backgroundColor: msg.role === 'user' ? '#1890ff' : '#f5f5f5',
                                        color: msg.role === 'user' ? '#fff' : '#000',
                                        whiteSpace: 'pre-wrap'
                                    }}
                                >
                                    {msg.content}
                                </div>
                                {msg.role === 'user' && (
                                    <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#52c41a', marginLeft: 12 }} />
                                )}
                            </div>
                        )}
                    />
                    {loading && (
                        <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 16 }}>
                            <Avatar icon={<RobotOutlined />} style={{ backgroundColor: '#1890ff', marginRight: 12 }} />
                            <div style={{ padding: '12px 16px' }}>
                                <Spin size="small" />
                                <Text style={{ marginLeft: 8 }}>正在思考...</Text>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* 输入区域 */}
                <div style={{ padding: '16px 0', borderTop: '1px solid #f0f0f0' }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <TextArea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onPressEnter={(e) => {
                                if (!e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder="请输入您的问题... (Shift+Enter换行)"
                            autoSize={{ minRows: 1, maxRows: 4 }}
                            style={{ flex: 1 }}
                        />
                        <Button
                            type="primary"
                            icon={<SendOutlined />}
                            onClick={handleSend}
                            loading={loading}
                            disabled={!input.trim()}
                        >
                            发送
                        </Button>
                    </div>
                    <Text type="secondary" style={{ fontSize: '12px', marginTop: 8 }}>
                        提示：您可以问我关于测试用例生成、测试报告分析、测试最佳实践等问题
                    </Text>
                </div>
            </Card>
        </div>
    );
};
