# pytest 配置：用独立测试库 + TestClient，覆盖后端接口（不污染开发库）
import os

os.environ["DATABASE_URL"] = "sqlite:///./test_ci.db"
if os.path.exists("test_ci.db"):
    os.remove("test_ci.db")

import pytest
from fastapi.testclient import TestClient
from app.main import app            # 触发模型注册 + 路由挂载
from app.database import Base, engine

Base.metadata.create_all(bind=engine)   # 在测试库建表


@pytest.fixture(scope="session")
def client():
    return TestClient(app)
