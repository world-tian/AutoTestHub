from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from uuid import uuid4
import uuid
from app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=generate_uuid)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Project(Base):
    __tablename__ = "projects"
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, index=True)
    description = Column(Text, nullable=True)
    working_dir = Column(String, nullable=True) # 默认工作目录
    test_command = Column(String, nullable=True) # 默认执行命令
    created_at = Column(DateTime, default=datetime.utcnow)
    
    requirements = relationship("Requirement", back_populates="project")
    test_cases = relationship("TestCase", back_populates="project")
    execution_runs = relationship("ExecutionRun", back_populates="project")
    defects = relationship("Defect", back_populates="project")
    reviews = relationship("TestCaseReview", back_populates="project")

class Requirement(Base):
    __tablename__ = "requirements"
    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id"))
    title = Column(String)
    description = Column(Text)
    status = Column(String, default="draft")
    # 外部系统关联
    external_id = Column(String, nullable=True)  # Jira ID, 飞书 ID 等
    external_source = Column(String, nullable=True)  # jira, feishu, manual
    external_data = Column(JSON, nullable=True)  # 原始数据
    created_at = Column(DateTime, default=datetime.utcnow)
    
    project = relationship("Project", back_populates="requirements")
    test_cases = relationship("TestCase", back_populates="requirement")

class TestCase(Base):
    __tablename__ = "test_cases"
    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id"))
    requirement_id = Column(String, ForeignKey("requirements.id"), nullable=True)
    local_case_id = Column(String, nullable=True, index=True)
    title = Column(String)
    feature = Column(String, nullable=True)
    case_category = Column(String) # manual, automated
    priority = Column(String, default="P1")
    steps = Column(JSON) # list of steps
    expected_result = Column(Text)
    status = Column(String, default="candidate") # candidate, adopted, enabled, deprecated
    # 版本管理
    version = Column(Integer, default=1)
    previous_version_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    project = relationship("Project", back_populates="test_cases")
    requirement = relationship("Requirement", back_populates="test_cases")
    reviews = relationship("TestCaseReview", back_populates="test_case")

class ExecutionRun(Base):
    __tablename__ = "execution_runs"
    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id"))
    name = Column(String)
    status = Column(String, default="pending") # pending, running, completed, failed, cancelled
    # 执行配置
    test_plan_id = Column(String, ForeignKey("test_plans.id"), nullable=True)
    agent_id = Column(String, nullable=True)
    device_id = Column(String, nullable=True)
    # 结果
    logs_zip_url = Column(String, nullable=True) # 全局日志压缩包链接
    report_url = Column(String, nullable=True)   # 详细测试报告链接
    summary = Column(JSON, nullable=True)        # 执行摘要统计
    # 时间
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    project = relationship("Project", back_populates="execution_runs")
    results = relationship("ExecutionResult", back_populates="run")
    test_plan = relationship("TestPlan")

class ExecutionResult(Base):
    __tablename__ = "execution_case_results"
    id = Column(String, primary_key=True, default=generate_uuid)
    run_id = Column(String, ForeignKey("execution_runs.id"))
    test_case_id = Column(String, ForeignKey("test_cases.id"))
    status = Column(String, default="pending")  # passed, failed, skipped, blocked, error
    error_message = Column(Text, nullable=True)
    log_url = Column(String, nullable=True)
    html_report = Column(Text, nullable=True)    # 原生 HTML 测试报告内容
    artifacts = Column(JSON, nullable=True)      # 用例级别的附件（截图、内核日志等）
    start_time = Column(DateTime, nullable=True) # 用例开始执行时间，用于对齐全局日志
    end_time = Column(DateTime, nullable=True)   # 用例结束执行时间
    duration_ms = Column(Integer, nullable=True) # 执行耗时
    executed_at = Column(DateTime, default=datetime.utcnow)
    
    run = relationship("ExecutionRun", back_populates="results")
    test_case = relationship("TestCase")

class Config(Base):
    """系统配置表"""
    __tablename__ = "config"
    id = Column(String, primary_key=True, default=generate_uuid)
    key = Column(String, unique=True, index=True, nullable=False)
    value = Column(Text, nullable=True)
    description = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow)

class ScheduledTask(Base):
    """定时任务表"""
    __tablename__ = "scheduled_tasks"
    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id"))
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    cron_expression = Column(String, nullable=False)  # Cron表达式
    task_type = Column(String, default="test_execution")  # 任务类型
    enabled = Column(Boolean, default=True)  # 是否启用
    last_run_at = Column(DateTime, nullable=True)  # 上次运行时间
    next_run_at = Column(DateTime, nullable=True)  # 下次运行时间
    config = Column(JSON, nullable=True)  # 任务配置：如指定的agent_id、device_id等
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project")

class TestPlan(Base):
    __tablename__ = "test_plans"
    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id"))
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    env = Column(String, nullable=True) # QA, STAGING, PROD
    working_dir = Column(String, nullable=True) # 执行工作目录
    test_command = Column(String, nullable=True) # 自动化执行命令
    case_filters = Column(JSON, nullable=True) # 过滤条件: {"categories": ["automated"], "features": ["login"]}
    case_ids = Column(JSON, nullable=True) # 选定的用例列表
    status = Column(String, default="active")
    # 版本/迭代关联
    version = Column(String, nullable=True)
    iteration = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project")

# ============== 新增：用例评审模块 ==============
class TestCaseReview(Base):
    """用例评审记录"""
    __tablename__ = "test_case_reviews"
    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id"))
    test_case_id = Column(String, ForeignKey("test_cases.id"))
    reviewer_id = Column(String, ForeignKey("users.id"), nullable=True)
    # 评审信息
    status = Column(String, default="pending")  # pending, approved, rejected, need_modification
    comments = Column(Text, nullable=True)
    # 数据
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    project = relationship("Project", back_populates="reviews")
    test_case = relationship("TestCase", back_populates="reviews")
    reviewer = relationship("User")

# ============== 新增：缺陷管理模块 ==============
class Defect(Base):
    """缺陷记录"""
    __tablename__ = "defects"
    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id"))
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    # 关联
    test_case_id = Column(String, ForeignKey("test_cases.id"), nullable=True)
    execution_result_id = Column(String, ForeignKey("execution_case_results.id"), nullable=True)
    # 状态
    severity = Column(String, default="medium")  # critical, high, medium, low
    status = Column(String, default="open")  # open, in_progress, resolved, closed
    priority = Column(String, default="P2")
    # 外部系统
    external_id = Column(String, nullable=True)
    external_source = Column(String, nullable=True)  # jira, feishu, manual
    external_url = Column(String, nullable=True)
    # 时间
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    assigned_to = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    project = relationship("Project", back_populates="defects")
    test_case = relationship("TestCase")
    execution_result = relationship("ExecutionResult")
    creator = relationship("User", foreign_keys=[created_by])
    assignee = relationship("User", foreign_keys=[assigned_to])

# ============== 新增：工具箱/Skill模块 ==============
class ToolDefinition(Base):
    """工具定义"""
    __tablename__ = "tool_definitions"
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    tool_type = Column(String, nullable=False)  # python_plugin, http, shell, agent_tool
    category = Column(String, nullable=True)  # adb, serial, power, relay, etc.
    # 工具配置
    config_schema = Column(JSON, nullable=True)  # JSON Schema 用于参数校验
    # 代码/配置
    code = Column(Text, nullable=True)
    config = Column(JSON, nullable=True)
    # 权限
    is_public = Column(Boolean, default=True)
    # 标签
    tags = Column(JSON, default=list)
    capabilities = Column(JSON, default=list)
    # 时间
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ToolInstance(Base):
    """工具实例（特定环境的配置）"""
    __tablename__ = "tool_instances"
    id = Column(String, primary_key=True, default=generate_uuid)
    tool_definition_id = Column(String, ForeignKey("tool_definitions.id"))
    name = Column(String, nullable=False)
    project_id = Column(String, ForeignKey("projects.id"), nullable=True)
    agent_id = Column(String, nullable=True)  # 关联到特定Agent
    config = Column(JSON, nullable=True)
    status = Column(String, default="active")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    tool_definition = relationship("ToolDefinition")
    project = relationship("Project")

# ============== 新增：集成配置模块 ==============
class IntegrationConfig(Base):
    """外部系统集成配置"""
    __tablename__ = "integration_configs"
    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id"), nullable=True)
    integration_type = Column(String, nullable=False)  # jira, feishu, wecom, email
    name = Column(String, nullable=False)
    config = Column(JSON, nullable=True)  # 配置信息（加密存储敏感字段）
    status = Column(String, default="active")
    # 字段映射配置
    field_mappings = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    project = relationship("Project")

# ============== 新增：报告模块 ==============
class ReportTemplate(Base):
    """报告模板"""
    __tablename__ = "report_templates"
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    template_type = Column(String, default="execution")  # execution, daily, weekly, version, custom
    config = Column(JSON, nullable=True)  # 模板配置
    is_public = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ReportRecord(Base):
    """报告记录"""
    __tablename__ = "report_records"
    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id"), nullable=True)
    name = Column(String, nullable=False)
    report_type = Column(String, default="execution")
    template_id = Column(String, ForeignKey("report_templates.id"), nullable=True)
    # 关联
    execution_run_id = Column(String, ForeignKey("execution_runs.id"), nullable=True)
    # 内容
    content = Column(Text, nullable=True)
    content_json = Column(JSON, nullable=True)
    # 输出
    file_url = Column(String, nullable=True)
    # 时间
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    project = relationship("Project")
    template = relationship("ReportTemplate")
    execution_run = relationship("ExecutionRun")

# ============== 新增：版本/迭代管理 ==============
class VersionIteration(Base):
    """版本/迭代记录"""
    __tablename__ = "version_iterations"
    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id"))
    name = Column(String, nullable=False)  # 版本号或迭代名称
    iteration_type = Column(String, default="version")  # version, iteration, sprint
    description = Column(Text, nullable=True)
    status = Column(String, default="planned")  # planned, in_progress, completed
    # 时间
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    project = relationship("Project")

def get_db_session():
    """获取数据库会话的生成器"""
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
