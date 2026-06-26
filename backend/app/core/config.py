from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "AutoTestHub"
    SECRET_KEY: str = "super_secret_key"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    DATABASE_URL: str = "sqlite:///./autotesthub.db"
    
    AI_PROVIDER: str = "mock"
    AI_API_KEY: str = ""
    AI_BASE_URL: str = ""
    AI_MODEL_NAME: str = ""

    FEISHU_APP_ID: str = ""
    FEISHU_APP_SECRET: str = ""
    FEISHU_REDIRECT_URI: str = ""

    # GitLab：制品代理下载用（私有项目 artifact 需鉴权，后端带 token 拉流回传）
    GITLAB_API_URL: str = "http://gitlab.deeplore.cc/api/v4"
    GITLAB_API_TOKEN: str = ""
    GITLAB_PROJECT: str = "liutong/autotesthub"

    class Config:
        env_file = "../.env"

settings = Settings()
