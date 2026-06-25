"""后端接口单元测试：覆盖 root、OpenAPI、若干 GET 列表端点，以及项目/CI 报告的读写。

用 FastAPI TestClient 直接打 `/api`，提升单测覆盖率（不再只是冒烟）。
"""


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
