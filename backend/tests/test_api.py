"""后端接口单元测试：覆盖 root、OpenAPI、若干 GET 列表端点，以及项目/CI 报告的读写。

用 FastAPI TestClient 直接打 `/api`，提升单测覆盖率（不再只是冒烟）。
"""

from app.api.endpoints import get_current_user
from app.main import app
from app.models.domain import User


def test_root(client):
    r = client.get("/")
    assert r.status_code == 200
    assert "message" in r.json()


def test_openapi_schema(client):
    r = client.get("/openapi.json")
    assert r.status_code == 200
    assert r.json()["info"]["title"]


def test_list_endpoints_ok(client):
    for path in [
        "/api/projects",
        "/api/report-records",
        "/api/ci-reports",
        "/api/execution-runs",
        "/api/version-iterations",
    ]:
        r = client.get(path)
        assert r.status_code == 200, f"{path} -> {r.status_code}"
        assert isinstance(r.json(), list)


def test_project_create_and_get(client):
    r = client.post("/api/projects", json={"name": "CI-单测项目", "description": "ut"})
    assert r.status_code == 200
    pid = r.json()["id"]

    r = client.get(f"/api/projects/{pid}")
    assert r.status_code == 200
    assert r.json()["name"] == "CI-单测项目"

    r = client.get("/api/projects")
    assert any(p["id"] == pid for p in r.json())


def test_project_get_404(client):
    r = client.get("/api/projects/not-exist-id")
    assert r.status_code == 404


def test_ci_report_create_and_detail(client):
    payload = {
        "name": "UT CI 报告",
        "branch": "feature/ut",
        "status": "success",
        "trigger_name": "ut",
        "jobs": [
            {"name": "backend-compile", "stage": "build", "status": "success"},
            {"name": "unit-test-backend", "stage": "unit-test",
             "status": "success", "coverage": "50%"},
        ],
    }
    r = client.post("/api/ci-reports", json=payload)
    assert r.status_code == 200
    rid = r.json()["id"]

    r = client.get(f"/api/ci-reports/{rid}")
    assert r.status_code == 200
    body = r.json()
    assert body["trigger_name"] == "ut"
    assert len(body["jobs"]) == 2


def test_release_artifact_create_list_and_detail(client):
    payload = {
        "version": "1.2.0-pvt",
        "name": "autotesthub-1.2.0-pvt.tar.gz",
        "branch": "release/1.2.0-pvt",
        "commit_sha": "abc1234",
        "pipeline_id": "100",
        "pipeline_iid": 12,
        "pipeline_url": "http://gitlab/pipelines/100",
        "job_id": "200",
        "job_url": "http://gitlab/jobs/200",
        "download_url": "http://gitlab/jobs/200/artifacts/file/dist-pkg/autotesthub-1.2.0-pvt.tar.gz",
        "file_name": "dist-pkg/autotesthub-1.2.0-pvt.tar.gz",
        "file_size": 1024,
        "file_sha256": "f" * 64,
        "storage_type": "gitlab_artifact",
    }
    r = client.post("/api/artifacts", json=payload)
    assert r.status_code == 200
    artifact = r.json()
    assert artifact["version"] == payload["version"]
    assert artifact["file_size"] == 1024

    r = client.get("/api/artifacts", params={"version": "1.2"})
    assert r.status_code == 200
    assert any(item["id"] == artifact["id"] for item in r.json())

    r = client.get(f"/api/artifacts/{artifact['id']}")
    assert r.status_code == 200
    assert r.json()["download_url"] == payload["download_url"]

    r = client.post("/api/artifacts", json=payload)
    assert r.status_code == 200
    assert r.json()["id"] == artifact["id"]

    app.dependency_overrides[get_current_user] = lambda: User(
        username="admin",
        email="admin@example.com",
        is_superuser=True,
    )
    try:
        r = client.delete(f"/api/artifacts/{artifact['id']}")
        assert r.status_code == 200

        r = client.get(f"/api/artifacts/{artifact['id']}")
        assert r.status_code == 404
    finally:
        app.dependency_overrides.pop(get_current_user, None)
