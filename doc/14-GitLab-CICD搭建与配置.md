# Gitlab CI&CD

> AutoTestHub 接入自建 GitLab（`gitlab.deeplore.cc` / `120.79.207.52`）的 CI/CD 搭建总结。
> 记录每个配置环节，便于后续单独配置 Runner、或重配仓库触发一条合理的 CI/CD 流程。

---

## 一、当前状态

| 环节 | 状态 | 说明 |
|------|------|------|
| 代码托管（SSH） | ✅ | `ssh://git@gitlab.deeplore.cc:2222/liutong/autotesthub.git` |
| 分支策略 | ✅ | master（集成）+ release（每周发布）+ 短期 feature/*；MR 驱动 |
| WSL Runner | ✅ | shell+bash，`tags:[wsl]`：扫描/编译/本地&线上部署/接口测试/上报 |
| Windows Runner | ✅ | shell+powershell，`tags:[windows]`：单元测试/autotestrunner |
| 代码扫描 + 门禁 | ✅ | bandit（后端·MEDIUM+ 阻断）+ tsc（前端·informational） |
| 单元测试 + 覆盖率 | ✅ | pytest + pytest-cov，覆盖率显示在 MR |
| MR 预合并编译 | ✅ | MR 流水线先合 master 再编译测试（贴近 EE Merged Results） |
| 本地部署 + 测试 | ✅ | MR/master：WSL docker 隔离实例（autotesthub-ci:15373）+ 接口冒烟 |
| 线上部署 | ✅ | release 分支：rsync+ssh → 服务器 docker compose（15173） |
| 结果上传云端 | ✅ | 汇总 POST 到 `/api/report-records`，`/reports` 页展示 |
| 飞书通知 | ✅ | 飞书应用给**提 PR 的人**发私信（编译/部署/测试结果） |

> **GitLab 是 CE 社区版**：Merged Results Pipeline、Required Approvals 是 Premium 功能，CE 没有。
> 用「Pipelines must succeed + 保护分支 + 预合并编译」达到等效门禁，见第八节。

---

## 二、分支策略与流水线流程

**分支模型（2 条长期分支 + 短期 feature 分支，不需要 dev）：**

```
feature/* --MR--> master   ：scan→unit-test(+覆盖率)→build→deploy(本地WSL docker)→test
                             全绿 → MR 显示 ✅ → 测过 + owner 才能合入
master  --(合入后)          ：同上全流程做回归（部署本地 CI 实例，不碰线上）
release/* --(每周从 master 拉)：build→deploy(线上120.79.207.52)→test，给出报告
dev     --(可选，未启用)     ：scan→unit-test→build 快速反馈（rules 已预留，建了即生效）
```

**流水线 5 个 stage（+ .post 收尾）：**

| stage | 场景 | 作业 | 节点 |
|-------|------|------|------|
| scan | MR/master/dev | sast-bandit、typecheck-frontend | WSL |
| unit-test | MR/master/dev | unit-test-backend（+覆盖率） | Windows |
| build | MR/master/dev/release | backend-compile、frontend-build | WSL |
| deploy | MR/master：本地；release：线上 | deploy-local / deploy-to-server | WSL |
| test | MR/master：接口冒烟；+autotestrunner | app-smoke-test、autotestrunner-demo | WSL / Windows |
| .post | 所有（when:always） | cleanup-local（拆本地实例）、report-notify（上报+飞书） | WSL |

> **人工卡点 = MR 审批 + owner 合入**（不是流水线里的手动按钮，已去掉 gate）。

**Runner 路由可配置**：`.gitlab-ci.yml` 顶部 `.linux-node`(wsl) / `.windows-node`(windows) 两个 extends 锚点集中定义 tags，上新节点改这两处即可整体迁移。

---

## 三、仓库与代码托管

- 远程地址（SSH，免密）：`ssh://git@gitlab.deeplore.cc:2222/liutong/autotesthub.git`
- GitLab 只有 HTTP，已全局放行 `git config --global credential.allowUnsafeRemotes true`；最终用 SSH（2222）免凭据。

---

## 四、GitLab Runner 配置

> 两个 Runner 都用 **shell executor**，`.gitlab-ci.yml` 里不写 `image:`。

### 4.1 WSL Ubuntu Runner（`tags:[wsl]`）

- 二进制 `~/gitlab-runner`，配置 `~/gitlab-runner-config.toml`（executor=shell, shell=bash, builds_dir=`/home/liutong/gitlab-builds`）。
- 标签：GitLab UI → Settings → CI/CD → Runners → 编辑 → Tags 填 `wsl`。
- 已装 **docker 29.1.3 + compose**（用户 liutong 在 docker 组，免 sudo），用于 MR 本地部署。
- 启动：`export PATH=$HOME/node22/bin:$PATH; ~/gitlab-runner run --config ~/gitlab-runner-config.toml`

### 4.2 Windows Runner（`tags:[windows]`）

- `C:\GitLab-Runner\gitlab-runner.exe`，配置 `C:\GitLab-Runner\config.toml`（executor=shell, shell=powershell）。
- 标签：GitLab UI 填 `windows`。本机 python311 在 `D:\dev\testcode\python311`。
- 启动：`C:\GitLab-Runner\gitlab-runner.exe run --config C:/GitLab-Runner/config.toml`

### 4.3 已解决的两个关键坑

| Runner | 现象 | 根因 | 修复 |
|--------|------|------|------|
| Windows | job 报「字符串缺少终止符」乱码 | 中文系统 GBK 下 stdin 管道喂 UTF-8 脚本解析坏 | config.toml 加 `FF_DISABLE_POWERSHELL_STDIN = true` |
| WSL | `prepare environment: exit status 1` | `~/.bash_logout` 的 `clear_console -q` 无 tty 返回 1 拖垮 login shell | 清空 `~/.bash_logout` |

### 4.4 上线命令

```bash
# WSL Runner 后台常驻
wsl -d Ubuntu -- bash -lc 'export PATH=$HOME/node22/bin:$PATH; nohup ~/gitlab-runner run --config ~/gitlab-runner-config.toml > ~/gitlab-runner.log 2>&1 &'
wsl -d Ubuntu -- pgrep -af "gitlab-runner run"     # 确认进程
```
```
# Windows Runner（PowerShell）
C:\GitLab-Runner\gitlab-runner.exe run --config C:/GitLab-Runner/config.toml
```

---

## 五、关键设计点

### 5.1 MR 预合并编译（测"预合并结果"）

CE 无 Merged Results Pipeline，故在 MR 流水线里手动合并目标分支再编译测试：

```yaml
.merge-target-sh: &merge-target-sh
  - |
    if [ "$CI_PIPELINE_SOURCE" = "merge_request_event" ]; then
      git fetch -q origin "$CI_MERGE_REQUEST_TARGET_BRANCH_NAME"
      git -c user.email=ci@ci -c user.name=ci merge --no-edit FETCH_HEAD || { echo "❌ 与目标分支冲突"; exit 1; }
    fi
```
- 应用在 sast-bandit / unit-test-backend / backend-compile / frontend-build / deploy-local。
- 你的改动**一定在源分支里、一定被测**；额外测"改动+master"组合；与 master 冲突当场失败。
- 全局 `variables: GIT_DEPTH: "0"`（完整历史，便于合并）。

### 5.2 本地部署实例（WSL docker，隔离）

- MR/master 用同机 WSL docker compose 起隔离实例：`COMPOSE_PROJECT_NAME=autotesthub-ci` + `FRONTEND_PORT=15373`（本地已有默认实例占 15173，必须隔离）。
- `docker-compose.yml` 前端端口已参数化 `"${FRONTEND_PORT:-15173}:80"`（线上默认不变）。
- 容器 detached 跨 stage 存活给测试用；`.post` 的 `cleanup-local` 无论成败 `docker compose down -v`。

### 5.3 结果上传云端 + 飞书私信（`ci/report_notify.py`）

- `.post` 的 `report-notify`（`when: always`）汇总各 job 状态 + 覆盖率：
  - **上传云端**：POST `http://120.79.207.52:15173/api/report-records`，在 `/reports` 页展示。
  - **飞书通知**：用飞书应用给**提 PR 的人**（`GITLAB_USER_EMAIL`）发私信。两边邮箱不一致时用 `FEISHU_USER_MAP` 兜底。
- 脚本仅用标准库（WSL py3.14 免装依赖）；读 job 状态需 `GITLAB_API_TOKEN`。
- ⚠️ 后端曾有 bug：`create_report_record` 把 schema 多出的 `feature` 塞进模型导致所有报告 POST 500，已修（只取模型真实列）。**该修复需经一次 release 部署到线上才生效**。

---

## 六、完整 .gitlab-ci.yml

> 权威副本以仓库 `.gitlab-ci.yml` 为准；下为结构摘要。

```yaml
stages: [scan, unit-test, build, deploy, test]

workflow:                       # 避免分支与 MR 重复跑
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '$CI_COMMIT_BRANCH && $CI_OPEN_MERGE_REQUESTS'
      when: never
    - if: '$CI_COMMIT_BRANCH'

variables: { GIT_DEPTH: "0" }

.linux-node:   { tags: [wsl] }       # 可配置节点
.windows-node: { tags: [windows] }

# rules 锚点：scan(MR/master/dev) build(+release) local(MR/master) test(MR/master/release) prod(release)
# 本地实例隔离参数
.ci-instance: &ci-instance { COMPOSE_PROJECT_NAME: autotesthub-ci, FRONTEND_PORT: "15373" }

sast-bandit:          # scan·WSL，bandit -ll（MEDIUM+ 阻断）+ 全量报告 artifact，before_script 预合并
typecheck-frontend:   # scan·WSL，tsc --noEmit，allow_failure
unit-test-backend:    # unit-test·Windows·python311，pytest --cov，coverage: 正则 + junit，before_script 预合并
backend-compile:      # build·WSL，compileall，预合并
frontend-build:       # build·WSL，npm build → artifact frontend/dist，预合并
deploy-local:         # deploy·WSL，rules=MR/master，docker compose up -d --build（autotesthub-ci:15373），预合并
deploy-to-server:     # deploy·WSL，rules=release，rsync+ssh → 线上 docker compose
app-smoke-test:       # test·WSL，rules=MR/master，curl 本地 15373 前端/后端冒烟
autotestrunner-demo:  # test·Windows，rules=MR/master/release，跑 AutoTestRunner examples/plan.yaml
cleanup-local:        # .post·WSL，when:always(MR/master)，docker compose down -v
report-notify:        # .post·WSL，when:always，python3 ci/report_notify.py（上报+飞书）
```

---

## 七、GitLab CE 合并门禁设置（UI，非 yaml）

实现"测过才能合 + 只 owner 合"：

1. **Settings → Merge requests**：勾 ☑ **Pipelines must succeed**、☑ **All threads resolved**。
2. **Settings → Repository → Protected branches**：`master` protected，**Allowed to merge = Maintainers/owner**。
3. CE 无强制审批数（CI+1 计数），reviewer 可评论认可但不卡按钮（Premium 限制）。
4. MR 流水线测源分支 HEAD（非预合并结果），靠 5.1 的预合并步骤贴近；feature 勤 rebase master。

---

## 八、CI/CD Variables（Settings → CI/CD → Variables）

| Key | 说明 | 设置 |
|-----|------|------|
| `SSH_PRIVATE_KEY` | 登录 120.79.207.52 的私钥全文 | Protected + Masked |
| `DEPLOY_HOST` | `120.79.207.52` | Protected |
| `DEPLOY_USER` | `root` | Protected |
| `GITLAB_API_TOKEN` | 项目访问令牌（read_api），读各 job 状态 | Masked |
| `FEISHU_APP_ID` | 通知应用 `cli_aab9ef60c6b15cb1` | 普通 |
| `FEISHU_APP_SECRET` | 通知应用 secret | Masked + Protected |
| `FEISHU_USER_MAP`（可选） | GitLab邮箱→飞书邮箱/open_id 的 JSON 兜底 | 普通 |

> 飞书应用须：启用「机器人」能力 + 开 `im:message` 权限 + 发布 + 收件人在可用范围内。

---

## 九、Docker 部署配置

### docker-compose.yml（前端端口已参数化）

```yaml
services:
  backend:
    build: { context: ./backend }
    volumes: [ "./data:/app/data" ]
    environment: [ "DATABASE_URL=sqlite:////app/data/autotesthub.db", "FEISHU_APP_ID=${FEISHU_APP_ID}", ... ]
    command: sh -c "python -m app.seed && uvicorn app.main:app --host 0.0.0.0 --port 8000"
    restart: always
  frontend:
    build: { context: ./frontend }
    ports: [ "${FRONTEND_PORT:-15173}:80" ]   # 线上默认 15173；CI 本地用 15373
    depends_on: [ backend ]
    restart: always
```

### frontend/nginx.conf：`/` 托管 dist，`/api` 反代 `backend:8000`
### backend/Dockerfile：`python:3.11-slim` + apt/pip 换阿里云源
### WSL Runner npm 镜像：`npm config set registry https://registry.npmmirror.com`

---

## 十、服务器现状

```
autotesthub-frontend  0.0.0.0:15173->80/tcp   # 应用访问 http://120.79.207.52:15173
autotesthub-backend   (内部 8000)
gitlab/gitlab-ce      0.0.0.0:80->80/tcp ...   # 独立 Docker 网络，互不影响
```

---

## 十一、待办列表

### ✅ 待办 5：Docker 部署到 GitLab 服务器（方案 B：WSL Runner SSH 部署）
### ✅ 待办 1：CI 代码扫描 + 质量门禁（bandit MEDIUM+ + 前端 tsc）
### ✅ 待办 2：Windows Runner 跑通 autotestrunner（demo plan）
### ✅ 增补：分支策略 + MR 本地部署测试 + 预合并编译 + 覆盖率 + 云端上报 + 飞书私信

### ⏳ 待办 3：后端完整构建（非仅语法检查）
- 当前仅 `compileall`；可在 WSL 建 venv 装依赖或 docker executor，补真实 pytest 业务单测（现仅冒烟）。

### ⏳ 待办 4：数据隐私合规测试用例梳理
- 静态层：gitleaks/trufflehog 扫密钥、自定义规则查 PII；用例层：数据最小化/脱敏/加密/删除导出权利；CI scan + 部署后分别执行。

---

> 维护：本文件同时存于仓库 `doc/14-GitLab-CICD搭建与配置.md`，与飞书 wiki 同步。
> 最后更新：2026-06-24
