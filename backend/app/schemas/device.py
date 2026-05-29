"""设备管理 Schema"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class DeviceBase(BaseModel):
    name: str = Field(..., description="设备名称")
    device_type: str = Field(..., description="设备类型")
    device_id: str = Field(..., description="设备唯一标识")


class DeviceCreate(DeviceBase):
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    os_version: Optional[str] = None
    ip_address: Optional[str] = None
    tags: Optional[List[str]] = []
    capabilities: Optional[List[str]] = []
    pool_id: Optional[str] = None


class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    health_score: Optional[int] = None
    tags: Optional[List[str]] = None
    capabilities: Optional[List[str]] = None
    pool_id: Optional[str] = None


class DeviceResponse(DeviceBase):
    id: str
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    os_version: Optional[str] = None
    ip_address: Optional[str] = None
    status: str
    health_score: int
    agent_id: Optional[str] = None
    pool_id: Optional[str] = None
    tags: List[str] = []
    capabilities: List[str] = []
    last_heartbeat: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class DevicePoolBase(BaseModel):
    name: str = Field(..., description="设备池名称")
    description: Optional[str] = None


class DevicePoolCreate(DevicePoolBase):
    tags: Optional[List[str]] = []


class DevicePoolUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None


class DevicePoolResponse(DevicePoolBase):
    id: str
    tags: List[str] = []
    created_at: datetime
    updated_at: datetime
    devices: List[DeviceResponse] = []
    
    class Config:
        from_attributes = True


class AgentBase(BaseModel):
    name: str = Field(..., description="Agent 名称")


class AgentCreate(AgentBase):
    description: Optional[str] = None
    host: Optional[str] = None
    port: Optional[int] = None
    tags: Optional[List[str]] = []


class AgentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    health_score: Optional[int] = None
    tags: Optional[List[str]] = None


class AgentResponse(AgentBase):
    id: str
    description: Optional[str] = None
    host: Optional[str] = None
    port: Optional[int] = None
    os: Optional[str] = None
    cpu_cores: Optional[int] = None
    memory: Optional[str] = None
    disk_space: Optional[str] = None
    status: str
    health_score: int
    version: Optional[str] = None
    tags: List[str] = []
    last_heartbeat: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    devices: List[DeviceResponse] = []
    
    class Config:
        from_attributes = True


class HeartbeatRequest(BaseModel):
    """心跳请求"""
    agent_id: Optional[str] = None
    agent_name: Optional[str] = None
    status: str
    health_score: Optional[int] = None
    cpu_cores: Optional[int] = None
    memory: Optional[str] = None
    disk_space: Optional[str] = None
    devices: Optional[List[Dict[str, Any]]] = []


class HeartbeatResponse(BaseModel):
    """心跳响应"""
    status: str
    agent_id: Optional[str] = None
    tasks: List[Dict[str, Any]] = []


class ExecutionQueueResponse(BaseModel):
    id: str
    run_id: Optional[str] = None
    device_id: Optional[str] = None
    status: str
    priority: int
    retry_count: int
    max_retries: int
    queued_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    result: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True
