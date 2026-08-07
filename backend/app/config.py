from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    app_env: str = "development"
    secret_key: str = "change-me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    reset_token_expire_minutes: int = 60 # New specific expiry

    # Database
    postgres_url: str = "postgresql://notemind:notemind_secret@localhost:5432/notemind"
    mongo_url: str = "mongodb://localhost:27017"
    mongo_db: str = "notemind"
    redis_url: str = "redis://localhost:6379/0"

    # Firebase
    firebase_project_id: str = ""
    firebase_private_key_id: str = ""
    firebase_private_key: str = ""
    firebase_client_email: str = ""
    firebase_storage_bucket: str = ""

    # AWS S3
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_s3_bucket: str = "notemind-uploads"
    aws_region: str = "us-east-1"

    # OpenAI
    openai_api_key: str = ""

    # Groq (free alternative — https://console.groq.com)
    groq_api_key: str = ""

    # SMTP (for Password Reset)
    smtp_server: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    emails_from: str = "NoteMind AI <noreply@notemind.ai>"

    # Frontend URL (for Reset Links)
    frontend_url: str = "https://frontend-iota-sepia-w5lxtih60r.vercel.app"

    # Storage
    storage_backend: str = "local"
    local_upload_dir: str = "uploads"

    # ChromaDB
    chroma_host: str = "localhost"
    chroma_port: int = 8001

    # Celery
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/1"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
