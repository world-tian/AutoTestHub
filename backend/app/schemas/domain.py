from pydantic import BaseModel
from typing import List, Optional, Any, Dict
from datetime import datetime

class Token(BaseModel):
    access_token: str
    token_type: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserBase(BaseModel):
    username: str
    email: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: str
    is_active: bool
    is_superuser: bool
    class Config:
        from_attributes = True

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    working_dir: Optional[str] = None
    test_command: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectResponse(ProjectBase):
    id: str
    created_at: datetime
    class Config:
        from_attributes = True

class RequirementBase(BaseModel):
    title: str
    description: str

class RequirementCreate(RequirementBase):
    pass

class RequirementResponse(RequirementBase):
    id: str
    project_id: str
    status: str
    created_at: datetime
    class Config:
        from_attributes = True

class TestCaseBase(BaseModel):
    title: str
    case_category: str
    priority: str
    steps: List[str]
    expected_result: str
    feature: Optional[str] = None

class GenerateCasesRequest(BaseModel):
    requirement_id: Optional[str] = None
    content: Optional[str] = None
    project_id: str

class TestCaseCreate(TestCaseBase):
    requirement_id: Optional[str] = None
    status: str = "candidate"

class TestCaseUpdate(BaseModel):
    title: Optional[str] = None
    case_category: Optional[str] = None
    priority: Optional[str] = None
    steps: Optional[List[str]] = None
    expected_result: Optional[str] = None
    feature: Optional[str] = None
    requirement_id: Optional[str] = None
    status: Optional[str] = None

class TestCaseResponse(TestCaseBase):
    id: str
    project_id: str
    requirement_id: Optional[str] = None
    local_case_id: Optional[str] = None
    status: str
    created_at: datetime
    class Config:
        from_attributes = True

class ExecutionRunBase(BaseModel):
    name: str

class ExecutionRunCreate(ExecutionRunBase):
    pass

class ExecutionRunResponse(ExecutionRunBase):
    id: str
    project_id: str
    status: str
    created_at: datetime
    class Config:
        from_attributes = True

class ExecutionResultBase(BaseModel):
    test_case_id: str
    status: str
    error_message: Optional[str] = None
    log_url: Optional[str] = None

class ExecutionResultCreate(ExecutionResultBase):
    pass

class ExecutionResultResponse(ExecutionResultBase):
    id: str
    run_id: str
    executed_at: datetime
    class Config:
        from_attributes = True

class SyncTestCaseItem(BaseModel):
    local_case_id: str
    req_id: Optional[str] = None
    title: str
    priority: str
    steps: List[str]
    expected_result: str
    case_category: str = "automated"

class SyncTestCasesRequest(BaseModel):
    project_id: str
    test_cases: List[SyncTestCaseItem]

class SyncTestCasesResponse(BaseModel):
    message: str
    created: int
    updated: int
    skipped: int


# 配置相关schema
class ConfigItem(BaseModel):
    key: str
    value: str
    description: Optional[str] = None


class ConfigResponse(BaseModel):
    id: str
    key: str
    value: Optional[str] = None
    description: Optional[str] = None
    updated_at: datetime
    
    class Config:
        from_attributes = True


class AIProviderInfo(BaseModel):
    type: str
    name: str
    models: List[str]
    default_model: str
    default_base_url: Optional[str] = None


class ChatMessage(BaseModel):
    role: str  # user, assistant, system
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]


class ChatResponse(BaseModel):
    content: str


class ReportAnalyzeRequest(BaseModel):
    report_data: Dict[str, Any]


# 定时任务相关schema
class ScheduledTaskBase(BaseModel):
    name: str
    description: Optional[str] = None
    cron_expression: str
    task_type: str = "test_execution"
    enabled: bool = True
    config: Optional[Dict[str, Any]] = None  # 可以配置agent_id、device_id等


class ScheduledTaskCreate(ScheduledTaskBase):
    pass


class ScheduledTaskUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    cron_expression: Optional[str] = None
    task_type: Optional[str] = None
    enabled: Optional[bool] = None
    config: Optional[Dict[str, Any]] = None


class ScheduledTaskResponse(ScheduledTaskBase):
    id: str
    project_id: str
    last_run_at: Optional[datetime] = None
    next_run_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# 测试计划相关schema
class TestPlanBase(BaseModel):
    name: str
    description: Optional[str] = None
    env: Optional[str] = None
    working_dir: Optional[str] = None
    test_command: Optional[str] = None
    case_filters: Optional[Dict[str, Any]] = None
    case_ids: Optional[List[str]] = None
    status: str = "active"

class TestPlanCreate(TestPlanBase):
    pass

class TestPlanUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    env: Optional[str] = None
    working_dir: Optional[str] = None
    test_command: Optional[str] = None
    case_filters: Optional[Dict[str, Any]] = None
    case_ids: Optional[List[str]] = None
    status: Optional[str] = None

class TestPlanResponse(TestPlanBase):
    id: str
    project_id: str
    created_at: datetime
    updated_at: datetime
    latest_run_id: Optional[str] = None
    latest_run_status: Optional[str] = None

    class Config:
        from_attributes = True

# Jira 导入请求
class JiraImportRequest(BaseModel):
    jql: str
    project_key: Optional[str] = None

# 手动触发执行的请求
class TriggerExecutionRequest(BaseModel):
    name: str
    agent_id: Optional[str] = None
    device_id: Optional[str] = None
    priority: int = 0
    test_case_ids: Optional[List[str]] = None
    working_dir: Optional[str] = None
    test_command: Optional[str] = None

