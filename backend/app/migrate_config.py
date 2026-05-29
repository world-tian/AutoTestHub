"""初始化配置表"""
from app.database import Base, engine, SessionLocal
from app.models.domain import Config
from sqlalchemy import inspect

def init_config():
    # 创建表
    inspector = inspect(engine)
    if 'config' not in inspector.get_table_names():
        print("Creating config table...")
        Config.__table__.create(bind=engine)
        print("Config table created.")
    
    # 初始化默认配置
    db = SessionLocal()
    try:
        default_configs = [
            # ==================== AI 模型配置 ====================
            {
                "key": "ai_provider",
                "value": "mock",
                "description": "AI服务提供商 (mock/openai/claude/qwen/ernie/deepseek/kimi)"
            },
            {
                "key": "ai_api_key",
                "value": "",
                "description": "AI服务API密钥"
            },
            {
                "key": "ai_base_url",
                "value": "",
                "description": "AI服务基础URL（可选）"
            },
            {
                "key": "ai_model_name",
                "value": "",
                "description": "AI模型名称（可选）"
            },
            # ==================== Prompt 配置 ====================
            {
                "key": "prompt_requirement_analysis",
                "value": "",
                "description": "需求分析Prompt模板"
            },
            {
                "key": "prompt_case_generation",
                "value": "",
                "description": "测试用例生成Prompt模板"
            },
            {
                "key": "prompt_report_interpretation",
                "value": "",
                "description": "测试报告解读Prompt模板"
            },
            {
                "key": "prompt_failure_analysis",
                "value": "",
                "description": "失败归因分析Prompt模板"
            },
            # ==================== 邮件配置 ====================
            {
                "key": "email_smtp_host",
                "value": "smtp.example.com",
                "description": "SMTP服务器地址"
            },
            {
                "key": "email_smtp_port",
                "value": "587",
                "description": "SMTP端口"
            },
            {
                "key": "email_sender",
                "value": "autotest@example.com",
                "description": "发件人邮箱"
            },
            {
                "key": "email_password",
                "value": "",
                "description": "邮箱密码或授权码"
            },
            # ==================== 通知配置 ====================
            {
                "key": "feishu_webhook",
                "value": "",
                "description": "飞书机器人Webhook地址"
            },
            {
                "key": "feishu_secret",
                "value": "",
                "description": "飞书机器人签名密钥（可选）"
            },
            {
                "key": "wechat_webhook",
                "value": "",
                "description": "企业微信群机器人Webhook地址"
            },
            # ==================== 需求源配置 ====================
            {
                "key": "jira_url",
                "value": "",
                "description": "Jira服务器地址"
            },
            {
                "key": "jira_username",
                "value": "",
                "description": "Jira用户名"
            },
            {
                "key": "jira_api_token",
                "value": "",
                "description": "Jira API Token"
            },
            {
                "key": "feishu_project_app_id",
                "value": "",
                "description": "飞书项目App ID"
            },
            {
                "key": "feishu_project_app_secret",
                "value": "",
                "description": "飞书项目App Secret"
            },
            # ==================== 执行配置 ====================
            {
                "key": "execution_timeout_seconds",
                "value": "1800",
                "description": "执行超时时间（秒）"
            },
            {
                "key": "execution_retry_count",
                "value": "0",
                "description": "失败重试次数"
            },
            {
                "key": "execution_concurrency",
                "value": "1",
                "description": "并发执行数"
            },
            {
                "key": "loop_enabled",
                "value": "false",
                "description": "是否启用循环执行"
            },
            {
                "key": "loop_count",
                "value": "1",
                "description": "循环执行次数"
            },
            {
                "key": "loop_interval_seconds",
                "value": "0",
                "description": "循环间隔时间（秒）"
            },
            # ==================== 安全配置 ====================
            {
                "key": "security_command_whitelist",
                "value": "",
                "description": "命令白名单（逗号分隔）"
            },
            {
                "key": "security_dangerous_action_confirm",
                "value": "true",
                "description": "危险操作是否需要二次确认"
            },
            # ==================== AI 助手配置 ====================
            {
                "key": "ai_assistant_enabled_intents",
                "value": "generate_cases,query_status,analyze_report",
                "description": "AI助手可用意图（逗号分隔）"
            },
            {
                "key": "ai_assistant_need_confirmation",
                "value": "true",
                "description": "AI助手执行是否需要用户确认"
            },
            # ==================== 日志配置 ====================
            {
                "key": "log_level",
                "value": "info",
                "description": "日志级别 (debug/info/warning/error)"
            },
            {
                "key": "log_retain_days",
                "value": "30",
                "description": "日志保留天数"
            }
        ]
        
        for cfg_data in default_configs:
            existing = db.query(Config).filter(Config.key == cfg_data["key"]).first()
            if not existing:
                cfg = Config(**cfg_data)
                db.add(cfg)
        
        db.commit()
        print("Default configs initialized.")
    finally:
        db.close()

if __name__ == "__main__":
    init_config()
