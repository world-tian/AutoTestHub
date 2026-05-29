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

class Requirement(Base):
    __tablename__ = "requirements"
    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id"))
    title = Column(String)
    description = Column(Text)
    status = Column(String, default="draft")
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
    status = Column(String, default="candidate") # candidate, adopted, enabled
    created_at = Column(DateTime, default=datetime.utcnow)
    
    project = relationship("Project", back_populates="test_cases")
    requirement = relationship("Requirement", back_populates="test_cases")

class ExecutionRun(Base):
    __tablename__ = "execution_runs"
    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id"))
    name = Column(String)
    status = Column(String, default="pending") # pending, running, completed
    logs_zip_url = Column(String, nullable=True) # 全局日志压缩包链接
    report_url = Column(String, nullable=True)   # 详细测试报告链接
    created_at = Column(DateTime, default=datetime.utcnow)
    
    project = relationship("Project", back_populates="execution_runs")
    results = relationship("ExecutionResult", back_populates="run")

class ExecutionResult(Base):
    __tablename__ = "execution_case_results"
    id = Column(String, primary_key=True, default=generate_uuid)
    run_id = Column(String, ForeignKey("execution_runs.id"))
    test_case_id = Column(String, ForeignKey("test_cases.id"))
    status = Column(String, default="pending")  # passed, failed, skipped
    error_message = Column(Text, nullable=True)
    log_url = Column(String, nullable=True)
    html_report = Column(Text, nullable=True)    # 原生 HTML 测试报告内容
    artifacts = Column(JSON, nullable=True)      # 用例级别的附件（截图、内核日志等）
    start_time = Column(DateTime, nullable=True) # 用例开始执行时间，用于对齐全局日志
    end_time = Column(DateTime, nullable=True)   # 用例结束执行时间
    executed_at = Column(DateTime, default=datetime.utcnow)
    
    run = relationship("ExecutionRun", back_populates="results")


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
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project")


def get_db_session():
    """获取数据库会话的生成器"""
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
