# Gitlab CI&CD

> AutoTestHub 接入自建 GitLab（`gitlab.deeplore.cc` / `120.79.207.52`）的 CI/CD 搭建总结。
> 记录每个配置环节，便于后续单独配置 Runner、或重配仓库触发一条合理的 CI/CD 流程。

## 一、当前状态

| 环节 | 状态 | 说明 |
|------|------|------|
| 代码托管（SSH） | ✅ | 已推送到 `liutong/autotesthub` |
| `.gitlab-ci.yml` | ✅ | 每次 push 自动触发流水线 |
| Windows Runner | ✅ 跑通 | shell executor + powershell |
| WSL Runner | ✅ 跑通 | shell executor + bash（编译服务器） |
| 双 Runner 标签路由 | ⏳ 待配 | WSL 编译 / Windows 测试 |

## 二、整体架构

- **GitLab**：自建，仅 HTTP（无 HTTPS），SSH 走 **2222** 端口；版本偏老（仍用 legacy registration token）。
- **两个 Runner，分工协作**（规划）：
  - **WSL Ubuntu Runner** —— 负责编译 / 构建（Linux 原生环境，贴合项目）。
  - **Windows Runner** —— 负责跑本地自动化测试脚本（autotestrunner）。
  - 用 **tags（标签）** 把不同 job 路由到不同 Runner。

## 三、仓库与代码托管

- 远程地址（SSH，免密）：
  ```
  ssh://git@gitlab.deeplore.cc:2222/liutong/autotesthub.git
  ```
- 关键点：
  - 该 GitLab 只有 HTTP，HTTP 推送会被 Git 凭据管理器（GCM）拦截明文；已全局放行：`git config --global credential.allowUnsafeRemotes true`。但**最终用 SSH（2222 端口）**，免凭据。
  - SSH 公钥需加到 GitLab → Preferences → SSH Keys。
  - `.gitignore` 额外忽略：`.vscode/`、`.idea/`、`backend/uploads/`、`data/`（以及默认的 `node_modules/`、`venv/`、`*.db`、`__pycache__/`、`.env`）。

## 四、GitLab Runner 安装与配置

> 两个 Runner 都用 **shell executor**（直接在主机执行，使用主机自带 python/node），因此 `.gitlab-ci.yml` 里不写 `image:`。
> 注册 token（legacy）在 GitLab → 项目 → Settings → CI/CD → Runners 里查看。

### 4.1 Windows Runner

- 安装位置：`C:\GitLab-Runner\gitlab-runner.exe`（v19.1）。
- 配置文件：`C:\GitLab-Runner\config.toml`，要点：
  ```toml
  [[runners]]
    executor = "shell"
    shell = "powershell"
    builds_dir = "C:/GitLab-Runner/builds"   # 隔离构建目录，避免污染工程
    cache_dir  = "C:/GitLab-Runner/cache"
    [runners.feature_flags]
      FF_DISABLE_POWERSHELL_STDIN = true       # 关键修复，见 4.3
  ```
- 启动（前台/调试）：
  ```
  C:\GitLab-Runner\gitlab-runner.exe run --config C:/GitLab-Runner/config.toml
  ```
- 注意：CI 脚本里用 `python`（不是 `python3`）；本机 python311 在 `D:\dev\testcode\python311`，node 在 `D:\dev\testcode\node18`。

### 4.2 WSL Ubuntu Runner（编译服务器）

- WSL 内无原生 node，已用国内镜像装到家目录（免 sudo）：
  ```bash
  curl -sSL -o node.tar.xz "https://npmmirror.com/mirrors/node/v22.11.0/node-v22.11.0-linux-x64.tar.xz"
  mkdir -p ~/node22 && tar -xJf node.tar.xz -C ~/node22 --strip-components=1
  ```
- Runner 二进制（免 sudo）：`~/gitlab-runner`（v19.1，从 S3 下载 linux-amd64）。
- 配置文件：`~/gitlab-runner-config.toml`，要点：
  ```toml
  [[runners]]
    executor = "shell"
    shell = "bash"
    builds_dir = "/home/liutong/gitlab-builds"
    cache_dir  = "/home/liutong/gitlab-cache"
  ```
- 启动（需把 node 加进 PATH，job 会继承 Runner 进程环境）：
  ```bash
  export PATH="$HOME/node22/bin:$PATH"
  ~/gitlab-runner run --config ~/gitlab-runner-config.toml
  ```
- 注意：WSL 是 Python 3.14，CI 脚本用 `python3`。后端依赖含 `bcrypt==3.2.0`/`cryptography`，在 3.14 上需编译（要 build-essential），故目前后端 job 只做 `compileall` 语法检查，不装依赖。

### 4.3 两个关键坑与修复（重要）

| Runner | 现象 | 根因 | 修复 |
|--------|------|------|------|
| Windows | job 在脚本步失败，日志报「字符串缺少终止符」乱码 | 中文系统（codepage 936/GBK）下，Runner 把 PowerShell 脚本经 **stdin 管道**喂给 powershell.exe，按 GBK 解码 UTF-8 脚本导致解析坏，`cd 项目目录`失败 | config.toml 加 `FF_DISABLE_POWERSHELL_STDIN = true`（脚本写文件再执行） |
| WSL | `prepare environment: exit status 1`（11ms，打印 "Running on host" 后失败） | Runner 直接 exec `bash -l` 使 `SHLVL=1`，login shell 退出时执行 `~/.bash_logout` 里的 `clear_console -q`，在 CI 无 tty 环境返回 1，叠加脚本的 `set -o errexit` → 整个 shell 退出 1 | 清空 `~/.bash_logout`（备份在 `~/.bash_logout.bak`） |

> WSL 这个坑用 strace 实锤：`echo→rm→rm` 全成功，最后 `clear_console -q` 返回 1 拖垮 shell。手动 `bash -l` 复现不出来，因为嵌套 shell 的 `SHLVL≥2` 会跳过 clear_console。

### 4.4 启动 / 上线 Runner

> 目前是**手动启动**，**关机 / 重启 WSL 后需要重新启**一次。job 一直 pending 多半就是对应 Runner 没在跑（GitLab UI 的绿点有几分钟滞后，不代表进程还活着）。

**WSL Runner（编译）** —— 在任意 Windows 终端（PowerShell / cmd / Git Bash）执行：
```
# 前台运行（保持该终端窗口开着别关，可看实时日志）
wsl -d Ubuntu -- bash -lc 'export PATH=$HOME/node22/bin:$PATH; exec ~/gitlab-runner run --config ~/gitlab-runner-config.toml'

# 或后台常驻（日志写到 ~/gitlab-runner.log，终端可关）
wsl -d Ubuntu -- bash -lc 'export PATH=$HOME/node22/bin:$PATH; nohup ~/gitlab-runner run --config ~/gitlab-runner-config.toml > ~/gitlab-runner.log 2>&1 &'
```

**Windows Runner（测试）** —— 在 PowerShell / cmd 执行：
```
C:\GitLab-Runner\gitlab-runner.exe run --config C:/GitLab-Runner/config.toml
```

**确认 / 排查：**
```
# WSL runner 进程是否在跑
wsl -d Ubuntu -- pgrep -af "gitlab-runner run"
# Windows runner 进程是否在跑（PowerShell）
Get-Process gitlab-runner
```

> 长期免手动：WSL 可装成 systemd 服务、Windows 可用 `gitlab-runner install` 装成系统服务实现开机自启（后续按需配置）。

## 五、当前 .gitlab-ci.yml

```yaml
stages:
  - build

backend-compile:
  stage: build
  script:
    - cd backend
    - python3 -m compileall -q app      # Windows 上改成 python
    - echo "backend compile OK"

frontend-build:
  stage: build
  script:
    - cd frontend
    - npm install --no-audit --no-fund --legacy-peer-deps
    - npm run build
  artifacts:
    paths:
      - frontend/dist
    expire_in: 1 week
```

## 六、双 Runner 标签路由（如何单独配置 Runner）

目标：编译 job 走 WSL，测试 job 走 Windows。两步：

**第 1 步：给 Runner 打标签**（二选一）
- 方式 A（重新注册）：
  ```bash
  # WSL
  ~/gitlab-runner register --non-interactive --config ~/gitlab-runner-config.toml \
    --url "http://gitlab.deeplore.cc/" --registration-token "<TOKEN>" \
    --executor shell --shell bash --tag-list "wsl,build" --run-untagged=false
  ```
  Windows 同理，`--tag-list "windows,test"`。
- 方式 B（GitLab UI）：Settings → CI/CD → Runners → 编辑各 Runner → 填 Tags。

**第 2 步：job 指定 tags**
```yaml
compile-backend:
  stage: build
  tags: [wsl]          # → 只在 WSL Runner 跑
  script:
    - cd backend && python3 -m compileall -q app

test-windows:
  stage: test
  tags: [windows]      # → 只在 Windows Runner 跑
  script:
    - echo "run autotestrunner here"
```

## 七、如何触发与验证

- 触发：向 `master` push 即自动触发；或 GitLab UI「Run pipeline」。
- 查看：`http://gitlab.deeplore.cc/liutong/autotesthub/-/pipelines`。
- Runner 在线但 job 一直 pending → 多半是 tags 不匹配，或 Runner 未开启「Run untagged jobs」。

## 八、后续待办（含实现方式）

### 待办 1：CI 集成代码扫描工具 + 质量门禁
- **方案**：
  - GitLab 自带 **SAST**（`include: template: Security/SAST.gitlab-ci.yml`）——老版本可能无该模板，则用 **SonarQube/SonarScanner** 或开源工具（后端 `bandit`/`semgrep`，前端 `eslint`）。
  - 质量门禁：扫描 job 失败即阻断流水线（不要 `allow_failure`）；SonarQube 用 Quality Gate webhook 卡 MR。
- **落地步骤**：新增 `scan` stage；后端 `bandit -r app -ll`、`semgrep --config auto`；前端 `npm run lint`；严重问题非零退出阻断。

### 待办 2：Windows Runner 跑通 autotestrunner 自动化测试脚本
- **方案**：在 `test` stage 加 `tags: [windows]` 的 job，调用 autotestrunner 脚本。
- **落地步骤**：确认脚本入口与依赖（python 包、被测服务是否需先起）；CI 里先装依赖再执行；产出 junit/HTML 报告作为 `artifacts`，并用 `reports: junit:` 接入 GitLab 测试可视化。

### 待办 3：完善编译内容并在 WSL 跑起来
- **方案**：后端从「仅 compileall」升级为真实可运行的构建：在 WSL 装可编译的 Python 环境（`sudo apt install python3-venv build-essential` 后建 venv 装依赖），或后端 job 改用 docker executor 用 `python:3.11` 镜像。前端 `npm run build` 已通，产物 `frontend/dist` 作为 artifacts 传递给部署。
- **落地步骤**：确定 Python 版本策略（venv vs docker）；补 `requirements` 安装与最简 `pytest`；编译产物归档。

### 待办 4：数据隐私合规测试用例梳理 + CI/部署后检查
- **方案**：
  - 静态层：扫描代码/配置中的敏感信息（`gitleaks`/`trufflehog` 查密钥；自定义规则查个人信息字段、日志打印 PII）。
  - 用例层：梳理隐私合规用例（数据最小化、脱敏、加密存储、删除/导出权利、Cookie/授权），编写自动化用例。
  - 执行时机：静态检查放 CI 的 `scan` stage；功能性合规用例放部署后（针对运行环境）跑。
- **落地步骤**：先产出「隐私合规检查清单」→ 拆成静态规则 + 自动化用例 → 分别接入 CI（扫描）与部署后（接口/E2E 测试）。

### 待办 5：AutoTestHub 用 Docker 部署到 GitLab 服务器
> 目标：把后端(FastAPI)+前端(React) 以 Docker 跑在 GitLab 这台服务器（`120.79.207.52`）上，并由 CI 的 `deploy` 阶段自动发布。

- **方案对比**：
  - **方案 A（推荐）：在服务器上再装一个 GitLab Runner**（docker executor 或 shell+docker），`deploy` job 打标签 `tags: [deploy]` 落到该 Runner，直接在服务器本地 `docker compose up -d --build`。无需镜像仓库、无需跨机 SSH 配密钥，最省心。
  - 方案 B：现有 Runner 通过 **SSH** 连服务器执行 `git pull && docker compose up -d --build`；需要把服务器 SSH 私钥放进 GitLab CI/CD Variables（masked/protected）。
  - 方案 C：CI 构建镜像 push 到 **GitLab Container Registry**，服务器 `docker compose pull`；需该 GitLab 实例启用了 Registry（老实例可能未开）。
- **必须先补：生产用 Docker 配置**（现有 `docker-compose.yml` 是开发模式：vite dev + uvicorn --reload，不能直接上生产）：
  - 新增 `compose.prod.yml`：后端 `uvicorn`（去掉 `--reload`）；前端改为**多阶段构建**（`npm run build` 产出 `dist`，再用 `nginx` 镜像托管静态文件并反代 `/api` 到后端）。
  - 用 `.env`/CI Variables 注入 `SECRET_KEY`、`AI_*` 等，不写进镜像。
  - 数据持久化：SQLite 库文件用 volume 挂载（或后续换 Postgres）。
- **落地步骤**：
  1. 确认前置条件（见下）。
  2. 写 `compose.prod.yml` + 前端生产 `Dockerfile`(多阶段 + nginx) + `nginx.conf`。
  3. 服务器装 Runner 并打标签 `deploy`（方案 A）。
  4. CI 加 `deploy` stage：`tags:[deploy]`，`script: docker compose -f compose.prod.yml up -d --build`；可设 `when: manual` 或仅 `master` 触发。
  5. 配端口与访问（如后端 8000、前端 80/自定端口），验证线上可访问。
- **需要你确认的前置条件**：
  - 服务器是否已装 **Docker + docker compose**？当前登录用户能否免 sudo 跑 docker？
  - 是否能拿到服务器的 **SSH 登录**（用户/端口/密钥）用于装 Runner 或方案 B？
  - 对外暴露的**端口**与访问域名/IP 规划？是否要跟现有 GitLab 的端口错开。
  - 该 GitLab 是否启用了 **Container Registry**（决定能否用方案 C）。

---

> 维护：本文件同时存于仓库 `doc/14-GitLab-CICD搭建与配置.md`，与飞书 wiki 同步。
