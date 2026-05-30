"""扩展功能 API: 评审、缺陷、工具箱、集成、报告等"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Optional

from app.database import get_db
from app.models.domain import (
    TestCaseReview, Defect, ToolDefinition, ToolInstance,
    IntegrationConfig, ReportTemplate, ReportRecord, VersionIteration
)
from app.schemas.domain import (
    TestCaseReviewCreate, TestCaseReviewUpdate, TestCaseReviewResponse,
    DefectCreate, DefectUpdate, DefectResponse,
    ToolDefinitionCreate, ToolDefinitionUpdate, ToolDefinitionResponse,
    ToolInstanceCreate, ToolInstanceUpdate, ToolInstanceResponse,
    IntegrationConfigCreate, IntegrationConfigUpdate, IntegrationConfigResponse,
    ReportTemplateCreate, ReportTemplateUpdate, ReportTemplateResponse,
    ReportRecordCreate, ReportRecordResponse,
    VersionIterationCreate, VersionIterationUpdate, VersionIterationResponse,
    JiraSyncRequest, FeishuSyncRequest, ToolExecuteRequest
)

router = APIRouter()


# ==================== 用例评审模块 ====================
@router.get("/test-case-reviews", response_model=List[TestCaseReviewResponse])
def get_test_case_reviews(
    project_id: Optional[str] = None,
    test_case_id: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """获取用例评审列表"""
    query = db.query(TestCaseReview)
    if project_id:
        query = query.filter(TestCaseReview.project_id == project_id)
    if test_case_id:
        query = query.filter(TestCaseReview.test_case_id == test_case_id)
    if status:
        query = query.filter(TestCaseReview.status == status)
    return query.order_by(TestCaseReview.created_at.desc()).all()


@router.post("/test-case-reviews", response_model=TestCaseReviewResponse)
def create_test_case_review(
    project_id: str,
    review: TestCaseReviewCreate,
    db: Session = Depends(get_db)
):
    """创建用例评审"""
    db_review = TestCaseReview(
        **review.model_dump(),
        project_id=project_id
    )
    db.add(db_review)
    db.commit()
    db.refresh(db_review)
    return db_review


@router.put("/test-case-reviews/{review_id}", response_model=TestCaseReviewResponse)
def update_test_case_review(
    review_id: str,
    review_update: TestCaseReviewUpdate,
    db: Session = Depends(get_db)
):
    """更新用例评审"""
    review = db.query(TestCaseReview).filter(TestCaseReview.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    update_data = review_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(review, key, value)
    db.commit()
    db.refresh(review)
    return review


@router.get("/test-case-reviews/{review_id}", response_model=TestCaseReviewResponse)
def get_test_case_review(review_id: str, db: Session = Depends(get_db)):
    """获取用例评审详情"""
    review = db.query(TestCaseReview).filter(TestCaseReview.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    return review


@router.delete("/test-case-reviews/{review_id}")
def delete_test_case_review(review_id: str, db: Session = Depends(get_db)):
    """删除用例评审"""
    review = db.query(TestCaseReview).filter(TestCaseReview.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    db.delete(review)
    db.commit()
    return {"message": "Review deleted"}


# ==================== 缺陷管理模块 ====================
@router.get("/defects", response_model=List[DefectResponse])
def get_defects(
    project_id: Optional[str] = None,
    status: Optional[str] = None,
    severity: Optional[str] = None,
    test_case_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """获取缺陷列表"""
    query = db.query(Defect)
    if project_id:
        query = query.filter(Defect.project_id == project_id)
    if status:
        query = query.filter(Defect.status == status)
    if severity:
        query = query.filter(Defect.severity == severity)
    if test_case_id:
        query = query.filter(Defect.test_case_id == test_case_id)
    return query.order_by(Defect.created_at.desc()).all()


@router.post("/defects", response_model=DefectResponse)
def create_defect(
    project_id: str,
    defect: DefectCreate,
    db: Session = Depends(get_db)
):
    """创建缺陷"""
    db_defect = Defect(**defect.model_dump(), project_id=project_id)
    db.add(db_defect)
    db.commit()
    db.refresh(db_defect)
    return db_defect


@router.put("/defects/{defect_id}", response_model=DefectResponse)
def update_defect(
    defect_id: str,
    defect_update: DefectUpdate,
    db: Session = Depends(get_db)
):
    """更新缺陷"""
    defect = db.query(Defect).filter(Defect.id == defect_id).first()
    if not defect:
        raise HTTPException(status_code=404, detail="Defect not found")
    update_data = defect_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(defect, key, value)
    db.commit()
    db.refresh(defect)
    return defect


@router.get("/defects/{defect_id}", response_model=DefectResponse)
def get_defect(defect_id: str, db: Session = Depends(get_db)):
    """获取缺陷详情"""
    defect = db.query(Defect).filter(Defect.id == defect_id).first()
    if not defect:
        raise HTTPException(status_code=404, detail="Defect not found")
    return defect


@router.delete("/defects/{defect_id}")
def delete_defect(defect_id: str, db: Session = Depends(get_db)):
    """删除缺陷"""
    defect = db.query(Defect).filter(Defect.id == defect_id).first()
    if not defect:
        raise HTTPException(status_code=404, detail="Defect not found")
    db.delete(defect)
    db.commit()
    return {"message": "Defect deleted"}


# ==================== 工具箱模块 ====================
@router.get("/tool-definitions", response_model=List[ToolDefinitionResponse])
def get_tool_definitions(
    tool_type: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """获取工具定义列表"""
    query = db.query(ToolDefinition)
    if tool_type:
        query = query.filter(ToolDefinition.tool_type == tool_type)
    if category:
        query = query.filter(ToolDefinition.category == category)
    return query.order_by(ToolDefinition.created_at.desc()).all()


@router.post("/tool-definitions", response_model=ToolDefinitionResponse)
def create_tool_definition(
    tool: ToolDefinitionCreate,
    db: Session = Depends(get_db)
):
    """创建工具定义"""
    db_tool = ToolDefinition(**tool.model_dump())
    db.add(db_tool)
    db.commit()
    db.refresh(db_tool)
    return db_tool


@router.put("/tool-definitions/{tool_id}", response_model=ToolDefinitionResponse)
def update_tool_definition(
    tool_id: str,
    tool_update: ToolDefinitionUpdate,
    db: Session = Depends(get_db)
):
    """更新工具定义"""
    tool = db.query(ToolDefinition).filter(ToolDefinition.id == tool_id).first()
    if not tool:
        raise HTTPException(status_code=404, detail="Tool definition not found")
    update_data = tool_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(tool, key, value)
    db.commit()
    db.refresh(tool)
    return tool


@router.get("/tool-definitions/{tool_id}", response_model=ToolDefinitionResponse)
def get_tool_definition(tool_id: str, db: Session = Depends(get_db)):
    """获取工具定义详情"""
    tool = db.query(ToolDefinition).filter(ToolDefinition.id == tool_id).first()
    if not tool:
        raise HTTPException(status_code=404, detail="Tool definition not found")
    return tool


@router.get("/tool-instances", response_model=List[ToolInstanceResponse])
def get_tool_instances(
    project_id: Optional[str] = None,
    tool_definition_id: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """获取工具实例列表"""
    query = db.query(ToolInstance)
    if project_id:
        query = query.filter(ToolInstance.project_id == project_id)
    if tool_definition_id:
        query = query.filter(ToolInstance.tool_definition_id == tool_definition_id)
    if status:
        query = query.filter(ToolInstance.status == status)
    return query.order_by(ToolInstance.created_at.desc()).all()


@router.post("/tool-instances", response_model=ToolInstanceResponse)
def create_tool_instance(
    instance: ToolInstanceCreate,
    db: Session = Depends(get_db)
):
    """创建工具实例"""
    db_instance = ToolInstance(**instance.model_dump())
    db.add(db_instance)
    db.commit()
    db.refresh(db_instance)
    return db_instance


@router.post("/tool-instances/execute")
def execute_tool(
    request: ToolExecuteRequest,
    db: Session = Depends(get_db)
):
    """执行工具（模拟）"""
    instance = db.query(ToolInstance).filter(ToolInstance.id == request.tool_instance_id).first()
    if not instance:
        raise HTTPException(status_code=404, detail="Tool instance not found")
    # 这里是模拟执行，真实场景会调用相应的工具执行器
    return {
        "success": True,
        "tool_name": instance.name,
        "output": "Tool execution simulated",
        "parameters": request.parameters
    }


# ==================== 集成配置模块 ====================
@router.get("/integration-configs", response_model=List[IntegrationConfigResponse])
def get_integration_configs(
    project_id: Optional[str] = None,
    integration_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """获取集成配置列表"""
    query = db.query(IntegrationConfig)
    if project_id:
        query = query.filter(IntegrationConfig.project_id == project_id)
    if integration_type:
        query = query.filter(IntegrationConfig.integration_type == integration_type)
    return query.order_by(IntegrationConfig.created_at.desc()).all()


@router.post("/integration-configs", response_model=IntegrationConfigResponse)
def create_integration_config(
    config: IntegrationConfigCreate,
    db: Session = Depends(get_db)
):
    """创建集成配置"""
    db_config = IntegrationConfig(**config.model_dump())
    db.add(db_config)
    db.commit()
    db.refresh(db_config)
    return db_config


@router.put("/integration-configs/{config_id}", response_model=IntegrationConfigResponse)
def update_integration_config(
    config_id: str,
    config_update: IntegrationConfigUpdate,
    db: Session = Depends(get_db)
):
    """更新集成配置"""
    config = db.query(IntegrationConfig).filter(IntegrationConfig.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Integration config not found")
    update_data = config_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(config, key, value)
    db.commit()
    db.refresh(config)
    return config


@router.post("/integration-configs/{config_id}/sync/jira")
def sync_jira_data(
    config_id: str,
    request: JiraSyncRequest,
    db: Session = Depends(get_db)
):
    """Jira 数据同步（模拟）"""
    config = db.query(IntegrationConfig).filter(IntegrationConfig.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Integration config not found")
    # 这里是模拟同步，真实场景会调用 Jira API
    return {
        "success": True,
        "message": "Jira sync simulated",
        "sync_type": request.sync_type,
        "imported_count": 5
    }


@router.post("/integration-configs/{config_id}/sync/feishu")
def sync_feishu_data(
    config_id: str,
    request: FeishuSyncRequest,
    db: Session = Depends(get_db)
):
    """飞书数据同步（模拟）"""
    config = db.query(IntegrationConfig).filter(IntegrationConfig.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Integration config not found")
    # 这里是模拟同步，真实场景会调用飞书 API
    return {
        "success": True,
        "message": "Feishu sync simulated",
        "sync_type": request.sync_type,
        "imported_count": 5
    }


# ==================== 报告模块 ====================
@router.get("/report-templates", response_model=List[ReportTemplateResponse])
def get_report_templates(
    template_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """获取报告模板列表"""
    query = db.query(ReportTemplate)
    if template_type:
        query = query.filter(ReportTemplate.template_type == template_type)
    return query.order_by(ReportTemplate.created_at.desc()).all()


@router.post("/report-templates", response_model=ReportTemplateResponse)
def create_report_template(
    template: ReportTemplateCreate,
    db: Session = Depends(get_db)
):
    """创建报告模板"""
    db_template = ReportTemplate(**template.model_dump())
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template


@router.get("/report-records", response_model=List[ReportRecordResponse])
def get_report_records(
    project_id: Optional[str] = None,
    report_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """获取报告记录列表"""
    query = db.query(ReportRecord)
    if project_id:
        query = query.filter(ReportRecord.project_id == project_id)
    if report_type:
        query = query.filter(ReportRecord.report_type == report_type)
    return query.order_by(ReportRecord.created_at.desc()).all()


@router.post("/report-records", response_model=ReportRecordResponse)
def create_report_record(
    project_id: Optional[str],
    record: ReportRecordCreate,
    db: Session = Depends(get_db)
):
    """创建报告记录"""
    db_record = ReportRecord(**record.model_dump(), project_id=project_id)
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record


@router.post("/report-records/generate/daily")
def generate_daily_report(
    project_id: str,
    date: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    """生成日报（模拟）"""
    if not date:
        date = datetime.utcnow()
    return {
        "success": True,
        "report_type": "daily",
        "date": date.date().isoformat(),
        "summary": {
            "total_executions": 10,
            "passed": 8,
            "failed": 2,
            "new_defects": 3
        }
    }


@router.post("/report-records/generate/weekly")
def generate_weekly_report(
    project_id: str,
    start_date: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    """生成周报（模拟）"""
    if not start_date:
        start_date = datetime.utcnow() - timedelta(days=7)
    end_date = datetime.utcnow()
    return {
        "success": True,
        "report_type": "weekly",
        "start_date": start_date.date().isoformat(),
        "end_date": end_date.date().isoformat(),
        "summary": {
            "total_executions": 50,
            "passed": 42,
            "failed": 8,
            "new_defects": 12,
            "fixed_defects": 5
        }
    }


# ==================== 版本/迭代模块 ====================
@router.get("/version-iterations", response_model=List[VersionIterationResponse])
def get_version_iterations(
    project_id: Optional[str] = None,
    iteration_type: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """获取版本/迭代列表"""
    query = db.query(VersionIteration)
    if project_id:
        query = query.filter(VersionIteration.project_id == project_id)
    if iteration_type:
        query = query.filter(VersionIteration.iteration_type == iteration_type)
    if status:
        query = query.filter(VersionIteration.status == status)
    return query.order_by(VersionIteration.created_at.desc()).all()


@router.post("/version-iterations", response_model=VersionIterationResponse)
def create_version_iteration(
    project_id: str,
    iteration: VersionIterationCreate,
    db: Session = Depends(get_db)
):
    """创建版本/迭代"""
    db_iteration = VersionIteration(**iteration.model_dump(), project_id=project_id)
    db.add(db_iteration)
    db.commit()
    db.refresh(db_iteration)
    return db_iteration


@router.put("/version-iterations/{iteration_id}", response_model=VersionIterationResponse)
def update_version_iteration(
    iteration_id: str,
    iteration_update: VersionIterationUpdate,
    db: Session = Depends(get_db)
):
    """更新版本/迭代"""
    iteration = db.query(VersionIteration).filter(VersionIteration.id == iteration_id).first()
    if not iteration:
        raise HTTPException(status_code=404, detail="Version/Iteration not found")
    update_data = iteration_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(iteration, key, value)
    db.commit()
    db.refresh(iteration)
    return iteration


@router.get("/version-iterations/{iteration_id}", response_model=VersionIterationResponse)
def get_version_iteration(iteration_id: str, db: Session = Depends(get_db)):
    """获取版本/迭代详情"""
    iteration = db.query(VersionIteration).filter(VersionIteration.id == iteration_id).first()
    if not iteration:
        raise HTTPException(status_code=404, detail="Version/Iteration not found")
    return iteration


# ==================== 预设工具定义（ADB、串口等） ====================
@router.post("/tool-definitions/initialize-presets")
def initialize_preset_tools(db: Session = Depends(get_db)):
    """初始化预设工具定义"""
    presets = [
        {
            "name": "ADB Shell Command",
            "description": "Execute ADB shell commands on Android devices",
            "tool_type": "agent_tool",
            "category": "adb",
            "capabilities": ["shell", "command_execution"]
        },
        {
            "name": "ADB Logcat Capture",
            "description": "Capture Android device logcat output",
            "tool_type": "agent_tool",
            "category": "adb",
            "capabilities": ["logging", "logcat"]
        },
        {
            "name": "Serial Port Communication",
            "description": "Send and receive data through serial port",
            "tool_type": "agent_tool",
            "category": "serial",
            "capabilities": ["serial", "communication"]
        },
        {
            "name": "UIAutomator2 Execution",
            "description": "Run UI automation tests using UIAutomator2",
            "tool_type": "agent_tool",
            "category": "adb",
            "capabilities": ["ui_automation", "app_testing"]
        },
        {
            "name": "Power Consumption Monitor",
            "description": "Monitor device power consumption",
            "tool_type": "agent_tool",
            "category": "power",
            "capabilities": ["power_monitoring", "measurement"]
        },
        {
            "name": "Relay Control",
            "description": "Control relay switches for hardware testing",
            "tool_type": "agent_tool",
            "category": "relay",
            "capabilities": ["hardware_control", "relay"]
        }
    ]
    
    created = []
    for preset in presets:
        existing = db.query(ToolDefinition).filter(ToolDefinition.name == preset["name"]).first()
        if not existing:
            tool = ToolDefinition(**preset)
            db.add(tool)
            created.append(preset["name"])
    
    db.commit()
    
    return {
        "message": f"Initialized {len(created)} preset tools",
        "created": created
    }
