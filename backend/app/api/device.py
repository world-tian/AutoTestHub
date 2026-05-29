"""设备管理 API"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Optional
import random

from app.database import get_db
from app.models.device import Device, DevicePool, Agent, ExecutionQueue
from app.models.domain import ExecutionRun, ExecutionResult
from app.schemas.device import (
    DeviceCreate, DeviceUpdate, DeviceResponse,
    DevicePoolCreate, DevicePoolUpdate, DevicePoolResponse,
    AgentCreate, AgentUpdate, AgentResponse,
    HeartbeatRequest, HeartbeatResponse,
    ExecutionQueueResponse
)

router = APIRouter()


# ==================== 设备管理 ====================
@router.get("/devices", response_model=List[DeviceResponse])
def get_devices(
    status: str = None,
    pool_id: str = None,
    agent_id: str = None,
    db: Session = Depends(get_db)
):
    """获取设备列表"""
    query = db.query(Device)
    if status:
        query = query.filter(Device.status == status)
    if pool_id:
        query = query.filter(Device.pool_id == pool_id)
    if agent_id:
        query = query.filter(Device.agent_id == agent_id)
    return query.order_by(Device.created_at.desc()).all()


@router.post("/devices", response_model=DeviceResponse)
def create_device(device: DeviceCreate, db: Session = Depends(get_db)):
    """创建设备"""
    # 检查 device_id 是否已存在
    existing = db.query(Device).filter(Device.device_id == device.device_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Device with this device_id already exists"
        )
    db_device = Device(**device.model_dump())
    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    return db_device


@router.get("/devices/{device_id}", response_model=DeviceResponse)
def get_device(device_id: str, db: Session = Depends(get_db)):
    """获取设备详情"""
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return device


@router.put("/devices/{device_id}", response_model=DeviceResponse)
def update_device(
    device_id: str, 
    device_update: DeviceUpdate, 
    db: Session = Depends(get_db)
):
    """更新设备"""
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    update_data = device_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(device, key, value)
    db.commit()
    db.refresh(device)
    return device


@router.delete("/devices/{device_id}")
def delete_device(device_id: str, db: Session = Depends(get_db)):
    """删除设备"""
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    db.delete(device)
    db.commit()
    return {"message": "Device deleted"}


# ==================== 设备池管理 ====================
@router.get("/device-pools", response_model=List[DevicePoolResponse])
def get_device_pools(db: Session = Depends(get_db)):
    """获取设备池列表"""
    return db.query(DevicePool).order_by(DevicePool.created_at.desc()).all()


@router.post("/device-pools", response_model=DevicePoolResponse)
def create_device_pool(
    pool: DevicePoolCreate, 
    db: Session = Depends(get_db)
):
    """创建设备池"""
    db_pool = DevicePool(**pool.model_dump())
    db.add(db_pool)
    db.commit()
    db.refresh(db_pool)
    return db_pool


@router.get("/device-pools/{pool_id}", response_model=DevicePoolResponse)
def get_device_pool(pool_id: str, db: Session = Depends(get_db)):
    """获取设备池详情"""
    pool = db.query(DevicePool).filter(DevicePool.id == pool_id).first()
    if not pool:
        raise HTTPException(status_code=404, detail="Device pool not found")
    return pool


# ==================== Agent 管理 ====================
@router.get("/agents", response_model=List[AgentResponse])
def get_agents(
    status: str = None,
    db: Session = Depends(get_db)
):
    """获取 Agent 列表"""
    # 动态检查超时并更新状态（心跳间隔 10 秒，超过 30 秒认为离线）
    timeout_threshold = datetime.utcnow() - timedelta(seconds=30)
    
    # 查找超时且仍标记为 online 的 agent
    expired_agents = db.query(Agent).filter(
        Agent.status == "online",
        (Agent.last_heartbeat < timeout_threshold) | (Agent.last_heartbeat.is_(None))
    ).all()
    
    for agent in expired_agents:
        agent.status = "offline"
    
    if expired_agents:
        db.commit()

    query = db.query(Agent)
    if status:
        query = query.filter(Agent.status == status)
    return query.order_by(Agent.created_at.desc()).all()


@router.post("/agents", response_model=AgentResponse)
def create_agent(agent: AgentCreate, db: Session = Depends(get_db)):
    """创建 Agent"""
    db_agent = Agent(**agent.model_dump())
    db.add(db_agent)
    db.commit()
    db.refresh(db_agent)
    return db_agent


@router.get("/agents/{agent_id}", response_model=AgentResponse)
def get_agent(agent_id: str, db: Session = Depends(get_db)):
    """获取 Agent 详情"""
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.put("/agents/{agent_id}", response_model=AgentResponse)
def update_agent(
    agent_id: str, 
    agent_update: AgentUpdate, 
    db: Session = Depends(get_db)
):
    """更新 Agent"""
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    update_data = agent_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(agent, key, value)
    db.commit()
    db.refresh(agent)
    return agent


@router.delete("/agents/{agent_id}")
def delete_agent(agent_id: str, db: Session = Depends(get_db)):
    """删除 Agent"""
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    db.delete(agent)
    db.commit()
    return {"message": "Agent deleted"}


@router.post("/agents/{agent_id}/heartbeat", response_model=HeartbeatResponse)
def agent_heartbeat(
    agent_id: str,
    heartbeat: HeartbeatRequest,
    db: Session = Depends(get_db)
):
    """Agent 心跳上报"""
    # 查找是否有同名 Agent
    agent = db.query(Agent).filter(Agent.name == heartbeat.agent_name).first()
    
    if not agent:
        # 如果没有找到，自动创建新 Agent
        if heartbeat.agent_name:
            agent = Agent(
                name=heartbeat.agent_name,
                status=heartbeat.status
            )
            db.add(agent)
            db.commit()
            db.refresh(agent)
        else:
            raise HTTPException(status_code=404, detail="Agent not found")
    
    # 更新 Agent 状态
    agent.status = heartbeat.status
    agent.last_heartbeat = datetime.utcnow()
    if heartbeat.health_score is not None:
        agent.health_score = heartbeat.health_score
    if heartbeat.cpu_cores:
        agent.cpu_cores = heartbeat.cpu_cores
    if heartbeat.memory:
        agent.memory = heartbeat.memory
    if heartbeat.disk_space:
        agent.disk_space = heartbeat.disk_space
    
    # 处理设备信息
    if heartbeat.devices:
        for device_data in heartbeat.devices:
            device_uid = device_data.get("device_id")
            if device_uid:
                # 查找或创建设备
                device = db.query(Device).filter(Device.device_id == device_uid).first()
                if device:
                    device.agent_id = agent.id
                    device.status = device_data.get("status", "online")
                    device.last_heartbeat = datetime.utcnow()
                    # 更新设备信息
                    if device_data.get("name"):
                        device.name = device_data.get("name")
                    if device_data.get("device_type"):
                        device.device_type = device_data.get("device_type")
                else:
                    # 创建设备
                    new_device = Device(
                        device_id=device_uid,
                        name=device_data.get("name", device_uid),
                        device_type=device_data.get("device_type", "unknown"),
                        agent_id=agent.id,
                        status=device_data.get("status", "online"),
                        last_heartbeat=datetime.utcnow()
                    )
                    db.add(new_device)
    
    db.commit()
    
    # 获取待执行任务 - 分配给该 Agent 的任务
    pending_tasks = db.query(ExecutionQueue).filter(
        ExecutionQueue.status == "pending",
        (
            (ExecutionQueue.agent_id == agent.id) |
            (ExecutionQueue.agent_id.is_(None))  # 随机调度的任务
        )
    ).order_by(ExecutionQueue.priority.desc(), ExecutionQueue.queued_at.asc()).limit(5).all()
    
    tasks = []
    for task in pending_tasks:
        # 如果是随机调度的任务，现在分配给这个 Agent
        if not task.agent_id:
            task.agent_id = agent.id
            # 如果任务没有指定设备，选择该 Agent 的一个在线设备
            if not task.device_id:
                online_devices = [d for d in agent.devices if d.status == "online"]
                if online_devices:
                    task.device_id = online_devices[0].id
            db.commit()
        
        tasks.append({
            "task_id": task.id,
            "run_id": task.run_id,
            "device_id": task.device_id,
            "config": task.config or {}
        })
    
    return HeartbeatResponse(
        status="ok",
        agent_id=agent.id,
        tasks=tasks
    )


# ==================== 执行队列 ====================
@router.get("/execution-queue", response_model=List[ExecutionQueueResponse])
def get_execution_queue(
    status: str = None,
    agent_id: str = None,
    db: Session = Depends(get_db)
):
    """获取执行队列"""
    query = db.query(ExecutionQueue)
    if status:
        query = query.filter(ExecutionQueue.status == status)
    if agent_id:
        query = query.filter(ExecutionQueue.agent_id == agent_id)
    return query.order_by(
        ExecutionQueue.priority.desc(), 
        ExecutionQueue.queued_at.asc()
    ).all()


@router.post("/execution-queue/enqueue")
def enqueue_execution(
    run_id: str,
    device_id: Optional[str] = Query(None),
    agent_id: Optional[str] = Query(None),
    priority: int = 0,
    db: Session = Depends(get_db)
):
    """将执行加入队列
    
    Args:
        run_id: 执行ID
        device_id: 指定设备（可选）
        agent_id: 指定 Agent（可选，不指定则随机调度）
        priority: 优先级
    """
    # 检查 run 是否存在
    run = db.query(ExecutionRun).filter(ExecutionRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Execution run not found")
    
    # 如果指定了 Agent，检查 Agent 是否存在且在线
    if agent_id:
        agent = db.query(Agent).filter(Agent.id == agent_id).first()
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        if agent.status != "online":
            raise HTTPException(status_code=400, detail="Agent is not online")
    
    # 如果指定了设备，检查设备是否存在且在线
    if device_id:
        device = db.query(Device).filter(Device.id == device_id).first()
        if not device:
            raise HTTPException(status_code=404, detail="Device not found")
        if device.status != "online":
            raise HTTPException(status_code=400, detail="Device is not online")
    
    # 创建队列项
    queue_item = ExecutionQueue(
        run_id=run_id,
        device_id=device_id,
        agent_id=agent_id,
        status="pending",
        priority=priority
    )
    db.add(queue_item)
    db.commit()
    db.refresh(queue_item)
    
    return {"queue_id": queue_item.id, "message": "Execution queued"}


@router.post("/execution-queue/batch-enqueue")
def batch_enqueue_execution(
    run_id: str,
    priority: int = 0,
    random_schedule: bool = True,
    db: Session = Depends(get_db)
):
    """批量将执行加入队列（在所有在线 Agent 上调度）
    
    Args:
        run_id: 执行ID
        priority: 优先级
        random_schedule: 是否随机选择一个 Agent，还是分配给所有 Agent
    """
    # 检查 run 是否存在
    run = db.query(ExecutionRun).filter(ExecutionRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Execution run not found")
    
    # 获取所有在线的 Agent
    online_agents = db.query(Agent).filter(Agent.status == "online").all()
    
    if not online_agents:
        raise HTTPException(status_code=400, detail="No online agents available")
    
    queue_items = []
    
    if random_schedule:
        # 随机选择一个 Agent
        selected_agent = random.choice(online_agents)
        queue_item = ExecutionQueue(
            run_id=run_id,
            agent_id=selected_agent.id,
            status="pending",
            priority=priority
        )
        db.add(queue_item)
        queue_items.append(queue_item)
    else:
        # 分配给所有在线 Agent
        for agent in online_agents:
            queue_item = ExecutionQueue(
                run_id=run_id,
                agent_id=agent.id,
                status="pending",
                priority=priority
            )
            db.add(queue_item)
            queue_items.append(queue_item)
    
    db.commit()
    
    return {
        "queue_ids": [item.id for item in queue_items],
        "message": f"Execution queued to {len(queue_items)} agent(s)"
    }


@router.post("/execution-queue/{queue_id}/start")
def start_queue_item(queue_id: str, db: Session = Depends(get_db)):
    """开始执行队列项"""
    item = db.query(ExecutionQueue).filter(ExecutionQueue.id == queue_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Queue item not found")
    
    item.status = "running"
    item.started_at = datetime.utcnow()
    
    # 同时也更新 Run 的状态
    run = db.query(ExecutionRun).filter(ExecutionRun.id == item.run_id).first()
    if run:
        run.status = "running"
        
        # 将 ExecutionResult 状态也更新为 running
        results = db.query(ExecutionResult).filter(ExecutionResult.run_id == run.id).all()
        for res in results:
            if res.status == "pending":
                res.status = "running"
                
    db.commit()
    return {"message": "Execution started"}


from pydantic import BaseModel

class QueueCompleteRequest(BaseModel):
    success: bool
    result: Optional[str] = None
    error_message: Optional[str] = None
    html_report: Optional[str] = None

class QueueLogRequest(BaseModel):
    log: str

@router.post("/execution-queue/{queue_id}/log")
def append_queue_log(queue_id: str, data: QueueLogRequest, db: Session = Depends(get_db)):
    """追加执行日志"""
    item = db.query(ExecutionQueue).filter(ExecutionQueue.id == queue_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Queue item not found")
    
    if not item.result:
        item.result = data.log
    else:
        item.result += data.log
        
    run = db.query(ExecutionRun).filter(ExecutionRun.id == item.run_id).first()
    if run:
        results = db.query(ExecutionResult).filter(ExecutionResult.run_id == run.id).all()
        for res in results:
            res.log_url = item.result
                
    db.commit()
    return {"message": "Log appended"}

@router.post("/execution-queue/{queue_id}/complete")
def complete_queue_item(queue_id: str, data: QueueCompleteRequest, db: Session = Depends(get_db)):
    """完成执行队列项"""
    item = db.query(ExecutionQueue).filter(ExecutionQueue.id == queue_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Queue item not found")
    
    item.status = "completed" if data.success else "failed"
    item.completed_at = datetime.utcnow()
    # 只有当 data.result 不为空时才覆盖，防止清空增量日志
    if data.result:
        item.result = data.result
    item.error_message = data.error_message
    
    # 同时也更新 Run 的状态
    run = db.query(ExecutionRun).filter(ExecutionRun.id == item.run_id).first()
    if run:
        run.status = "completed" if data.success else "failed"
        
        # 更新所有的 result 状态和最终日志
        results = db.query(ExecutionResult).filter(ExecutionResult.run_id == run.id).all()
        for res in results:
            res.status = "passed" if data.success else "failed"
            res.error_message = data.error_message
            if data.html_report:
                res.html_report = data.html_report
            # 使用最新的 queue item result 更新
            if item.result:
                res.log_url = item.result
            res.end_time = datetime.utcnow().isoformat()
        
    db.commit()
    return {"message": "Execution completed"}
