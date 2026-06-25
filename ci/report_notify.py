#!/usr/bin/env python3
"""CI 收尾：汇总本条流水线各阶段结果 → 上传 AutoTestHub 云端 /reports + 飞书通知。

在 .post 阶段以 `when: always` 运行，确保无论成败都汇报。仅用标准库。

依赖的 CI 预定义变量：CI_API_V4_URL / CI_PROJECT_ID / CI_PIPELINE_ID / CI_PIPELINE_IID /
  CI_PIPELINE_URL / CI_COMMIT_REF_NAME / CI_COMMIT_SHORT_SHA / CI_PIPELINE_SOURCE
需要在 GitLab → Settings → CI/CD → Variables 配置：
  GITLAB_API_TOKEN  —— 项目/个人访问令牌(read_api)，用于读取各 job 状态
  FEISHU_WEBHOOK    —— 飞书群自定义机器人 webhook（可选，不配则跳过通知）
  HUB_URL           —— AutoTestHub 云端地址，默认 http://120.79.207.52:15173
"""
import json
import os
import re
import urllib.request
import urllib.error

GL = os.environ.get("CI_API_V4_URL", "")
PID = os.environ.get("CI_PROJECT_ID", "")
PIPE = os.environ.get("CI_PIPELINE_ID", "")
IID = os.environ.get("CI_PIPELINE_IID", "?")
TOKEN = os.environ.get("GITLAB_API_TOKEN", "")
HUB = os.environ.get("HUB_URL", "http://120.79.207.52:15173").rstrip("/")
WEBHOOK = os.environ.get("FEISHU_WEBHOOK", "")
# 飞书应用模式（给每个人单独发私信）
F_APP_ID = os.environ.get("FEISHU_APP_ID", "")
F_APP_SECRET = os.environ.get("FEISHU_APP_SECRET", "")
F_RECEIVERS = [x.strip() for x in os.environ.get("FEISHU_NOTIFY_RECEIVERS", "").split(",") if x.strip()]
F_BASE = os.environ.get("FEISHU_BASE", "https://open.feishu.cn").rstrip("/")
# GitLab 邮箱 → 飞书 id 映射(可选)，两边邮箱不一致时兜底；JSON: {"a@gitlab":"ou_xxx","b@x":"b@feishu"}
try:
    F_USER_MAP = json.loads(os.environ.get("FEISHU_USER_MAP", "{}") or "{}")
except Exception:
    F_USER_MAP = {}
# 触发流水线/提交 MR 的人
GL_USER_EMAIL = os.environ.get("GITLAB_USER_EMAIL", "")
GL_USER_NAME = os.environ.get("GITLAB_USER_NAME", "")
COMMIT_AUTHOR = os.environ.get("CI_COMMIT_AUTHOR", "")   # "Name <email>"
BRANCH = os.environ.get("CI_COMMIT_REF_NAME", "?")
SHA = os.environ.get("CI_COMMIT_SHORT_SHA", "?")
PIPE_URL = os.environ.get("CI_PIPELINE_URL", "")
SOURCE = os.environ.get("CI_PIPELINE_SOURCE", "")

STAGE_LABELS = [
    ("scan", "代码扫描"),
    ("unit-test", "单元测试"),
    ("build", "编译"),
    ("deploy", "部署"),
    ("test", "测试"),
]


def _req(method, url, data=None, headers=None, timeout=15):
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, method=method, headers=headers or {})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, r.read().decode("utf-8", "replace")


def fetch_jobs():
    if not (TOKEN and GL and PID and PIPE):
        print("WARN: 缺少 GITLAB_API_TOKEN/CI 变量，跳过 job 状态拉取")
        return []
    url = f"{GL}/projects/{PID}/pipelines/{PIPE}/jobs?per_page=100"
    try:
        _, txt = _req("GET", url, headers={"PRIVATE-TOKEN": TOKEN})
        return json.loads(txt)
    except Exception as e:
        print(f"WARN: 拉取 job 状态失败: {e}")
        return []


def summarize(jobs):
    by_stage, coverage = {}, None
    for j in jobs:
        st = j.get("stage", "")
        if st.startswith("."):  # 跳过 .pre/.post
            continue
        by_stage.setdefault(st, []).append(j.get("status", "unknown"))
        if j.get("name") == "unit-test-backend" and j.get("coverage") is not None:
            coverage = f'{j["coverage"]}%'

    def status_of(stage):
        sts = by_stage.get(stage, [])
        if not sts:
            return "skipped"
        if any(s == "failed" for s in sts):
            return "failed"
        if all(s in ("success",) for s in sts):
            return "success"
        return ",".join(sorted(set(sts)))

    stages = {k: status_of(k) for k, _ in STAGE_LABELS}
    overall = "failed" if "failed" in stages.values() else "success"
    return stages, overall, coverage


ICON = {"success": "✅", "failed": "❌", "skipped": "➖"}


def icon(s):
    return ICON.get(s, "⚠️ " + s)


_ANSI = re.compile(r"\x1b\[[0-9;]*[a-zA-Z]")
_SECTION = re.compile(r"section_(start|end):\d+:[A-Za-z0-9_\-]+")


def _clean_trace(t):
    t = _ANSI.sub("", t)
    t = _SECTION.sub("", t)
    t = t.replace("\r\n", "\n").replace("\r", "\n")
    return t.strip()


def collect_jobs(jobs):
    """把各 job 整理成明细（含清理后的日志），跳过 .post 自身。"""
    out = []
    for j in jobs:
        stage = j.get("stage", "")
        name = j.get("name", "")
        if stage.startswith(".") or name == "report-notify":
            continue
        log = ""
        if TOKEN and GL and PID:
            try:
                _, log = _req("GET", f"{GL}/projects/{PID}/jobs/{j.get('id')}/trace",
                              headers={"PRIVATE-TOKEN": TOKEN})
                log = _clean_trace(log)
            except Exception as e:
                log = f"(获取日志失败: {e})"
        if len(log) > 20000:
            log = "...(日志已截断，仅保留末尾)...\n" + log[-20000:]
        dur = j.get("duration")
        out.append({
            "name": name, "stage": stage, "status": j.get("status"),
            "duration": int(dur) if dur else None,
            "coverage": f'{j["coverage"]}%' if j.get("coverage") is not None else None,
            "web_url": j.get("web_url", ""), "log": log,
        })
    return out


def action_label():
    """把(来源+分支)翻译成人话动作，让通知/报告一眼看懂这是在干啥。"""
    if SOURCE == "merge_request_event":
        tgt = os.environ.get("CI_MERGE_REQUEST_TARGET_BRANCH_NAME", "")
        return f"MR 验证（待合入 {tgt}）" if tgt else "MR 验证（合入前门禁）"
    if SOURCE == "schedule":
        return "定时任务"
    if BRANCH == "master":
        return "合入 master → 部署生产"
    if BRANCH.startswith("release/"):
        return f"版本发布 {BRANCH[len('release/'):]} → 部署预发布 + 出包"
    if BRANCH == "dev":
        return "dev 集成验证"
    return f"分支 {BRANCH}"


def push_ci_report(jobs_data, overall, coverage):
    """整条流水线 + 各 job 明细，POST 到 AutoTestHub /api/ci-reports（持续集成报告 tab）。"""
    total = sum(j["duration"] or 0 for j in jobs_data) or None
    payload = {
        "pipeline_iid": int(IID) if str(IID).isdigit() else None,
        "pipeline_id": PIPE or None,
        "name": f"{action_label()} · {BRANCH}@{SHA} (#{IID})",
        "branch": BRANCH, "commit_sha": SHA, "source": SOURCE,
        "trigger_name": GL_USER_NAME or None, "trigger_email": GL_USER_EMAIL or None,
        "status": overall, "pipeline_url": PIPE_URL,
        "duration": total, "coverage": coverage,
        "jobs": jobs_data,
    }
    try:
        code, txt = _req("POST", f"{HUB}/api/ci-reports", data=payload,
                         headers={"Content-Type": "application/json"})
        print(f"CI 报告上报: HTTP {code} ({len(jobs_data)} jobs) -> {HUB}/reports")
    except Exception as e:
        print(f"WARN: CI 报告上报失败: {e}")


def build_text(stages, overall, coverage):
    lines = [f"{label}：{icon(stages[key])}" for key, label in STAGE_LABELS]
    if coverage:
        lines.append(f"单测覆盖率：{coverage}")
    who = f"（提交人 {GL_USER_NAME}）" if GL_USER_NAME else ""
    return (
        f"【AutoTestHub CI {icon(overall)}】{action_label()}\n"
        f"{who}分支 {BRANCH} @ {SHA}\n"
        + "\n".join(lines)
        + f"\n流水线 #{IID}：{PIPE_URL}"
    )


def _parse_author_email():
    """取提交 MR 的人的邮箱：优先 GITLAB_USER_EMAIL，回退解析 CI_COMMIT_AUTHOR 'Name <email>'。"""
    if GL_USER_EMAIL:
        return GL_USER_EMAIL
    if "<" in COMMIT_AUTHOR and ">" in COMMIT_AUTHOR:
        return COMMIT_AUTHOR.split("<", 1)[1].split(">", 1)[0].strip()
    return ""


def _resolve_receivers():
    """收件人 = 提交 MR 的人（+ 可选固定名单）；经 FEISHU_USER_MAP 兜底映射。返回 [(id, id_type)]。"""
    raw = []
    author = _parse_author_email()
    if author:
        raw.append(F_USER_MAP.get(author, author))   # 命中映射则替换为飞书 id
    raw.extend(F_RECEIVERS)
    out, seen = [], set()
    for r in raw:
        if not r or r in seen:
            continue
        seen.add(r)
        id_type = "open_id" if r.startswith("ou_") else ("user_id" if r.startswith("on_") else "email")
        out.append((r, id_type))
    return out


def feishu_token():
    code, txt = _req("POST", f"{F_BASE}/open-apis/auth/v3/tenant_access_token/internal",
                     data={"app_id": F_APP_ID, "app_secret": F_APP_SECRET},
                     headers={"Content-Type": "application/json"})
    d = json.loads(txt)
    if d.get("code") != 0:
        raise RuntimeError(f"取 tenant_access_token 失败: {d.get('msg')}")
    return d["tenant_access_token"]


def notify_feishu(text):
    # 优先用应用给提交人发私信；未配应用则尝试群机器人 webhook
    if F_APP_ID and F_APP_SECRET:
        receivers = _resolve_receivers()
        if not receivers:
            print("WARN: 未解析到收件人(GITLAB_USER_EMAIL/CI_COMMIT_AUTHOR 为空)，跳过飞书私信")
            return
        try:
            tok = feishu_token()
        except Exception as e:
            print(f"WARN: 飞书取 token 失败: {e}")
            return
        for rid, id_type in receivers:
            try:
                code, txt = _req(
                    "POST",
                    f"{F_BASE}/open-apis/im/v1/messages?receive_id_type={id_type}",
                    data={"receive_id": rid, "msg_type": "text",
                          "content": json.dumps({"text": text})},
                    headers={"Content-Type": "application/json",
                             "Authorization": "Bearer " + tok})
                d = json.loads(txt)
                ok = "OK" if d.get("code") == 0 else f"FAIL({d.get('code')}:{d.get('msg')})"
                print(f"飞书私信 -> {rid}({id_type}): {ok}")
            except Exception as e:
                print(f"WARN: 飞书私信 {rid} 失败: {e}")
    elif WEBHOOK:
        try:
            code, txt = _req("POST", WEBHOOK,
                             data={"msg_type": "text", "content": {"text": text}},
                             headers={"Content-Type": "application/json"})
            print(f"飞书群通知: HTTP {code} {txt[:120]}")
        except Exception as e:
            print(f"WARN: 飞书群通知失败: {e}")
    else:
        print("WARN: 未配置 FEISHU_APP_ID/SECRET 或 FEISHU_WEBHOOK，跳过飞书通知")


def main():
    jobs = fetch_jobs()
    stages, overall, coverage = summarize(jobs)
    print(f"汇总: overall={overall} stages={stages} coverage={coverage}")
    push_ci_report(collect_jobs(jobs), overall, coverage)
    notify_feishu(build_text(stages, overall, coverage))


if __name__ == "__main__":
    main()
