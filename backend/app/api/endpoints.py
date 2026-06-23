import shutil
import os
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import croniter
import random
from app.database import get_db
from app.models.domain import *
from app.schemas.domain import *
from app.core.security import verify_password, create_access_token
from app.services.ai_service import get_ai_provider, reset_ai_provider, PROVIDER_CONFIGS
from app.core.config import settings

router = APIRouter()

@router.post("/auth/login", response_model=Token)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == user_data.username).first()
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/auth/me", response_model=UserResponse)
def get_current_user_info(db: Session = Depends(get_db)):
    # 简化的实现，实际应该验证token
    user = db.query(User).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.post("/projects", response_model=ProjectResponse)
def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    db_project = Project(**project.model_dump())
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

@router.get("/projects", response_model=List[ProjectResponse])
def get_projects(db: Session = Depends(get_db)):
    return db.query(Project).all()

@router.get("/projects/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.put("/projects/{project_id}", response_model=ProjectResponse)
def update_project(project_id: str, project_data: ProjectCreate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    for key, value in project_data.model_dump().items():
        setattr(project, key, value)
    db.commit()
    db.refresh(project)
    return project

@router.delete("/projects/{project_id}")
def delete_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()
    return {"message": "Project deleted"}

@router.get("/projects/{project_id}/requirements", response_model=List[RequirementResponse])
def get_requirements(project_id: str, db: Session = Depends(get_db)):
    return db.query(Requirement).filter(Requirement.project_id == project_id).all()

@router.post("/projects/{project_id}/requirements", response_model=RequirementResponse)
def create_requirement(project_id: str, req: RequirementCreate, db: Session = Depends(get_db)):
    db_req = Requirement(**req.model_dump(), project_id=project_id)
    db.add(db_req)
    db.commit()
    db.refresh(db_req)
    return db_req

@router.get("/requirements/{req_id}", response_model=RequirementResponse)
def get_requirement(req_id: str, db: Session = Depends(get_db)):
    req = db.query(Requirement).filter(Requirement.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")
    return req

@router.put("/requirements/{req_id}", response_model=RequirementResponse)
def update_requirement(req_id: str, req_data: RequirementCreate, db: Session = Depends(get_db)):
    req = db.query(Requirement).filter(Requirement.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")
    for key, value in req_data.model_dump().items():
        setattr(req, key, value)
    db.commit()
    db.refresh(req)
    return req

@router.delete("/requirements/{req_id}")
def delete_requirement(req_id: str, db: Session = Depends(get_db)):
    req = db.query(Requirement).filter(Requirement.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")
    db.delete(req)
    db.commit()
    return {"message": "Requirement deleted"}

@router.post("/projects/{project_id}/requirements/import-jira")
def import_jira_requirements(project_id: str, import_req: JiraImportRequest, db: Session = Depends(get_db)):
    """Mock import requirements from Jira"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Mock data
    mock_reqs = [
        {"title": f"[{import_req.project_key or 'PROJ'}-1] 用户登录", "description": "作为用户，我希望能够通过账号密码登录系统"},
        {"title": f"[{import_req.project_key or 'PROJ'}-2] 找回密码", "description": "作为用户，我希望能够通过邮箱找回密码"},
        {"title": f"[{import_req.project_key or 'PROJ'}-3] 数据导出", "description": "作为管理员，我希望能够导出报表数据"}
    ]
    
    imported = []
    for r in mock_reqs:
        db_req = Requirement(project_id=project_id, title=r["title"], description=r["description"], status="imported")
        db.add(db_req)
        imported.append(db_req)
    db.commit()
    return {"message": f"Successfully imported {len(imported)} requirements from Jira", "count": len(imported)}

@router.post("/projects/{project_id}/generate-cases")
async def generate_cases_new(project_id: str, request: GenerateCasesRequest, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    ai_content = ""
    req = None
    if request.requirement_id:
        req = db.query(Requirement).filter(Requirement.id == request.requirement_id).first()
        if not req:
            raise HTTPException(status_code=404, detail="Requirement not found")
        ai_content = f"Title: {req.title}\nDescription: {req.description}"
    elif request.content:
        ai_content = request.content
    else:
        raise HTTPException(status_code=400, detail="Must provide either requirement_id or content")
    
    # 使用AI服务生成测试用例
    ai_provider = get_ai_provider()
    ai_result = await ai_provider.generate_test_cases(ai_content)
    cases_created = []
    for c in ai_result["cases"]:
        db_case = TestCase(
            project_id=project_id,
            requirement_id=req.id if req else None,
            title=c["title"],
            feature=request.feature if request.feature else c.get("feature", ""),
            case_category=c.get("case_category", "manual"),
            priority=c.get("priority", "P1"),
            steps=c.get("steps", []),
            expected_result=c.get("expected_result", ""),
            status="candidate"
        )
        db.add(db_case)
        cases_created.append(db_case)
    db.commit()
    return {"message": "Cases generated", "count": len(cases_created)}

@router.post("/requirements/{req_id}/generate-cases")
async def generate_cases(req_id: str, db: Session = Depends(get_db)):
    req = db.query(Requirement).filter(Requirement.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")
    
    # 使用AI服务生成测试用例
    ai_provider = get_ai_provider()
    ai_result = await ai_provider.generate_test_cases(req.description)
    cases_created = []
    for c in ai_result["cases"]:
        db_case = TestCase(
            project_id=req.project_id,
            requirement_id=req.id,
            title=c["title"],
            feature=c.get("feature", ""),
            case_category=c["case_category"],
            priority=c["priority"],
            steps=c["steps"],
            expected_result=c["expected_result"],
            status="candidate"
        )
        db.add(db_case)
        cases_created.append(db_case)
    db.commit()
    return {"message": "Cases generated", "count": len(cases_created)}

@router.get("/test-cases", response_model=List[TestCaseResponse])
def get_all_test_cases(project_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(TestCase)
    if project_id:
        query = query.filter(TestCase.project_id == project_id)
    return query.order_by(TestCase.created_at.desc()).all()

@router.get("/projects/{project_id}/test-cases", response_model=List[TestCaseResponse])
def get_test_cases(project_id: str, db: Session = Depends(get_db)):
    return db.query(TestCase).filter(TestCase.project_id == project_id).all()

@router.get("/test-cases/{case_id}", response_model=TestCaseResponse)
def get_test_case(case_id: str, db: Session = Depends(get_db)):
    case = db.query(TestCase).filter(TestCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Test case not found")
    return case

@router.post("/projects/{project_id}/test-cases", response_model=TestCaseResponse)
def create_test_case(project_id: str, case_data: TestCaseCreate, db: Session = Depends(get_db)):
    # 验证项目存在
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # 如果指定了requirement_id，验证其存在
    if case_data.requirement_id:
        req = db.query(Requirement).filter(Requirement.id == case_data.requirement_id).first()
        if not req:
            raise HTTPException(status_code=404, detail="Requirement not found")
    
    db_case = TestCase(**case_data.model_dump(), project_id=project_id)
    db.add(db_case)
    db.commit()
    db.refresh(db_case)
    return db_case

@router.put("/test-cases/{case_id}", response_model=TestCaseResponse)
def update_test_case(case_id: str, case_data: TestCaseUpdate, db: Session = Depends(get_db)):
    case = db.query(TestCase).filter(TestCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Test case not found")
    
    update_data = case_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(case, key, value)
    
    db.commit()
    db.refresh(case)
    return case

@router.delete("/test-cases/{case_id}")
def delete_test_case(case_id: str, db: Session = Depends(get_db)):
    case = db.query(TestCase).filter(TestCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Test case not found")
    db.delete(case)
    db.commit()
    return {"message": "Test case deleted"}

@router.post("/test-cases/{case_id}/adopt")
def adopt_test_case(case_id: str, db: Session = Depends(get_db)):
    case = db.query(TestCase).filter(TestCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Test case not found")
    case.status = "adopted"
    db.commit()
    return {"status": "adopted"}

@router.post("/test-cases/{case_id}/enable")
def enable_test_case(case_id: str, db: Session = Depends(get_db)):
    case = db.query(TestCase).filter(TestCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Test case not found")
    case.status = "enabled"
    db.commit()
    return {"status": "enabled"}

@router.post("/sync/test-cases", response_model=SyncTestCasesResponse)
def sync_test_cases(sync_data: SyncTestCasesRequest, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == sync_data.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    created_count = 0
    updated_count = 0
    skipped_count = 0
    
    for tc_item in sync_data.test_cases:
        existing_case = db.query(TestCase).filter(
            TestCase.project_id == sync_data.project_id,
            TestCase.local_case_id == tc_item.local_case_id
        ).first()
        
        if existing_case:
            existing_case.title = tc_item.title
            existing_case.priority = tc_item.priority
            existing_case.steps = tc_item.steps
            existing_case.expected_result = tc_item.expected_result
            existing_case.case_category = tc_item.case_category
            if tc_item.req_id:
                existing_case.requirement_id = tc_item.req_id
            updated_count += 1
        else:
            new_case = TestCase(
                project_id=sync_data.project_id,
                local_case_id=tc_item.local_case_id,
                requirement_id=tc_item.req_id,
                title=tc_item.title,
                priority=tc_item.priority,
                steps=tc_item.steps,
                expected_result=tc_item.expected_result,
                case_category=tc_item.case_category,
                status="candidate"
            )
            db.add(new_case)
            created_count += 1
    
    db.commit()
    return {
        "message": "Sync completed",
        "created": created_count,
        "updated": updated_count,
        "skipped": skipped_count
    }

@router.post("/projects/{project_id}/execution-runs", response_model=ExecutionRunResponse)
def create_run(project_id: str, run: ExecutionRunCreate, db: Session = Depends(get_db)):
    db_run = ExecutionRun(**run.model_dump(), project_id=project_id)
    db.add(db_run)
    db.commit()
    db.refresh(db_run)
    return db_run

@router.get("/execution-runs/{run_id}", response_model=ExecutionRunResponse)
def get_run(run_id: str, db: Session = Depends(get_db)):
    run = db.query(ExecutionRun).filter(ExecutionRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Execution run not found")
    return run

@router.put("/execution-runs/{run_id}", response_model=ExecutionRunResponse)
def update_run(run_id: str, run_data: ExecutionRunCreate, db: Session = Depends(get_db)):
    run = db.query(ExecutionRun).filter(ExecutionRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Execution run not found")
    for key, value in run_data.model_dump().items():
        setattr(run, key, value)
    db.commit()
    db.refresh(run)
    return run

@router.patch("/execution-runs/{run_id}/status")
def update_run_status(run_id: str, status: str, db: Session = Depends(get_db)):
    run = db.query(ExecutionRun).filter(ExecutionRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Execution run not found")
    run.status = status
    db.commit()
    return {"status": status}

@router.delete("/execution-runs/{run_id}")
def delete_run(run_id: str, db: Session = Depends(get_db)):
    run = db.query(ExecutionRun).filter(ExecutionRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Execution run not found")
    db.delete(run)
    db.commit()
    return {"message": "Execution run deleted"}

@router.post("/execution-runs/{run_id}/results", response_model=ExecutionResultResponse)
def submit_result(run_id: str, result: ExecutionResultCreate, db: Session = Depends(get_db)):
    db_res = ExecutionResult(**result.model_dump(), run_id=run_id)
    db.add(db_res)
    db.commit()
    db.refresh(db_res)
    return db_res

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    # 确保上传目录存在
    upload_dir = os.path.join(settings.BASE_DIR, "uploads") if hasattr(settings, "BASE_DIR") else "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    
    file_path = os.path.join(upload_dir, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # 返回相对路径或可以访问的URL，这里简化为相对路径
    return {"url": f"/uploads/{file.filename}", "filename": file.filename}

@router.put("/execution-results/{result_id}", response_model=ExecutionResultResponse)
def update_execution_result(result_id: str, result_update: ExecutionResultCreate, db: Session = Depends(get_db)):
    db_res = db.query(ExecutionResult).filter(ExecutionResult.id == result_id).first()
    if not db_res:
        raise HTTPException(status_code=404, detail="Execution result not found")
    update_data = result_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_res, key, value)
    db.commit()
    db.refresh(db_res)
    return db_res

@router.get("/projects/{project_id}/execution-runs", response_model=List[ExecutionRunResponse])
def get_runs(project_id: str, db: Session = Depends(get_db)):
    return db.query(ExecutionRun).filter(ExecutionRun.project_id == project_id).all()

@router.get("/execution-runs", response_model=List[ExecutionRunResponse])
def get_all_runs(db: Session = Depends(get_db)):
    return db.query(ExecutionRun).order_by(ExecutionRun.created_at.desc()).limit(100).all()

@router.get("/execution-runs/{run_id}/results")
def get_run_results(run_id: str, db: Session = Depends(get_db)):
    results = db.query(ExecutionResult).filter(ExecutionResult.run_id == run_id).all()
    # 附加用例名称和描述
    res_list = []
    for r in results:
        case_info = {"title": "整体计划执行", "description": "由测试计划触发的整体执行记录"}
        if r.test_case_id and r.test_case_id != "virtual-case-for-plan":
            tc = db.query(TestCase).filter(TestCase.id == r.test_case_id).first()
            if tc:
                case_info["title"] = tc.title
                case_info["description"] = tc.expected_result or "自动化测试用例"
                
        res_list.append({
            "id": r.id,
            "run_id": r.run_id,
            "test_case_id": r.test_case_id,
            "status": r.status,
            "error_message": r.error_message,
            "log_url": r.log_url,
            "html_report": r.html_report,
            "executed_at": r.executed_at,
            "case_title": case_info["title"],
            "case_description": case_info["description"]
        })
    return res_list


@router.post("/execution-runs/{run_id}/analyze")
async def analyze_run_report(run_id: str, db: Session = Depends(get_db)):
    """AI分析执行报告"""
    run = db.query(ExecutionRun).filter(ExecutionRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Execution run not found")
    
    results = db.query(ExecutionResult).filter(ExecutionResult.run_id == run_id).all()
    
    # 准备报告数据
    report_data = {
        "run_name": run.name,
        "status": run.status,
        "results": [
            {
                "test_case_id": r.test_case_id,
                "status": r.status,
                "error_message": r.error_message,
                "log_url": r.log_url
            } for r in results
        ]
    }
    
    ai_provider = get_ai_provider()
    analysis = await ai_provider.analyze_report(report_data)
    return {"analysis": analysis}


# ============ 配置管理API ============
@router.get("/config", response_model=List[ConfigResponse])
def get_all_configs(db: Session = Depends(get_db)):
    """获取所有配置项"""
    return db.query(Config).all()


@router.get("/config/{key}", response_model=ConfigResponse)
def get_config(key: str, db: Session = Depends(get_db)):
    """获取单个配置项"""
    config = db.query(Config).filter(Config.key == key).first()
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")
    return config


@router.put("/config/{key}", response_model=ConfigResponse)
def update_config(key: str, config_data: ConfigItem, db: Session = Depends(get_db)):
    """更新配置项"""
    config = db.query(Config).filter(Config.key == key).first()
    if config:
        config.value = config_data.value
        config.description = config_data.description or config.description
        config.updated_at = datetime.utcnow()
    else:
        config = Config(
            key=key,
            value=config_data.value,
            description=config_data.description
        )
        db.add(config)
    db.commit()
    db.refresh(config)
    
    # 如果是AI相关配置，重置AI提供商实例
    if key.startswith("ai_"):
        reset_ai_provider()
    
    return config


@router.get("/ai/providers", response_model=List[AIProviderInfo])
def get_ai_providers():
    """获取支持的AI提供商列表"""
    providers = []
    for provider_type, provider_config in PROVIDER_CONFIGS.items():
        providers.append(AIProviderInfo(
            type=provider_type,
            name=provider_config["name"],
            models=provider_config["models"],
            default_model=provider_config["default_model"],
            default_base_url=provider_config.get("default_base_url")
        ))
    return providers


@router.get("/ai/current-provider")
def get_current_provider(db: Session = Depends(get_db)):
    """获取当前配置的AI提供商"""
    provider_config = db.query(Config).filter(Config.key == "ai_provider").first()
    provider_type = provider_config.value if provider_config else "mock"
    
    config = PROVIDER_CONFIGS.get(provider_type, PROVIDER_CONFIGS["mock"])
    return {
        "type": provider_type,
        "name": config["name"],
        "models": config["models"],
        "default_model": config["default_model"]
    }


# ============ AI助手API ============
@router.post("/ai/chat", response_model=ChatResponse)
async def chat_with_ai(chat_request: ChatRequest):
    """与AI助手对话"""
    ai_provider = get_ai_provider()
    # 转换消息格式
    messages = [{"role": m.role, "content": m.content} for m in chat_request.messages]
    response = await ai_provider.chat(messages)
    return ChatResponse(content=response)


@router.post("/ai/analyze-report")
async def analyze_report(report_request: ReportAnalyzeRequest):
    """AI分析测试报告"""
    ai_provider = get_ai_provider()
    analysis = await ai_provider.analyze_report(report_request.report_data)
    return {"analysis": analysis}


# ============ 定时任务管理API ============
@router.get("/projects/{project_id}/scheduled-tasks", response_model=List[ScheduledTaskResponse])
def get_scheduled_tasks(project_id: str, db: Session = Depends(get_db)):
    """获取项目的定时任务列表"""
    return db.query(ScheduledTask).filter(ScheduledTask.project_id == project_id).order_by(ScheduledTask.created_at.desc()).all()


@router.post("/projects/{project_id}/scheduled-tasks", response_model=ScheduledTaskResponse)
def create_scheduled_task(
    project_id: str,
    task_data: ScheduledTaskCreate,
    db: Session = Depends(get_db)
):
    """创建定时任务"""
    # 验证项目存在
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # 验证Cron表达式格式
    try:
        croniter.croniter(task_data.cron_expression, datetime.now())
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid cron expression: {str(e)}")
    
    # 计算下次运行时间
    next_run = calculate_next_run(task_data.cron_expression)
    
    db_task = ScheduledTask(
        **task_data.model_dump(),
        project_id=project_id,
        next_run_at=next_run
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


@router.get("/scheduled-tasks/{task_id}", response_model=ScheduledTaskResponse)
def get_scheduled_task(task_id: str, db: Session = Depends(get_db)):
    """获取定时任务详情"""
    task = db.query(ScheduledTask).filter(ScheduledTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Scheduled task not found")
    return task


@router.put("/scheduled-tasks/{task_id}", response_model=ScheduledTaskResponse)
def update_scheduled_task(
    task_id: str,
    task_data: ScheduledTaskUpdate,
    db: Session = Depends(get_db)
):
    """更新定时任务"""
    task = db.query(ScheduledTask).filter(ScheduledTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Scheduled task not found")
    
    update_data = task_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(task, key, value)
    
    # 如果更新了Cron表达式，重新计算下次运行时间
    if "cron_expression" in update_data:
        try:
            croniter.croniter(update_data["cron_expression"], datetime.now())
            task.next_run_at = calculate_next_run(update_data["cron_expression"])
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid cron expression: {str(e)}")
    
    task.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(task)
    return task


@router.delete("/scheduled-tasks/{task_id}")
def delete_scheduled_task(task_id: str, db: Session = Depends(get_db)):
    """删除定时任务"""
    task = db.query(ScheduledTask).filter(ScheduledTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Scheduled task not found")
    db.delete(task)
    db.commit()
    return {"message": "Scheduled task deleted"}


@router.post("/scheduled-tasks/{task_id}/trigger")
def trigger_scheduled_task(task_id: str, db: Session = Depends(get_db)):
    """手动触发定时任务执行"""
    task = db.query(ScheduledTask).filter(ScheduledTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Scheduled task not found")
    
    # 使用任务配置创建执行
    config = task.config or {}
    agent_id = config.get("agent_id")
    device_id = config.get("device_id")
    test_plan_id = config.get("test_plan_id")
    
    working_dir = None
    test_command = None
    if test_plan_id:
        test_plan = db.query(TestPlan).filter(TestPlan.id == test_plan_id).first()
        if test_plan:
            working_dir = test_plan.working_dir
            test_command = test_plan.test_command

    result = trigger_execution_internal(
        db=db,
        project_id=task.project_id,
        name=f"Manual: {task.name}",
        agent_id=agent_id,
        device_id=device_id,
        priority=0,
        test_case_ids=config.get("test_case_ids"),
        working_dir=working_dir,
        test_command=test_command
    )
    
    # 更新任务的最后运行时间
    task.last_run_at = datetime.utcnow()
    db.commit()
    
    return result


# ============ Test Plan (测试计划) 管理API ============
@router.get("/projects/{project_id}/test-plans", response_model=List[TestPlanResponse])
def get_test_plans(project_id: str, db: Session = Depends(get_db)):
    plans = db.query(TestPlan).filter(TestPlan.project_id == project_id).order_by(TestPlan.created_at.desc()).all()
    # 为每个 plan 附加上最新一次的执行状态 (通过 name 匹配或者新加关联字段)
    result = []
    for plan in plans:
        plan_dict = {
            "id": plan.id,
            "project_id": plan.project_id,
            "name": plan.name,
            "description": plan.description,
            "env": plan.env,
            "working_dir": plan.working_dir,
            "test_command": plan.test_command,
            "case_filters": plan.case_filters,
            "case_ids": plan.case_ids,
            "status": plan.status,
            "created_at": plan.created_at,
            "updated_at": plan.updated_at
        }
        
        # 查找最新的一次关联执行 (假设通过 name="Run: plan_name" 触发)
        latest_run = db.query(ExecutionRun).filter(
            ExecutionRun.project_id == project_id,
            ExecutionRun.name.like(f"%{plan.name}%")
        ).order_by(ExecutionRun.created_at.desc()).first()
        
        if latest_run:
            plan_dict["latest_run_id"] = latest_run.id
            plan_dict["latest_run_status"] = latest_run.status
            
        result.append(plan_dict)
        
    return result

@router.post("/projects/{project_id}/test-plans", response_model=TestPlanResponse)
def create_test_plan(project_id: str, plan_data: TestPlanCreate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    db_plan = TestPlan(**plan_data.model_dump(), project_id=project_id)
    db.add(db_plan)
    db.commit()
    db.refresh(db_plan)
    return db_plan

@router.get("/test-plans/{plan_id}", response_model=TestPlanResponse)
def get_test_plan(plan_id: str, db: Session = Depends(get_db)):
    plan = db.query(TestPlan).filter(TestPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Test plan not found")
    return plan

@router.put("/test-plans/{plan_id}", response_model=TestPlanResponse)
def update_test_plan(plan_id: str, plan_data: TestPlanUpdate, db: Session = Depends(get_db)):
    plan = db.query(TestPlan).filter(TestPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Test plan not found")
    
    update_data = plan_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(plan, key, value)
    
    db.commit()
    db.refresh(plan)
    return plan

@router.delete("/test-plans/{plan_id}")
def delete_test_plan(plan_id: str, db: Session = Depends(get_db)):
    plan = db.query(TestPlan).filter(TestPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Test plan not found")
    db.delete(plan)
    db.commit()
    return {"message": "Test plan deleted"}

# ============ 执行触发API ============
@router.post("/projects/{project_id}/trigger-execution")
def trigger_execution(
    project_id: str,
    request: TriggerExecutionRequest,
    db: Session = Depends(get_db)
):
    """手动触发一次测试执行"""
    return trigger_execution_internal(
        db=db,
        project_id=project_id,
        name=request.name,
        agent_id=request.agent_id,
        device_id=request.device_id,
        priority=request.priority,
        test_case_ids=request.test_case_ids,
        working_dir=request.working_dir,
        test_command=request.test_command,
        test_plan_id=request.test_plan_id
    )


# ============ 内部辅助函数 ============
def trigger_execution_internal(
    db: Session,
    project_id: str,
    name: str,
    agent_id: Optional[str] = None,
    device_id: Optional[str] = None,
    priority: int = 0,
    test_case_ids: Optional[List[str]] = None,
    working_dir: Optional[str] = None,
    test_command: Optional[str] = None,
    test_plan_id: Optional[str] = None
):
    """内部函数：触发执行"""
    # 验证项目存在
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if test_plan_id and not test_case_ids:
        test_plan = db.query(TestPlan).filter(TestPlan.id == test_plan_id).first()
        if test_plan:
            if test_plan.case_ids:
                test_case_ids = test_plan.case_ids
            else:
                # 只有在没有自定义执行命令且没有配置任何用例过滤条件的情况下，才可能会回退到查所有用例。
                # 但如果是通过自定义命令跑的，我们坚决不去查询所有用例。
                if not test_command and test_plan.case_filters:
                    query = db.query(TestCase).filter(TestCase.project_id == project_id)
                    if test_plan.case_filters.get('category'):
                        query = query.filter(TestCase.case_category == test_plan.case_filters['category'])
                    if test_plan.case_filters.get('feature'):
                        query = query.filter(TestCase.feature.in_(test_plan.case_filters['feature']))
                    test_cases = query.all()
                    test_case_ids = [tc.id for tc in test_cases]
    
    # 1. 创建 ExecutionRun
    run = ExecutionRun(
        project_id=project_id,
        name=name,
        status="pending",
        test_plan_id=test_plan_id
    )
    db.add(run)
    db.flush()  # 获取 run.id
    
    # 2. 如果没有指定测试用例，尝试获取关联到测试计划的用例或所有启用用例
    # 这里暂时简化：如果没有传用例，我们至少塞一个假的用例或者允许空用例执行
    if not test_case_ids:
        # 只要指定了自定义命令（不管是不是测试计划），就不自动加载所有用例，而是使用虚拟用例承载执行日志
        if not test_command:
            test_cases = db.query(TestCase).filter(
                TestCase.project_id == project_id,
                TestCase.status == "enabled"
            ).all()
            test_case_ids = [tc.id for tc in test_cases]
        
    # 如果没有用例，插入一个虚拟的执行结果以便能展示日志
    if not test_case_ids:
        result = ExecutionResult(
            run_id=run.id,
            test_case_id="virtual-case-for-plan",
            status="pending"
        )
        db.add(result)
    else:
        # 3. 为每个测试用例创建 ExecutionResult
        for case_id in test_case_ids:
            result = ExecutionResult(
                run_id=run.id,
                test_case_id=case_id,
                status="pending"
            )
            db.add(result)
    
    db.commit()
    
    # 4. 调用设备管理API的入队函数
    from app.models.device import ExecutionQueue as DeviceExecQueue
    
    # 准备任务配置信息
    task_config = {
        "working_dir": working_dir or project.working_dir,
        "test_command": test_command or project.test_command,
        "test_case_ids": test_case_ids
    }
    
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cloud_log = f"[{current_time}] ☁️ [Cloud] 收到测试执行触发请求 (Run ID: {run.id})\n"
    if agent_id:
        cloud_log += f"[{current_time}] ☁️ [Cloud] 指定执行节点 Agent ID: {agent_id}\n"
    else:
        cloud_log += f"[{current_time}] ☁️ [Cloud] 未指定执行节点，将使用随机调度策略\n"
    cloud_log += f"[{current_time}] ☁️ [Cloud] 正在生成执行队列任务...\n"
    
    queue_item = DeviceExecQueue(
        run_id=run.id,
        device_id=device_id,
        agent_id=agent_id,
        status="pending",
        priority=priority,
        config=task_config,
        result=cloud_log
    )
    db.add(queue_item)
    db.commit()
    
    # 补充队列ID相关日志
    cloud_log += f"[{current_time}] ☁️ [Cloud] 任务已成功加入调度队列 (Queue ID: {queue_item.id})，等待 Agent 节点认领...\n"
    cloud_log += "-" * 60 + "\n"
    queue_item.result = cloud_log
    db.commit()
    
    # 将初始云端日志同步到 ExecutionResult 中，确保前端立刻能看到
    for res in db.query(ExecutionResult).filter(ExecutionResult.run_id == run.id).all():
        res.log_url = cloud_log
    db.commit()
    
    return {
        "run_id": run.id,
        "message": "Execution triggered successfully",
        "queue_id": queue_item.id
    }


def calculate_next_run(cron_expression: str) -> datetime:
    """计算下次运行时间"""
    now = datetime.now()
    cron = croniter.croniter(cron_expression, now)
    return cron.get_next(datetime)


# ============== 用例评审 ==============
@router.get("/test-case-reviews", response_model=List[TestCaseReviewResponse])
def get_reviews(project_id: Optional[str] = None, test_case_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(TestCaseReview)
    if project_id: query = query.filter(TestCaseReview.project_id == project_id)
    if test_case_id: query = query.filter(TestCaseReview.test_case_id == test_case_id)
    return query.all()

@router.post("/test-case-reviews", response_model=TestCaseReviewResponse)
def create_review(review: TestCaseReviewCreate, project_id: Optional[str] = None, db: Session = Depends(get_db)):
    db_review = TestCaseReview(**review.model_dump(), project_id=project_id)
    db.add(db_review)
    db.commit()
    db.refresh(db_review)
    return db_review

@router.put("/test-case-reviews/{review_id}", response_model=TestCaseReviewResponse)
def update_review(review_id: str, review_data: TestCaseReviewUpdate, db: Session = Depends(get_db)):
    review = db.query(TestCaseReview).filter(TestCaseReview.id == review_id).first()
    if not review: raise HTTPException(status_code=404, detail="Review not found")
    for key, value in review_data.model_dump(exclude_unset=True).items():
        setattr(review, key, value)
    db.commit()
    db.refresh(review)
    return review

@router.delete("/test-case-reviews/{review_id}")
def delete_review(review_id: str, db: Session = Depends(get_db)):
    review = db.query(TestCaseReview).filter(TestCaseReview.id == review_id).first()
    if not review: raise HTTPException(status_code=404, detail="Review not found")
    db.delete(review)
    db.commit()
    return {"message": "deleted"}

# ============== 缺陷管理 ==============
@router.get("/defects", response_model=List[DefectResponse])
def get_defects(project_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Defect)
    if project_id: query = query.filter(Defect.project_id == project_id)
    return query.all()

@router.get("/defects/{defect_id}", response_model=DefectResponse)
def get_defect(defect_id: str, db: Session = Depends(get_db)):
    defect = db.query(Defect).filter(Defect.id == defect_id).first()
    if not defect: raise HTTPException(status_code=404, detail="Defect not found")
    return defect

@router.post("/defects", response_model=DefectResponse)
def create_defect(defect: DefectCreate, project_id: Optional[str] = None, db: Session = Depends(get_db)):
    db_defect = Defect(**defect.model_dump(), project_id=project_id)
    db.add(db_defect)
    db.commit()
    db.refresh(db_defect)
    return db_defect

@router.put("/defects/{defect_id}", response_model=DefectResponse)
def update_defect(defect_id: str, defect_data: DefectUpdate, db: Session = Depends(get_db)):
    defect = db.query(Defect).filter(Defect.id == defect_id).first()
    if not defect: raise HTTPException(status_code=404, detail="Defect not found")
    for key, value in defect_data.model_dump(exclude_unset=True).items():
        setattr(defect, key, value)
    db.commit()
    db.refresh(defect)
    return defect

@router.delete("/defects/{defect_id}")
def delete_defect(defect_id: str, db: Session = Depends(get_db)):
    defect = db.query(Defect).filter(Defect.id == defect_id).first()
    if not defect: raise HTTPException(status_code=404, detail="Defect not found")
    db.delete(defect)
    db.commit()
    return {"message": "deleted"}

# ============== 工具箱 ==============
@router.get("/tool-definitions", response_model=List[ToolDefinitionResponse])
def get_tool_defs(db: Session = Depends(get_db)):
    return db.query(ToolDefinition).all()

@router.get("/tool-definitions/{tool_id}", response_model=ToolDefinitionResponse)
def get_tool_def(tool_id: str, db: Session = Depends(get_db)):
    tool = db.query(ToolDefinition).filter(ToolDefinition.id == tool_id).first()
    if not tool: raise HTTPException(status_code=404, detail="Tool not found")
    return tool

@router.post("/tool-definitions", response_model=ToolDefinitionResponse)
def create_tool_def(tool: ToolDefinitionCreate, db: Session = Depends(get_db)):
    db_tool = ToolDefinition(**tool.model_dump())
    db.add(db_tool)
    db.commit()
    db.refresh(db_tool)
    return db_tool

@router.get("/tool-instances", response_model=List[ToolInstanceResponse])
def get_tool_instances(project_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(ToolInstance)
    if project_id: query = query.filter(ToolInstance.project_id == project_id)
    return query.all()

@router.post("/tool-instances", response_model=ToolInstanceResponse)
def create_tool_inst(inst: ToolInstanceCreate, db: Session = Depends(get_db)):
    db_inst = ToolInstance(**inst.model_dump())
    db.add(db_inst)
    db.commit()
    db.refresh(db_inst)
    return db_inst

# ============== 集成配置 ==============
@router.get("/integration-configs", response_model=List[IntegrationConfigResponse])
def get_integrations(project_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(IntegrationConfig)
    if project_id: query = query.filter(IntegrationConfig.project_id == project_id)
    return query.all()

@router.post("/integration-configs", response_model=IntegrationConfigResponse)
def create_integration(integration: IntegrationConfigCreate, db: Session = Depends(get_db)):
    db_integ = IntegrationConfig(**integration.model_dump())
    db.add(db_integ)
    db.commit()
    db.refresh(db_integ)
    return db_integ

@router.put("/integration-configs/{config_id}", response_model=IntegrationConfigResponse)
def update_integration(config_id: str, config_data: IntegrationConfigUpdate, db: Session = Depends(get_db)):
    config = db.query(IntegrationConfig).filter(IntegrationConfig.id == config_id).first()
    if not config: raise HTTPException(status_code=404, detail="Integration not found")
    for key, value in config_data.model_dump(exclude_unset=True).items():
        setattr(config, key, value)
    db.commit()
    db.refresh(config)
    return config

@router.delete("/integration-configs/{config_id}")
def delete_integration(config_id: str, db: Session = Depends(get_db)):
    config = db.query(IntegrationConfig).filter(IntegrationConfig.id == config_id).first()
    if not config: raise HTTPException(status_code=404, detail="Integration not found")
    db.delete(config)
    db.commit()
    return {"message": "deleted"}

# ============== 报告模板/记录 ==============
@router.get("/report-templates", response_model=List[ReportTemplateResponse])
def get_report_templates(db: Session = Depends(get_db)):
    return db.query(ReportTemplate).all()

@router.post("/report-templates", response_model=ReportTemplateResponse)
def create_report_template(template: ReportTemplateCreate, db: Session = Depends(get_db)):
    db_temp = ReportTemplate(**template.model_dump())
    db.add(db_temp)
    db.commit()
    db.refresh(db_temp)
    return db_temp

@router.get("/report-records", response_model=List[ReportRecordResponse])
def get_report_records(project_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(ReportRecord)
    if project_id: query = query.filter(ReportRecord.project_id == project_id)
    return query.all()

@router.post("/report-records", response_model=ReportRecordResponse)
def create_report_record(record: ReportRecordCreate, db: Session = Depends(get_db)):
    db_rec = ReportRecord(**record.model_dump())
    db.add(db_rec)
    db.commit()
    db.refresh(db_rec)
    return db_rec

# ============== 版本/迭代 ==============
@router.get("/version-iterations", response_model=List[VersionIterationResponse])
def get_versions(project_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(VersionIteration)
    if project_id: query = query.filter(VersionIteration.project_id == project_id)
    return query.all()

@router.get("/version-iterations/{version_id}", response_model=VersionIterationResponse)
def get_version(version_id: str, db: Session = Depends(get_db)):
    version = db.query(VersionIteration).filter(VersionIteration.id == version_id).first()
    if not version: raise HTTPException(status_code=404, detail="Version not found")
    return version

@router.post("/version-iterations", response_model=VersionIterationResponse)
def create_version(version: VersionIterationCreate, db: Session = Depends(get_db)):
    db_ver = VersionIteration(**version.model_dump())
    db.add(db_ver)
    db.commit()
    db.refresh(db_ver)
    return db_ver

@router.put("/version-iterations/{version_id}", response_model=VersionIterationResponse)
def update_version(version_id: str, version_data: VersionIterationUpdate, db: Session = Depends(get_db)):
    version = db.query(VersionIteration).filter(VersionIteration.id == version_id).first()
    if not version: raise HTTPException(status_code=404, detail="Version not found")
    for key, value in version_data.model_dump(exclude_unset=True).items():
        setattr(version, key, value)
    db.commit()
    db.refresh(version)
    return version

@router.delete("/version-iterations/{version_id}")
def delete_version(version_id: str, db: Session = Depends(get_db)):
    version = db.query(VersionIteration).filter(VersionIteration.id == version_id).first()
    if not version: raise HTTPException(status_code=404, detail="Version not found")
    db.delete(version)
    db.commit()
    return {"message": "deleted"}
