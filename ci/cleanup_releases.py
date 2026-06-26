#!/usr/bin/env python3
"""定时清理【按时间命名】的旧 release 分支（release/YYYYMMDDHHMM，兼容旧的 release/YYYY-MM-DD-HHMM）。

- 只删时间命名的周期分支；语义正式版本（release/1.2.0-pvt 等）一律保留。
- 超过 KEEP_WEEKS（默认 8 周）的才删。
- 用 GitLab API，需要 CI 变量 GIT_WRITE_TOKEN（项目访问令牌，api + write_repository，maintainer）。
"""
import json
import os
import re
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

GL = os.environ["CI_API_V4_URL"]
PID = os.environ["CI_PROJECT_ID"]
TOKEN = os.environ["GIT_WRITE_TOKEN"]
KEEP_WEEKS = int(os.environ.get("KEEP_WEEKS", "8"))

# 时间命名的周期分支：release/rc202606261511（RC）、release/202606261511，
# 兼容旧的带横杠 release/2026-06-26-1511（rc 前缀与横杠都可有可无）。语义正式版本（release/1.2.0-pvt）不匹配→保留。
DATE_BR = re.compile(r"^release/(?:rc)?(\d{4})-?(\d{2})-?(\d{2})-?(\d{2})(\d{2})$")


def api(method, path):
    req = urllib.request.Request(GL + path, method=method,
                                 headers={"PRIVATE-TOKEN": TOKEN})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.status, r.read().decode("utf-8", "replace")


def list_release_branches():
    out, page = [], 1
    while True:
        _, t = api("GET", f"/projects/{PID}/repository/branches"
                          f"?per_page=100&page={page}&search=release/")
        items = json.loads(t)
        out += items
        if len(items) < 100:
            break
        page += 1
    return out


def main():
    cutoff = datetime.now(timezone.utc) - timedelta(weeks=KEEP_WEEKS)
    deleted = kept = 0
    for b in list_release_branches():
        name = b["name"]
        m = DATE_BR.match(name)
        if not m:
            print(f"保留(正式版本/非时间命名): {name}")
            kept += 1
            continue
        y, mo, d, hh, mm = (int(x) for x in m.groups())
        dt = datetime(y, mo, d, hh, mm, tzinfo=timezone.utc)
        if dt >= cutoff:
            print(f"保留(未超 {KEEP_WEEKS} 周): {name}")
            kept += 1
            continue
        try:
            enc = urllib.parse.quote(name, safe="")
            api("DELETE", f"/projects/{PID}/repository/branches/{enc}")
            print(f"已删除: {name}（{dt:%Y-%m-%d %H:%M}）")
            deleted += 1
        except Exception as e:
            print(f"WARN: 删除 {name} 失败: {e}（token 需 maintainer + write_repository）")
    print(f"完成：删除 {deleted}，保留 {kept}")


if __name__ == "__main__":
    main()
