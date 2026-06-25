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
import sys
import urllib.parse
import urllib.request
import urllib.error


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
    ref = job.get("ref") or ""
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
        version = ref.removeprefix("release/")
        package_name = f"autotesthub-{version}.tar.gz"
        package_path = f"dist-pkg/{package_name}"
        display_name = package_name
        file_name = package_path
        download_url = f"{job_url}/artifacts/file/{package_path}" if job_url else None
        source = "package-release"
    else:
        version = f"{ref or 'detached'}-{pipeline_iid or pipeline_id or job.get('id')}"
        display_name = artifacts_file.get("filename") or f"{name}-artifacts.zip"
        file_name = artifacts_file.get("filename") or display_name
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
