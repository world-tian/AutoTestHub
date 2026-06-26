# CLAUDE.md

面向 AI（Claude Code）与新成员的项目上下文。先读本文件，再按需深入 `doc/`。

## 这是什么

**AutoTestHub** —— 面向智能硬件与全栈测试的 AI 自动化测试管理平台。FastAPI + React/TS。
除了产品本身，本仓库还承载了一套**完整的 GitLab CI/CD + 制品管理 + 发布管理**实践（见 `doc/14`、`doc/15`）。

- **线上（生产）**：`http://120.79.207.52:15173`（即 GitLab 服务器同机 Docker 部署）
- **代码托管**：`ssh://git@gitlab.deeplore.cc:2222/liutong/autotesthub.git`（GitLab CE，HTTP 无 HTTPS，SSH 走 2222）
- **默认账号**：`admin` / `AutoTestHub@123`

## 目录结构

```
backend/        FastAPI 后端（app/api 接口、app/models 模型、app/schemas、app/services、app/core/config.py）
                tests/ 单测（pytest，conftest 用独立 sqlite test_ci.db）
frontend/       React18 + TS + Vite + Ant Design（src/pages 页面、src/api 封装）
ci/             CI 用 Python 脚本（report_notify / cleanup_releases / import_gitlab_artifacts）
doc/            设计文档 00-15 + 若干指南（见下方索引）
.gitlab-ci.yml  流水线定义（分支策略 + 三环境 + 定时构建）
docker-compose.yml  生产部署（前端 nginx、后端 uvicorn、SQLite 命名卷）
```

> ⚠️ 根目录的 `src/App.tsx` 是历史 stray，真正前端在 `frontend/src/`。`doc_content*.md`、`raw*.json` 是旧会话中间产物，可删。

## 本地开发

```bash
# 后端
cd backend && python -m venv venv && source venv/bin/activate   # Win: venv\Scripts\activate
pip install -r requirements.txt && python -m app.seed
uvicorn app.main:app --reload --port 8000        # API + Swagger: http://localhost:8000/docs

# 前端
cd frontend && npm install && npm run dev         # http://localhost:5173

# 后端单测（CI 在 Windows runner 用 D:\dev\testcode\python311\python.exe）
cd backend && python -m pytest tests -q --cov=app
```

## 部署与环境（三套，同机隔离）

| 环境 | 触发 | compose 项目名 | 端口 | 目录 |
|------|------|---------------|------|------|
| **生产** | 合入 master（持续部署） | `autotesthub` | 15173 | `/opt/autotesthub` |
| **预发布** | `release/*` 分支 | `autotesthub-release` | 15273 | `/opt/autotesthub-release` |
| **MR 本地验证** | MR / db·wb 定时 | `autotesthub-ci` | 15373 | WSL 本地一次性实例（跑完即焚） |

部署方式：WSL Runner 用 `rsync + ssh` 推到服务器跑 `docker compose`（详见 `doc/14`）。

## CI/CD 模型（详见 doc/14、doc/15）

- **分支**：`feature/*` --MR--> `master`（持续部署生产）；`release/*`（版本发布→预发布+出包）；`hotfix/*`。
- **流水线阶段**：`scan → unit-test → build → package → deploy → test → .post`。MR 跑全套门禁；master 合入只部署不重复测；release 出包+预发布。
- **四类定时构建**（Pipeline Schedules，变量 `SCHEDULE_TASK` 区分，Target=master）：
  | 类型 | SCHEDULE_TASK | 跑在哪 | 版本/制品 |
  |------|--------------|--------|-----------|
  | 日构建 db | `dailybuild` | master 快照 | `db/<时间>` → `autotesthub-db<时间>.tar.gz` |
  | 周构建 wb | `weeklybuild` | master 快照 | `wb/<时间>` → `autotesthub-wb<时间>.tar.gz` |
  | RC 周期 | `cut`（拉 `release/rc<时间>`） | release 全流程 | `rc/<时间>` → `autotesthub-rc<时间>.tar.gz` |
  | 清理 | `cleanup` | — | 删 N 周前时间命名 release 分支 |
  - db/wb 是 master 快照（版本号带斜杠、生成式）；rc/正式版从 `release/*` 分支裁出（无斜杠，正式版 `1.2.0-pvt`）。
- **跳过 CI**：`[skip ci]` 或 `git push -o ci.skip`。文档类提交默认带 `[skip ci]`。

## ★ 项目特有约定与坑（改代码前必读）

- **时间一律用北京时间**：服务端 `created_at/updated_at` 默认值用 `app/models/domain.py` 的 `beijing_now()`（=`utcnow()+8h`），**不要再用 `datetime.utcnow`**。原因：前端 `new Date()` 把无时区字符串按本地解析，GitLab 也返回北京朴素时间。CI 出包时间用 `date`（本地北京）非 `date -u`。
- **CI 报告幂等**：`POST /api/ci-reports` 按 `pipeline_iid` upsert。坑：deploy 失败→报告记 failed，单独 retry 那个 job **不会重跑 `.post` 的 report-notify**；需**再单独 retry `report-notify`** 才会刷新报告+重发飞书。
- **制品代理下载**：`GET /api/artifacts/{id}/download` 后端带 `GITLAB_API_TOKEN` 从 GitLab 拉流（私有 artifact 需鉴权，直链会跳登录）。**坑**：后端容器访问本机公网 IP 的 GitLab 走 hairpin NAT 不通→504，靠 compose `extra_hosts: gitlab.deeplore.cc:host-gateway` 解决。
- **CI 变量**：`GITLAB_API_TOKEN`（read_api，**非 Protected** 才能 MR/部署用）、`SSH_PRIVATE_KEY`/`DEPLOY_*`（Protected）、`FEISHU_APP_ID/SECRET`、`GIT_WRITE_TOKEN`（定时拉/删分支，maintainer+write_repository）。
- **合并门禁(CE)**：`master` + `release/*` 通配设 Protected（否则部署变量注入不到，报 libcrypto）。CE 无 Merged Results Pipeline / 强制审批。
- **鉴权兜底**：`get_current_user` 在无 token 时回退取第一个 user（兼容旧测试），改鉴权时注意。
- **双 Runner**：WSL(`tags:[wsl]`，扫描/编译/部署) + Windows(`tags:[windows]`，单测/autotestrunner)。Windows 是 GBK，config.toml 需 `FF_DISABLE_POWERSHELL_STDIN=true`。
- **飞书通知/文档**：CI 通知用应用 `cli_aab9ef60c6b15cb1`（`ci/report_notify.py` 私信提交人）；文档同步用 `cli_aab9e8506778dcb5`（lark-cli `/d/dev/testcode/node18/lark-cli` `docs +update`）。

## 文档索引

| 文档 | 内容 | 飞书 wiki |
|------|------|-----------|
| `doc/00`~`doc/13` | 产品/架构/数据库/模块/路线等设计文档 | — |
| **`doc/14-GitLab-CICD搭建与配置`** | CI/CD 实操手册（操作/Runner/变量/门禁/定时/排查/历次修复） | [FpvtdU3uHoGlcuxKfQrcEVypnNc](https://wcnw79cymb81.feishu.cn/wiki/FpvtdU3uHoGlcuxKfQrcEVypnNc) |
| **`doc/15-持续集成与发布管理-通用搭建指南`** | 可复用的通用 CI/CD + 发布管理指南 | [PJ0GwsrVuiL5mskOd9wcXBMlnKb](https://wcnw79cymb81.feishu.cn/wiki/PJ0GwsrVuiL5mskOd9wcXBMlnKb) |

> doc/14、doc/15 改完用 lark-cli `docs +update --command overwrite` 同步飞书（见 doc/14 末尾或 lark-cli 用法）。

## 当前状态 / 待办

- ✅ CI/CD 全链路、三环境、四类定时构建、制品管理（含代理下载）、飞书通知/报告均已落地。
- ⏳ **需在 GitLab 页面建 2 个定时计划**：`dailybuild`(`0 2 * * *`) / `weeklybuild`(`0 3 * * 1`)（cut、cleanup 已建）。
- ⏳ 待办3：后端完整构建（WSL venv 真装依赖跑 pytest，非仅语法检查）。
- ⏳ 待办4：数据隐私合规测试用例。
- 💡 可选增强：CI 报告改用 GitLab Pipeline Webhook 实现「retry 后零点击自动刷新」。

## 提交约定

- 在 `feature/*` 开发走 MR；直接提交 master 会触发生产持续部署（应急/CI 配置改动时才直推）。
- 提交信息用中文、带类型前缀（`fix:`/`feat:`/`docs:`/`ci:`）。文档类带 `[skip ci]`。
