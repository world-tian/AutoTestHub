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

    class Config:
        env_file = "../.env"

settings = Settings()
