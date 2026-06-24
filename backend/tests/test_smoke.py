"""后端最小冒烟单元测试（phase-1）。

仅校验配置可加载、应用可导入并挂载了路由——不依赖数据库/外部服务，
保证 CI 的 unit-test 阶段能稳定跑起来。后续在此目录扩展真实业务单测。
"""
from app.core.config import settings


def test_settings_loaded():
    assert settings.PROJECT_NAME
    assert settings.ACCESS_TOKEN_EXPIRE_MINUTES > 0


def test_database_url_default_is_sqlite():
    assert settings.DATABASE_URL.startswith("sqlite")
