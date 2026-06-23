# AutoTestHub

AutoTestHub 是一个面向智能硬件与全栈测试的 AI 自动化测试管理平台。

支持多种 AI 模型服务提供商，包含项目管理、需求管理、测试用例生成与管理、测试执行记录、AI 助手等完整功能。

## 功能特性

### 核心功能
- **项目管理**：创建和管理测试项目
- **需求管理**：管理测试需求，支持 AI 一键生成测试用例
- **测试用例**：支持手工和自动化两种用例类型，完整的状态管理（候选→采纳→启用）
- **测试执行**：创建执行记录，管理执行结果
- **AI 助手**：内置 AI 对话助手，提供测试相关帮助
- **配置中心**：灵活的 AI 模型配置，支持多种服务提供商

### 支持的 AI 服务提供商
- Mock（本地测试用，无需真实 API）
- OpenAI（GPT 系列）
- Anthropic Claude
- 阿里云通义千问
- 百度文心一言
- DeepSeek
- Kimi（月之暗面）

## 快速启动

### 前置条件
- Python 3.9+
- Node.js 18+

### 1. 启动后端服务

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m app.seed
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

后端服务将在 http://localhost:8000 启动

### 2. 启动前端服务

```bash
cd frontend
npm install
npm run dev
```

前端服务将在 http://localhost:5173 或可用端口启动

## 默认账号
- 用户名：`admin`
- 密码：`AutoTestHub@123`

## 使用指南

### 完整工作流程
1. **登录**：使用默认账号登录系统
2. **创建项目**：进入项目管理，创建测试项目
3. **添加需求**：在项目详情页添加测试需求
4. **AI 生成用例**：对需求点击「AI生成用例」，系统会自动生成候选测试用例
5. **管理用例**：查看和采纳/启用测试用例
6. **创建执行**：创建测试执行记录
7. **查看报告**：查看执行结果和分析报告

### 配置 AI 服务
1. 点击左侧菜单「系统设置」
2. 选择 AI 服务提供商
3. 填写 API Key（可选配置自定义 Base URL 和模型名称）
4. 点击「保存配置」

### AI 助手使用
1. 点击左侧菜单「AI 助手」
2. 选择快速问题或直接输入问题
3. 与 AI 对话获取测试相关帮助

## 项目结构

```
AutoTestHub/
├── backend/          # 后端代码
│   ├── app/
│   │   ├── api/     # API 接口
│   │   ├── models/  # 数据库模型
│   │   ├── schemas/ # 数据验证
│   │   ├── services/ # 业务逻辑（AI 服务）
│   │   └── core/    # 核心配置
│   └── requirements.txt
├── frontend/         # 前端代码
│   ├── src/
│   │   ├── pages/   # 页面组件
│   │   └── api/     # API 封装
│   └── package.json
├── doc/             # 设计文档
└── README.md
```

## 技术栈

### 后端
- FastAPI
- SQLAlchemy
- SQLite
- httpx（HTTP 客户端）

### 前端
- React 18
- TypeScript
- Vite
- Ant Design
- Axios

## 本地开发说明

### 后端 API 文档
后端启动后，访问 http://localhost:8000/docs 查看 Swagger API 文档

### 数据库初始化
首次运行前需要执行：
```bash
cd backend
source venv/bin/activate
python -m app.seed
python -m app.migrate_config
```

