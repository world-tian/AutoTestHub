"""设备管理数据模型"""
from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.domain import Base, generate_uuid


class Device(Base):
    """设备信息"""
    __tablename__ = "devices"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)  # 设备名称
    device_type = Column(String, nullable=False)  # 设备类型：android, serial, relay, other
    device_id = Column(String, nullable=False, unique=True)  # 设备唯一标识
    
    # 设备元信息
    manufacturer = Column(String, nullable=True)  # 制造商
    model = Column(String, nullable=True)  # 型号
    os_version = Column(String, nullable=True)  # 系统版本
    ip_address = Column(String, nullable=True)  # IP地址
    
    # 状态信息
    status = Column(String, default="offline")  # online, offline, busy, error
    health_score = Column(Integer, default=100)  # 健康度评分
    
    # Agent信息
    agent_id = Column(String, ForeignKey("agents.id"), nullable=True)
    agent = relationship("Agent", back_populates="devices")
    
    # 设备池信息
    pool_id = Column(String, ForeignKey("device_pools.id"), nullable=True)
    pool = relationship("DevicePool", back_populates="devices")
    
    # 标签
    tags = Column(JSON, default=list)
    capabilities = Column(JSON, default=list)  # 设备能力：adb, serial, etc.
    
    # 时间
    last_heartbeat = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class DevicePool(Base):
    """设备池"""
    __tablename__ = "device_pools"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    
    # 标签
    tags = Column(JSON, default=list)
    
    # 设备关系
    devices = relationship("Device", back_populates="pool")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Agent(Base):
    """执行 Agent"""
    __tablename__ = "agents"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    
    # Agent 信息
    host = Column(String, nullable=True)  # 主机地址
    port = Column(Integer, nullable=True)  # 端口
    os = Column(String, nullable=True)  # 操作系统
    cpu_cores = Column(Integer, nullable=True)  # CPU 核数
    memory = Column(String, nullable=True)  # 内存
    disk_space = Column(String, nullable=True)  # 磁盘空间
    
    # 状态
    status = Column(String, default="offline")  # online, offline, busy, error
    health_score = Column(Integer, default=100)
    
    # 版本信息
    version = Column(String, nullable=True)
    
    # 标签
    tags = Column(JSON, default=list)
    
    # 设备关系
    devices = relationship("Device", back_populates="agent")
    
    last_heartbeat = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ExecutionQueue(Base):
    """执行任务队列"""
    __tablename__ = "execution_queue"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    run_id = Column(String, ForeignKey("execution_runs.id"), nullable=True)
    run = relationship("ExecutionRun", backref="queue_items")
    
    # 设备分配
    device_id = Column(String, ForeignKey("devices.id"), nullable=True)
    device = relationship("Device")
    
    agent_id = Column(String, ForeignKey("agents.id"), nullable=True)
    agent = relationship("Agent")
    
    # 任务信息
    status = Column(String, default="pending")  # pending, queued, running, completed, failed, cancelled
    priority = Column(Integer, default=0)  # 优先级，越大越高
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    config = Column(JSON, nullable=True)  # 任务配置信息，如 working_dir, test_command
    
    # 时间
    queued_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # 结果
    result = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
