# Gitlab CI&CD

> AutoTestHub 接入自建 GitLab（`gitlab.deeplore.cc` / `120.79.207.52`）的 CI/CD 搭建总结。
> 记录每个配置环节，便于后续单独配置 Runner、或重配仓库触发一条合理的 CI/CD 流程。

---

## 一、当前状态

| 环节 | 状态 | 说明 |
|------|------|------|
| 代码托管（SSH） | ✅ | 已推送到 `liutong/autotesthub` |
| `.gitlab-ci.yml` | ✅ | 每次 push master 自动触发流水线 |
| Windows Runner | ✅ 跑通 | shell executor + powershell |
| WSL Runner | ✅ 跑通 | shell executor + bash（编译 + 部署） |
| Docker 部署到服务器 | ✅ 已完成 | 方案 B：WSL Runner SSH 推文件 + 远程 docker compose |
| 双 Runner 标签路由 | ✅ 已配置 | WSL: `tags: [wsl]`，构建与部署均路由到 WSL Runner |

---

## 二、整体架构

```
开发者 push → GitLab (120.79.207.52)
                    │
                    │ 调度流水线
                    ▼
            WSL Runner（本地 Windows 机）
            ┌───────────────────────────────────┐
            │  Stage 1: build                   │
            │  ├── backend-compile (python3)    │
            │  └── frontend-build (npm build)   │
            │        └── artifact: frontend/dist│
            │                                   │
            │  Stage 2: deploy (仅 master)       │
            │  ├── rsync 推文件到服务器          │
            │  └── ssh → docker compose up      │
            └───────────────────────────────────┘
                                │ SSH
                                ▼
                    GitLab 服务器 (120.79.207.52)
                    ┌──────────────────────────────────────┐
                    │  /opt/autotesthub/                   │
                    │  ├── autotesthub-frontend (port 15173)│
                    │  │     nginx 托管 React dist          │
                    │  │     反代 /api → backend:8000       │
                    │  └── autotesthub-backend (内部 8000)  │
                    │        FastAPI + SQLite               │
                    │                                      │
                    │  gitlab (port 80/443/2222) ← 独立运行 │
                    └──────────────────────────────────────┘
```

**端口规划（无冲突）：**

| 服务 | 端口 | 说明 |
|------|------|------|
| GitLab | 80 / 443 / 2222 | 已有服务，不动 |
| AutoTestHub 前端 | **15173** | nginx 托管 React，对外访问 |
| AutoTestHub 后端 | 8000（仅内部） | FastAPI，由 nginx 反代，不对外暴露 |

---

## 三、仓库与代码托管

- 远程地址（SSH，免密）：
  ```
  ssh://git@gitlab.deeplore.cc:2222/liutong/autotesthub.git
  ```
- GitLab 只有 HTTP，已全局放行：`git config --global credential.allowUnsafeRemotes true`，但最终用 SSH（2222 端口）免凭据。

---

## 四、GitLab Runner 配置

> 两个 Runner 都用 **shell executor**，`.gitlab-ci.yml` 里不写 `image:`。

### 4.1 WSL Ubuntu Runner（编译 + 部署）

- 二进制：`~/gitlab-runner`（v19.1，linux-amd64）
- 配置文件：`~/gitlab-runner-config.toml`

```toml
[[runners]]
  name = "wsl-ubuntu-shell-runner"
  executor = "shell"
  shell = "bash"
  builds_dir = "/home/liutong/gitlab-builds"
  cache_dir  = "/home/liutong/gitlab-cache"
  [runners.feature_flags]
    FF_USE_NEW_BASH_EVAL_STRATEGY = false
```

- **标签**：在 GitLab UI → Settings → CI/CD → Runners → 编辑 → Tags 填 `wsl`
- 启动命令：

```bash
# WSL 终端内执行
export PATH=$HOME/node22/bin:$PATH
~/gitlab-runner run --config ~/gitlab-runner-config.toml
```

### 4.2 Windows Runner（预留，用于本地自动化测试）

- 安装位置：`C:\GitLab-Runner\gitlab-runner.exe`（v19.1）
- 配置文件 `C:\GitLab-Runner\config.toml` 关键配置：

```toml
[[runners]]
  executor = "shell"
  shell = "powershell"
  [runners.feature_flags]
    FF_DISABLE_POWERSHELL_STDIN = true  # 修复中文系统 GBK 乱码问题
```

- 启动命令：`C:\GitLab-Runner\gitlab-runner.exe run --config C:/GitLab-Runner/config.toml`

### 4.3 已解决的两个关键坑

| Runner | 现象 | 根因 | 修复 |
|--------|------|------|------|
| Windows | job 报「字符串缺少终止符」乱码失败 | 中文系统 GBK 下 stdin 管道喂 UTF-8 脚本解析坏 | config.toml 加 `FF_DISABLE_POWERSHELL_STDIN = true` |
| WSL | `prepare environment: exit status 1`（11ms 闪退） | `~/.bash_logout` 里 `clear_console -q` 无 tty 返回 1 拖垮 login shell | 清空 `~/.bash_logout` |

### 4.4 Runner 上线命令

**WSL Runner 后台常驻：**
```bash
wsl -d Ubuntu -- bash -lc 'export PATH=$HOME/node22/bin:$PATH; nohup ~/gitlab-runner run --config ~/gitlab-runner-config.toml > ~/gitlab-runner.log 2>&1 &'
```

**确认进程：**
```bash
wsl -d Ubuntu -- pgrep -af "gitlab-runner run"
```

---

## 五、当前 .gitlab-ci.yml

```yaml
stages:
  - build
  - deploy

backend-compile:
  stage: build
  tags: [wsl]
  script:
    - cd backend
    - python3 -m compileall -q app
    - echo "backend compile OK"

frontend-build:
  stage: build
  tags: [wsl]
  script:
    - cd frontend
    - npm install --no-audit --no-fund --legacy-peer-deps
    - npm run build
  artifacts:
    paths:
      - frontend/dist
    expire_in: 1 week

deploy-to-server:
  stage: deploy
  tags: [wsl]
  dependencies:
    - frontend-build
  only:
    - main
    - master
  before_script:
    - eval $(ssh-agent -s)
    - |
      if [ -f "$SSH_PRIVATE_KEY" ]; then
        chmod 400 "$SSH_PRIVATE_KEY"
        ssh-add "$SSH_PRIVATE_KEY" > /dev/null
      else
        echo "$SSH_PRIVATE_KEY" | tr -d '\r' | ssh-add - > /dev/null
      fi
    - mkdir -p ~/.ssh && chmod 700 ~/.ssh
    - ssh-keyscan -H "$DEPLOY_HOST" >> ~/.ssh/known_hosts
  script:
    - ssh $DEPLOY_USER@$DEPLOY_HOST "mkdir -p /opt/autotesthub"
    - rsync -avz --delete --exclude '.git/' --exclude 'frontend/node_modules/' --exclude 'backend/venv/' --exclude 'data/' ./ $DEPLOY_USER@$DEPLOY_HOST:/opt/autotesthub/
    - ssh $DEPLOY_USER@$DEPLOY_HOST "cd /opt/autotesthub && docker compose down --remove-orphans && docker compose up -d --build && docker compose ps"
```

**CI/CD Variables（GitLab → Settings → CI/CD → Variables）：**

| Key | 说明 | 建议设置 |
|-----|------|---------|
| `SSH_PRIVATE_KEY` | 登录 120.79.207.52 的私钥全文 | Protected + Masked |
| `DEPLOY_HOST` | `120.79.207.52` | Protected |
| `DEPLOY_USER` | `root` | Protected |

---

## 六、Docker 部署配置

### docker-compose.yml

```yaml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    volumes:
      - ./data:/app/data
    environment:
      - DATABASE_URL=sqlite:////app/data/autotesthub.db
    command: sh -c "python -m app.seed && uvicorn app.main:app --host 0.0.0.0 --port 8000"
    deploy:
      resources:
        limits:
          memory: 1G
    restart: always

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "15173:80"
    deploy:
      resources:
        limits:
          memory: 512M
    restart: always
    depends_on:
      - backend
```

### 前端 nginx 反代配置（frontend/nginx.conf）

```nginx
server {
    listen 80;
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }
    location /api {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 国内镜像加速（backend/Dockerfile）

```dockerfile
FROM python:3.11-slim

# apt 换阿里云源
RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources 2>/dev/null || \
    sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list

WORKDIR /app
COPY requirements.txt .

# pip 换阿里云源
RUN pip install --no-cache-dir -r requirements.txt \
    -i https://mirrors.aliyun.com/pypi/simple/ \
    --trusted-host mirrors.aliyun.com

COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**WSL Runner 的 npm 镜像（一次性配置）：**
```bash
npm config set registry https://registry.npmmirror.com
```

---

## 七、服务器现状（部署后）

```bash
# docker ps 输出
CONTAINER ID   IMAGE                   PORTS                      NAMES
468d5f0864dc   autotesthub-frontend    0.0.0.0:15173->80/tcp      autotesthub-frontend-1
e9c1a353cb5d   autotesthub-backend     (内部 8000)                 autotesthub-backend-1
1735cbbcc94d   gitlab/gitlab-ce        0.0.0.0:80->80/tcp ...     gitlab
```

- **应用访问地址**：`http://120.79.207.52:15173`
- GitLab 服务（80/443/2222）**完全不受影响**，独立 Docker 网络隔离

---

## 八、待办列表

### ✅ 待办 5：AutoTestHub 用 Docker 部署到 GitLab 服务器（已完成）

**实际采用：方案 B（WSL Runner SSH 部署）**

落地过程：
1. 确认服务器已有 Docker 26.1.4 + Docker Compose v2.27.1
2. 完善 `docker-compose.yml`：前端 nginx 反代 + 端口 15173 规避 GitLab 冲突
3. 完善 `frontend/nginx.conf`：`/api` 反代到 backend:8000
4. CI 加 `deploy` stage：rsync 推文件 + ssh 执行 docker compose
5. 修复 Runner tag 路由：所有 job 加 `tags: [wsl]`，GitLab UI 给 Runner 打 `wsl` 标签
6. 修复 artifact 传递：deploy job 加 `dependencies: [frontend-build]`
7. 配置国内镜像源：apt/pip 换阿里云，npm 换淘宝
8. 验证部署成功，两套服务互不干扰

---

### ⏳ 待办 1：CI 集成代码扫描 + 质量门禁

- 后端：`bandit -r app -ll`、`semgrep --config auto`
- 前端：`npm run lint`
- 新增 `scan` stage，严重问题非零退出阻断流水线

### ⏳ 待办 2：Windows Runner 跑通 autotestrunner 自动化测试

- `test` stage 加 `tags: [windows]` job
- 产出 junit/HTML 报告作为 artifacts
- 接入 GitLab 测试可视化（`reports: junit:`）

### ⏳ 待办 3：后端完整构建（非仅语法检查）

- 当前仅做 `compileall` 语法检查，未安装依赖
- 方案：WSL 建 venv 装依赖，或后端 job 改用 docker executor
- 补充 pytest 最简冒烟测试

### ⏳ 待办 4：数据隐私合规测试用例梳理

- 静态层：gitleaks/trufflehog 扫密钥，自定义规则查 PII 打印
- 用例层：数据最小化、脱敏、加密存储、删除/导出权利
- 执行时机：静态检查放 CI scan stage；合规用例放部署后

---

> 维护：本文件同时存于仓库 `doc/14-GitLab-CICD搭建与配置.md`，与飞书 wiki 同步。
> 最后更新：2026-06-24
