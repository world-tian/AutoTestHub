# AutoTestHub Agent 使用指南

## 概述

AutoTestHub Agent 是部署在本地设备上的执行节点，负责与 AutoTestHub 云端通信，接收并执行测试任务。

## 架构

```
AutoTestHub (云端)
      ↕ (HTTP API)
  Agent (本地)
      ↕
  本地设备 (Android/串口等)
```

## 快速开始

### 前置要求

- Python 3.8+
- AutoTestRunner 环境已配置

### 安装依赖

```bash
cd /path/to/AutoTestRunner
pip install -e .
pip install psutil requests  # Agent 需要的额外依赖
```

### 启动 Agent

```bash
# 方式 1: 基本启动
python -m autotest_runner.agent.agent --server http://your-autotest-hub:8000 --name "My-Agent"

# 方式 2: 自定义参数
python -m autotest_runner.agent.agent \
  --server http://localhost:8000 \
  --name "Lab-Agent-01" \
  --interval 10

# 方式 3: 使用环境变量
export AUTOTEST_SERVER=http://your-autotest-hub:8000
export AGENT_TAGS=lab,ios,android
python -m autotest_runner.agent.agent --name "Lab-Agent-01"
```

### 命令行参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--server` | AutoTestHub 服务地址 | `http://localhost:8000` |
| `--name` | Agent 名称 | `Agent-{hostname}` |
| `--interval` | 心跳间隔（秒） | 10 |
| `--tags` | Agent 标签（逗号分隔） | - |

## Agent 功能

### 1. 自动设备发现

Agent 会自动发现并报告以下类型的设备：

- **Android 设备** - 通过 ADB 发现
- **串口设备** - 通过串口库发现

### 2. 系统资源监控

Agent 会持续上报系统资源信息：

- CPU 使用率
- 内存使用情况
- 磁盘空间
- 操作系统信息

### 3. 任务执行

- 从云端接收任务
- 在本地设备上执行测试
- 报告执行结果

## 任务调度方式

### 1. 指定 Agent 调度

在 AutoTestHub 中可以显式指定某个 Agent 执行任务：

```python
# 通过 API
POST /api/execution-queue/enqueue?run_id=xxx&agent_id=xxx
```

### 2. 随机调度（负载均衡）

不指定 Agent，任务会分配给第一个可用的 Agent：

```python
POST /api/execution-queue/enqueue?run_id=xxx
```

### 3. 批量调度

可以同时将任务调度到所有在线 Agent：

```python
POST /api/execution-queue/batch-enqueue?run_id=xxx&random_schedule=false
```

或者随机选择一个 Agent：

```python
POST /api/execution-queue/batch-enqueue?run_id=xxx&random_schedule=true
```

## Agent 管理界面

在 AutoTestHub 前端中，可以通过「Agent 管理」页面：

1. 查看所有 Agent 状态
2. 查看 Agent 详细信息
3. 查看 Agent 连接的设备
4. 查看 Agent 执行的任务历史

### Agent 状态说明

| 状态 | 图标 | 说明 |
|------|------|------|
| online | ✅ 绿色 | Agent 正常在线 |
| busy | ⚠️ 黄色 | Agent 正在执行任务 |
| offline | ⏸️ 灰色 | Agent 断开连接 |

### 健康度评分

Agent 健康度评分（0-100）基于：
- 系统资源使用情况
- 设备连接状态
- 任务执行成功率

## 最佳实践

### 1. Agent 部署

- 将 Agent 部署在测试设备所在的同一台机器上
- 使用稳定的网络连接 AutoTestHub
- 设置合理的心跳间隔（通常 5-30 秒）

### 2. Agent 命名

使用清晰的命名规范，例如：
- `Lab-Android-01`（实验室 Android 测试机 1）
- `CI-Serial-02`（CI 环境串口设备 2）

### 3. 标签管理

使用标签分类 Agent：
- 设备类型：`android`, `ios`, `serial`
- 环境：`lab`, `ci`, `production`
- 功能：`regression`, `smoke`

## 与 Jenkins 方案对比

| 特性 | Jenkins | AutoTestHub Agent |
|------|---------|------------------|
| 设备管理 | 需要手动配置 | 自动发现和注册 |
| 任务调度 | 需要 Pipeline 配置 | 灵活的调度策略 |
| 资源监控 | 需要安装插件 | 内置实时监控 |
| 报告整合 | 需要额外配置 | 自动整合到平台 |
| AI 能力 | 无 | 深度集成 |

## 迁移指南

### 从 Jenkins 迁移

1. **保留 Jenkins 为备份** - 在迁移期间两个系统可以并存
2. **逐步迁移任务** - 先迁移非核心任务
3. **对比结果** - 两个系统并行执行相同任务，确保结果一致
4. **完全迁移** - 确认无误后完全切换到 AutoTestHub

## 常见问题

### Q: Agent 无法连接到 AutoTestHub

A: 检查以下几点：
- 网络连接是否正常
- 服务地址是否正确
- 防火墙是否阻止连接

### Q: 设备没有被发现

A:
- 对于 Android，检查 ADB 是否正常：`adb devices`
- 对于串口，检查设备权限
- 查看 Agent 日志获取详细错误

### Q: 任务没有分配到指定的 Agent

A:
- 确认 Agent 状态为 online
- 确认 Agent 有对应的设备
- 查看执行队列状态

## 故障排查

### 查看 Agent 日志

Agent 会输出详细的运行日志：

```
INFO: AutoTest Agent initialized: My-Agent
INFO:   Server: http://localhost:8000
INFO: Agent registered successfully, agent_id: xxx
INFO: Starting AutoTest Agent...
```

### 重启 Agent

```bash
# 停止 Agent (Ctrl+C)
# 重新启动
python -m autotest_runner.agent.agent --server ... --name ...
```

## 下一步

- 配置 AI 服务以获得更好的测试用例生成
- 配置通知以便及时发现问题
- 创建测试项目和需求开始使用
