#!/usr/bin/env python3
"""Backfill GitLab artifact metadata into AutoTestHub.

This is intended for one-off imports and the CI .post job. It reads successful
GitLab jobs that produced artifacts and posts metadata to AutoTestHub
/api/artifacts. It does not download artifacts or mutate Docker volumes.

Required configuration:
  GITLAB_API_TOKEN or GIT_WRITE_TOKEN  GitLab token with read_api
  GITLAB_PROJECT_ID or CI_PROJECT_ID   numeric project id, or set GITLAB_PROJECT

Optional:
  GITLAB_API_URL or CI_API_V4_URL      default: http://gitlab.deeplore.cc/api/v4
  GITLAB_PROJECT                      default: liutong/autotesthub
  HUB_URL                             default: http://120.79.207.52:15173
  IMPORT_MAX_PAGES                    default: 20
  DRY_RUN=1                           print payloads without posting
"""
import json
import os
import re
import sys
import urllib.parse
import urllib.request
import urllib.error
from datetime import datetime, timedelta, timezone


GL = os.environ.get("GITLAB_API_URL") or os.environ.get("CI_API_V4_URL") or "http://gitlab.deeplore.cc/api/v4"
TOKEN = os.environ.get("GITLAB_API_TOKEN") or os.environ.get("GIT_WRITE_TOKEN") or ""
PROJECT = os.environ.get("GITLAB_PROJECT_ID") or os.environ.get("CI_PROJECT_ID") or os.environ.get("GITLAB_PROJECT", "liutong/autotesthub")
PROJECT_ENC = urllib.parse.quote(PROJECT, safe="")
HUB = os.environ.get("HUB_URL", "http://120.79.207.52:15173").rstrip("/")
MAX_PAGES = int(os.environ.get("IMPORT_MAX_PAGES", "20"))
DRY_RUN = os.environ.get("DRY_RUN", "").lower() in {"1", "true", "yes"}


def request_json(method, url, data=None, headers=None, timeout=25):
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req_headers = {"Content-Type": "application/json"}
    if headers:
        req_headers.update(headers)
    req = urllib.request.Request(url, data=body, method=method, headers=req_headers)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        text = resp.read().decode("utf-8", "replace")
        return json.loads(text) if text else None


def gitlab_headers():
    if not TOKEN:
        raise SystemExit("Missing GITLAB_API_TOKEN or GIT_WRITE_TOKEN")
    return {"PRIVATE-TOKEN": TOKEN}


def _stamp(iso):
    """GitLab 的 ISO8601(UTC) 时间 → YYYYMMDDHHMM(北京时间)，用于制品名，和分支时间戳风格一致。"""
    if not iso:
        return ""
    try:
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        return dt.astimezone(timezone(timedelta(hours=8))).strftime("%Y%m%d%H%M")
    except Exception:
        return ""


_MR_REF = re.compile(r"^refs/merge-requests/(\d+)/head$")
_MR_CACHE = {}


def resolve_ref(ref):
    """MR 流水线的 ref（refs/merge-requests/N/head）解析成实际要合入的源分支名（如 feature/xxx）；
    其它 ref（master / release/* 等）原样返回。结果按 MR iid 缓存，避免重复请求。"""
    if not ref:
        return ref
    m = _MR_REF.match(ref)
    if not m:
        return ref
    iid = m.group(1)
    if iid in _MR_CACHE:
        return _MR_CACHE[iid]
    src = ref
    try:
        mr = request_json("GET", f"{GL}/projects/{PROJECT_ENC}/merge_requests/{iid}",
                          headers=gitlab_headers())
        src = (mr or {}).get("source_branch") or ref
    except Exception as exc:
        print(f"WARN: 解析 MR {iid} 源分支失败，沿用 {ref}: {exc}")
    _MR_CACHE[iid] = src
    return src


def list_gitlab_jobs():
    jobs = []
    for page in range(1, MAX_PAGES + 1):
        url = f"{GL}/projects/{PROJECT_ENC}/jobs?per_page=100&page={page}"
        batch = request_json("GET", url, headers=gitlab_headers())
        if not batch:
            break
        jobs.extend(batch)
        if len(batch) < 100:
            break
    return jobs


def existing_artifact_keys():
    try:
        items = request_json("GET", f"{HUB}/api/artifacts") or []
    except Exception as exc:
        print(f"WARN: could not read existing artifacts from {HUB}: {exc}")
        return set()
    keys = set()
    for item in items:
        job_id = item.get("job_id")
        if job_id:
            keys.add(("job_id", str(job_id)))
        version = item.get("version")
        pipeline_id = item.get("pipeline_id")
        if version and pipeline_id:
            keys.add(("version_pipeline", version, str(pipeline_id)))
    return keys


def artifact_payload(job):
    # MR 流水线的 ref 是 refs/merge-requests/N/head，解析成实际要合入的源分支名
    ref = resolve_ref(job.get("ref") or "")
    name = job.get("name") or ""
    status = job.get("status") or ""
    if status != "success":
        return None
    artifacts_file = job.get("artifacts_file") or {}
    if not artifacts_file:
        return None

    job_url = job.get("web_url") or ""
    pipeline = job.get("pipeline") or {}
    commit = job.get("commit") or {}
    pipeline_id = pipeline.get("id")
    pipeline_iid = pipeline.get("iid")

    if name == "package-release" and ref.startswith("release/"):
        raw_version = ref.removeprefix("release/")          # 无斜杠，用于文件名
        package_name = f"autotesthub-{raw_version}.tar.gz"
        package_path = f"dist-pkg/{package_name}"
        display_name = package_name
        file_name = package_path
        download_url = f"{job_url}/artifacts/file/{package_path}" if job_url else None
        source = "package-release"
        # rc 周期版登记成 rc/<时间>（与 db/、wb/ 统一）；其它版本号原样
        version = f"rc/{raw_version[2:]}" if re.match(r"^rc\d", raw_version) else raw_version
    else:
        # 版本号与分支对齐（如 master / release/202606261511），不再拼流水线号；
        # 唯一性由 job_id 去重保证，同分支多次构建仍是各自独立的记录。
        version = ref or "detached"
        # 名称统一成 autotesthub-<job名>-<时间>.zip，与 db/rc 包风格对齐，一眼看出是哪个 job 何时产出
        stamp = _stamp(job.get("finished_at") or job.get("created_at"))
        display_name = f"autotesthub-{name}-{stamp}.zip" if stamp else f"autotesthub-{name}.zip"
        file_name = display_name
        download_url = f"{job_url}/artifacts/download" if job_url else None
        source = "gitlab_job_artifact"

    return {
        "version": version,
        "name": display_name,
        "branch": ref,
        "commit_sha": commit.get("short_id") or (commit.get("id") or "")[:8] or None,
        "pipeline_id": str(pipeline_id) if pipeline_id is not None else None,
        "pipeline_iid": pipeline_iid,
        "pipeline_url": pipeline.get("web_url"),
        "job_id": str(job.get("id")) if job.get("id") is not None else None,
        "job_url": job_url,
        "download_url": download_url,
        "file_name": file_name,
        "file_size": artifacts_file.get("size"),
        "file_sha256": None,
        "storage_type": "gitlab_artifact",
        "built_at": job.get("finished_at") or job.get("created_at"),
        "extra_data": {
            "source": source,
            "job_name": name,
            "job_stage": job.get("stage"),
            "job_status": status,
            "gitlab_artifacts_file": artifacts_file,
        },
    }


def post_artifact(payload):
    if DRY_RUN:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return
    request_json("POST", f"{HUB}/api/artifacts", data=payload)


def main():
    existing = existing_artifact_keys()
    imported = skipped = 0
    for job in list_gitlab_jobs():
        payload = artifact_payload(job)
        if not payload:
            continue
        job_id = payload.get("job_id")
        pipeline_id = payload.get("pipeline_id")
        version = payload["version"]
        if (job_id and ("job_id", job_id) in existing) or (
            pipeline_id and ("version_pipeline", version, pipeline_id) in existing
        ):
            skipped += 1
            continue
        try:
            post_artifact(payload)
            imported += 1
            if job_id:
                existing.add(("job_id", job_id))
            if pipeline_id:
                existing.add(("version_pipeline", version, pipeline_id))
            print(f"imported {version} from job {job_id}")
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", "replace")
            print(f"WARN: failed to import {version}: HTTP {exc.code} {detail}", file=sys.stderr)
        except Exception as exc:
            print(f"WARN: failed to import {version}: {exc}", file=sys.stderr)

    print(f"done: imported={imported}, skipped={skipped}, dry_run={DRY_RUN}")


if __name__ == "__main__":
    main()
