# Gitlab CI&CD

> AutoTestHub 接入自建 GitLab（`gitlab.deeplore.cc` / `120.79.207.52`）的 CI/CD 搭建总结。
> 记录每个配置环节，便于后续单独配置 Runner、或重配仓库触发一条合理的 CI/CD 流程。

---

## 一、当前状态

| 环节 | 状态 | 说明 |
|------|------|------|
| 代码托管（SSH） | ✅ | `ssh://git@gitlab.deeplore.cc:2222/liutong/autotesthub.git` |
| 分支策略 | ✅ | master（集成→**持续部署生产**）+ release/X.Y.Z（**版本发布→预发布**）+ feature/*；MR 驱动 |
| WSL Runner | ✅ | shell+bash，`tags:[wsl]`：扫描/编译/出包/部署/接口测试/上报 |
| Windows Runner | ✅ | shell+powershell，`tags:[windows]`：单元测试/autotestrunner |
| 代码扫描 + 门禁 | ✅ | bandit（后端·MEDIUM+ 阻断）+ tsc（前端·informational），仅 MR |
| 单元测试 + 覆盖率 | ✅ | pytest + pytest-cov，覆盖率显示在 MR，仅 MR |
| MR 预合并编译 | ✅ | MR 流水线先合 master 再编译测试（贴近 EE Merged Results） |
| **三环境隔离** | ✅ | MR=本地 WSL docker(15373)；master=**生产**(15173)；release=**预发布**(15273) |
| master 持续部署 | ✅ | 合入即上生产：编译→部署生产→冒烟→通知（不重复测试） |
| release 版本发布 | ✅ | release/X.Y.Z：编译→**出版本包**→部署预发布→测试→整体报告 |
| 结果上传云端 | ✅ | 汇总整条流水线 + 各 job 明细 POST 到 `/api/ci-reports` |
| 持续集成报告页 | ✅ | AutoTestHub `/reports` → **「持续集成报告」tab**：触发人/结果/耗时/到秒时间，详情看各环节日志、跳 GitLab |
| 飞书通知 | ✅ | 飞书应用给**提 PR 的人**发私信（编译/部署/测试结果） |
| 流水线触发限制 | ✅ | 只有 **MR 和 release 分支**触发流水线（普通分支 push 不跑） |

> **GitLab 是 CE 社区版**：Merged Results Pipeline、Required Approvals 是 Premium 功能，CE 没有。
> 用「Pipelines must succeed + 保护分支 + 预合并编译」达到等效门禁，见第八节。

---

## 二、分支策略与流水线流程

**分支模型与三环境（2 条长期分支 + 短期 feature 分支）：**

```
feature/* --MR--> master    ：scan→unit-test→build→deploy(本地WSL docker 15373)→test
                              合入前全套门禁；全绿 → MR ✅ → 测过 + owner 合入
master  --(合入即持续部署)    ：build→deploy(生产 15173)→冒烟→通知（MR 已测过，不重复）
release/X.Y.Z --(版本发布)   ：build→出版本包(autotesthub-vX.Y.Z.tar.gz)→deploy(预发布 15273)
                              →冒烟+autotestrunner→整体测试报告（确认出包+版本号+报告）
dev --(可选，未启用)         ：scan→unit-test→build 快速反馈
```

**三套环境互相隔离**（同一服务器 120.79.207.52，独立 compose 项目名/端口/目录/DB 卷）：

| 环境 | 触发 | 端口 | 目录 / 项目名 | 用途 |
|------|------|------|--------------|------|
| 本地 | MR | 15373 | WSL docker `autotesthub-ci` | 合入前门禁，跑完即焚 |
| **生产** | master 合入 | 15173 | `/opt/autotesthub` | 正式线上，持续部署 |
| **预发布** | release/X.Y.Z | 15273 | `/opt/autotesthub-release` | 版本出包确认 + 整体测试 |

**流水线 6 个 stage（+ .post 收尾）：**

| stage | 跑在哪些场景 | 作业 |
|-------|------------|------|
| scan | 仅 MR | sast-bandit、typecheck-frontend |
| unit-test | 仅 MR | unit-test-backend（+覆盖率） |
| build | MR / master / release | backend-compile、frontend-build |
| **package** | **仅 release** | package-release（出版本包） |
| deploy | MR=本地；master=生产；release=预发布 | deploy-local / deploy-to-server |
| test | MR=本地冒烟+autotestrunner；master=生产冒烟；release=预发布冒烟+autotestrunner | app-smoke-test / smoke-deployed / autotestrunner-demo |
| .post | 所有（when:always） | cleanup-local（仅MR）、report-notify（上报+飞书） |

> **人工卡点 = MR 审批 + owner 合入**；master 合入即上生产，所以合入前的 MR 门禁是质量关键。

**Runner 路由可配置**：`.gitlab-ci.yml` 顶部 `.linux-node`(wsl) / `.windows-node`(windows) 两个 extends 锚点集中定义 tags，上新节点改这两处即可整体迁移。

---

## 二·五、操作手册：如何触发构建与上线

> ⚠️ 前提：**WSL Runner 和 Windows Runner 都要在运行**（见 4.4 启动命令）。
> 普通分支 push **不会**触发流水线，只有 **MR** 和 **release 分支**才触发。

### A. 日常改代码 → 提 MR → 合入（验证不上线）

```bash
# 1. 从最新 master 切 feature 分支
git checkout master && git pull
git checkout -b feature/xxx

# 2. 改代码、提交
git add -A && git commit -m "feat: xxx"

# 3. 推送并【自动创建 MR】（关键：push 选项，免去网页手点）
git push -o merge_request.create \
         -o merge_request.target=master \
         -o merge_request.remove_source_branch \
         -u origin feature/xxx
```

- 推上去 GitLab 自动建好 MR → **MR 流水线自动跑**：扫描→单测→编译→本地部署(WSL docker 15373)→测试。
- 全绿后：MR 页 ✅，去 `/reports`「持续集成报告」看明细，飞书收到私信。
- **owner 在 MR 页点 Merge** 合入 master（需先满足 7 节的合并门禁）。
- 不带 push 选项时：push 只给一个「New MR」链接，仍要手点 **Create merge request**（GitLab 不会自动建 MR）。

### B. 上生产（master 合入即持续部署）

> **master 就是生产**——MR 合入 master 后自动跑：`编译 → 部署生产(15173) → 冒烟 → 飞书通知`，不再重复测试（MR 已测过）。

- 你**什么都不用额外做**：A 步把 MR 合入 master，就自动上生产。
- 部署完访问 `http://120.79.207.52:15173`；提交人收到飞书部署通知；`/reports`「持续集成报告」有该次记录。
- **验证已上线**：`curl http://120.79.207.52:15173/api/ci-reports` 返回 200。
- **前置**：`master` 设为 Protected；`SSH_PRIVATE_KEY/DEPLOY_HOST/DEPLOY_USER` 为受保护变量（master/release 才注入）。

### C. 版本发布（出包 + 版本号 + 整体测试报告）

> 版本发布走 **`release/X.Y.Z`** 分支（**分支名里的 X.Y.Z 就是版本号**）。它部署到**预发布环境(15273)**，不碰生产。

```bash
# 从已上线的 master 切版本分支（X.Y.Z 自己定，如 1.2.0）
git fetch origin
git checkout -b release/1.2.0 origin/master
git push -u origin release/1.2.0
```

触发流水线：`编译 → 出版本包 → 部署预发布(15273) → 冒烟 + autotestrunner → 整体测试报告`。产出：

- **版本包**：`package-release` 作业打出 `autotesthub-v1.2.0.tar.gz`（+ `VERSION.txt`），在该流水线 **Artifacts** 里下载，保留 3 个月。
- **预发布环境**：`http://120.79.207.52:15273` 可访问该版本，用于出包确认。
- **整体测试报告**：`report-notify` 把这条流水线（编译/出包/部署/冒烟/autotestrunner）汇总上传到 `/reports`「持续集成报告」，名字带版本号；飞书通知提交人。

> **重新触发同一版本**（重测/重出包，无代码改动）：`git checkout release/1.2.0 && git commit --allow-empty -m "rebuild" && git push`（空提交，详见 D）。
> **前置**：`release*` 设为 **Protected**（否则受保护变量注入不到，部署报 `libcrypto` 错）。

### D. 手动重跑 / 补通知 / 重新触发

- **重新触发整条流水线**（无代码改动）：`git commit --allow-empty -m "trigger: rerun" && git push origin <分支>`；或 UI 里 **Retry** 整条。
- **只 Retry 单个 job 不会重跑 `.post` 的 report-notify**（不会补发上报/通知）。要补发就 Retry 整条，或单独 Retry `report-notify`。
- 普通 `git push` 报 `Everything up-to-date` = 没有新提交，不会触发流水线 → 用上面的空提交。

### E. 常见排查

| 现象 | 原因 / 处理 |
|------|------------|
| job 一直 pending | 对应 Runner 没在跑，或标签不匹配（windows job 需 Windows Runner 在线且打了 `windows` 标签） |
| 部署报 `Error loading key libcrypto` | `master`/`release*` 没设 Protected → 受保护变量为空。设 Protected 后 Retry |
| `/api/...` 上传 500 | 线上后端是旧代码，需合一次 master（或重新部署）更新 |
| MR 流水线缺少上报/通知 | `GITLAB_API_TOKEN` 若是 Protected，MR(非保护分支)拿不到 → 改为非 Protected |
| 飞书没收到 | `FEISHU_APP_ID/SECRET` 未配，或 `GITLAB_USER_EMAIL` ≠ 飞书邮箱（用 `FEISHU_USER_MAP` 兜底） |

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

### 5.3 持续集成报告（云端 + 飞书私信，`ci/report_notify.py`）

- `.post` 的 `report-notify`（`when: always`）汇总整条流水线 + 各 job 明细：
  - **上传云端**：一次性 POST `http://120.79.207.52:15173/api/ci-reports`（流水线 + jobs 数组，含各 job 状态/耗时/覆盖率/清理后日志/GitLab 链接）。
  - **展示**：AutoTestHub `/reports` → **「持续集成报告」tab**（独立于「AI 分析报告」）。列表显示触发人/结果/分支/覆盖率/耗时/到秒时间；详情弹窗展开看各环节日志、跳 GitLab。
  - **飞书通知**：用飞书应用给**提 PR 的人**（`GITLAB_USER_EMAIL`）发私信。两边邮箱不一致时用 `FEISHU_USER_MAP` 兜底。
- 后端：`CIReport` / `CIReportJob` 两张表 + `POST/GET /api/ci-reports`、`GET /api/ci-reports/{id}`；`app.seed` 的 `create_all` 部署时自动建表。
- 脚本仅用标准库（WSL py3.14 免装依赖）；读 job 状态/日志需 `GITLAB_API_TOKEN`。
- ⚠️ 历史坑：`create_report_record` 曾把 schema 多出的 `feature` 塞进模型导致 500（已修，只取模型真实列）；任何后端改动**都需经一次 release 部署到线上才生效**。

---

## 六、完整 .gitlab-ci.yml

> 权威副本以仓库 `.gitlab-ci.yml` 为准；下为结构摘要。

```yaml
stages: [scan, unit-test, build, deploy, test]

workflow:                       # 只有 MR / master / release 触发，普通分支 push 不跑
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '$CI_COMMIT_BRANCH == "master"'
    - if: '$CI_COMMIT_BRANCH =~ /^release/'
    - when: never

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
    volumes: [ "db-data:/app/data" ]   # Docker 具名卷(避免挂载 checkout 目录的权限问题)
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
---

## 2026-06-25 更新：待办 6 制品管理基础版

状态：✅ 基础版已完成。

- 后端新增 `release_artifacts` 表，登记版本号、分支、commit、pipeline/job 链接、下载地址、包大小、SHA256、构建时间等元数据。
- 后端新增 `/api/artifacts`、`/api/artifacts/{id}`，支持创建、列表、按版本模糊筛选、按分支精确筛选。
- CI `package-release` 出包后计算包大小和 SHA256，并把 GitLab artifact 直达下载链接 POST 到 AutoTestHub；上报失败不阻断发布，避免首次上线接口尚未部署时卡住 release。
- 前端 `/reports` 新增「制品管理」tab，支持制品统计、版本/分支筛选、下载制品、跳转流水线和出包 job。
- 已补后端接口单元测试，前端构建通过。
- 新增 `ci/import_gitlab_artifacts.py` 和手动 CI job `import-gitlab-artifacts`：可从 GitLab 历史 `package-release` job 回填现有 release 制品元数据；接口按 `job_id` / `version+pipeline_id` 幂等去重，重复执行不会刷重复记录。
