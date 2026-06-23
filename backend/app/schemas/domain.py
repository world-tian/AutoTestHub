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
    external_id: Optional[str] = None
    external_source: Optional[str] = None

class RequirementResponse(RequirementBase):
    id: str
    project_id: str
    status: str
    external_id: Optional[str] = None
    external_source: Optional[str] = None
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
    feature: Optional[str] = None

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
    version: int = 1
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class ExecutionRunBase(BaseModel):
    name: str

class ExecutionRunCreate(ExecutionRunBase):
    test_plan_id: Optional[str] = None
    agent_id: Optional[str] = None
    device_id: Optional[str] = None

class ExecutionRunResponse(ExecutionRunBase):
    id: str
    project_id: str
    status: str
    test_plan_id: Optional[str] = None
    agent_id: Optional[str] = None
    device_id: Optional[str] = None
    summary: Optional[Dict[str, Any]] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    created_at: datetime
    class Config:
        from_attributes = True

class ExecutionResultBase(BaseModel):
    test_case_id: str
    status: str
    error_message: Optional[str] = None
    log_url: Optional[str] = None

class ExecutionResultCreate(ExecutionResultBase):
    artifacts: Optional[Dict[str, Any]] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_ms: Optional[int] = None

class ExecutionResultResponse(ExecutionResultBase):
    id: str
    run_id: str
    artifacts: Optional[Dict[str, Any]] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_ms: Optional[int] = None
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
    version: Optional[str] = None
    iteration: Optional[str] = None

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
    version: Optional[str] = None
    iteration: Optional[str] = None

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
    test_plan_id: Optional[str] = None

# ============== 新增：用例评审相关 Schema ==============
class TestCaseReviewBase(BaseModel):
    test_case_id: str
    status: str = "pending"
    comments: Optional[str] = None

class TestCaseReviewCreate(TestCaseReviewBase):
    pass

class TestCaseReviewUpdate(BaseModel):
    status: Optional[str] = None
    comments: Optional[str] = None

class TestCaseReviewResponse(TestCaseReviewBase):
    id: str
    project_id: str
    reviewer_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# ============== 新增：缺陷管理相关 Schema ==============
class DefectBase(BaseModel):
    title: str
    description: Optional[str] = None
    severity: str = "medium"
    status: str = "open"
    priority: str = "P2"

class DefectCreate(DefectBase):
    test_case_id: Optional[str] = None
    execution_result_id: Optional[str] = None
    assigned_to: Optional[str] = None
    external_id: Optional[str] = None
    external_source: Optional[str] = None
    external_url: Optional[str] = None

class DefectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[str] = None
    external_id: Optional[str] = None
    external_url: Optional[str] = None

class DefectResponse(DefectBase):
    id: str
    project_id: str
    test_case_id: Optional[str] = None
    execution_result_id: Optional[str] = None
    created_by: Optional[str] = None
    assigned_to: Optional[str] = None
    external_id: Optional[str] = None
    external_source: Optional[str] = None
    external_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# ============== 新增：工具箱相关 Schema ==============
class ToolDefinitionBase(BaseModel):
    name: str
    description: Optional[str] = None
    tool_type: str
    category: Optional[str] = None
    config_schema: Optional[Dict[str, Any]] = None
    code: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    is_public: bool = True
    tags: Optional[List[str]] = None
    capabilities: Optional[List[str]] = None

class ToolDefinitionCreate(ToolDefinitionBase):
    pass

class ToolDefinitionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    config_schema: Optional[Dict[str, Any]] = None
    code: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    is_public: Optional[bool] = None
    tags: Optional[List[str]] = None
    capabilities: Optional[List[str]] = None

class ToolDefinitionResponse(ToolDefinitionBase):
    id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ToolInstanceBase(BaseModel):
    tool_definition_id: str
    name: str
    project_id: Optional[str] = None
    agent_id: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    status: str = "active"

class ToolInstanceCreate(ToolInstanceBase):
    pass

class ToolInstanceUpdate(BaseModel):
    name: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    status: Optional[str] = None

class ToolInstanceResponse(ToolInstanceBase):
    id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# ============== 新增：集成配置相关 Schema ==============
class IntegrationConfigBase(BaseModel):
    integration_type: str
    name: str
    config: Optional[Dict[str, Any]] = None
    status: str = "active"
    field_mappings: Optional[Dict[str, Any]] = None

class IntegrationConfigCreate(IntegrationConfigBase):
    project_id: Optional[str] = None

class IntegrationConfigUpdate(BaseModel):
    name: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    status: Optional[str] = None
    field_mappings: Optional[Dict[str, Any]] = None

class IntegrationConfigResponse(IntegrationConfigBase):
    id: str
    project_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# ============== 新增：报告相关 Schema ==============
class ReportTemplateBase(BaseModel):
    name: str
    template_type: str = "execution"
    config: Optional[Dict[str, Any]] = None
    is_public: bool = True

class ReportTemplateCreate(ReportTemplateBase):
    pass

class ReportTemplateUpdate(BaseModel):
    name: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    is_public: Optional[bool] = None

class ReportTemplateResponse(ReportTemplateBase):
    id: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class ReportRecordBase(BaseModel):
    name: str
    report_type: str = "execution"
    template_id: Optional[str] = None
    execution_run_id: Optional[str] = None
    content: Optional[str] = None
    feature: Optional[str] = None

    content_json: Optional[Dict[str, Any]] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class ReportRecordCreate(ReportRecordBase):
    pass

class ReportRecordResponse(ReportRecordBase):
    id: str
    project_id: Optional[str] = None
    file_url: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

# ============== 新增：版本/迭代相关 Schema ==============
class VersionIterationBase(BaseModel):
    name: str
    iteration_type: str = "version"
    description: Optional[str] = None
    status: str = "planned"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class VersionIterationCreate(VersionIterationBase):
    pass

class VersionIterationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class VersionIterationResponse(VersionIterationBase):
    id: str
    project_id: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# ============== 新增：集成相关请求 ==============
class JiraSyncRequest(BaseModel):
    integration_config_id: str
    jql: Optional[str] = None
    project_key: Optional[str] = None
    sync_type: str = "requirements"  # requirements, defects

class FeishuSyncRequest(BaseModel):
    integration_config_id: str
    app_token: Optional[str] = None
    table_id: Optional[str] = None
    sync_type: str = "requirements"

# ============== 新增：工具执行请求 ==============
class ToolExecuteRequest(BaseModel):
    tool_instance_id: str
    parameters: Dict[str, Any]

