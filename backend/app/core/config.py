from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
from functools import lru_cache


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "LLM RAG Chatbot"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str | None = None

    # Redis
    REDIS_URL: str | None = None

    # Security
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Superadmin Initial Setup
    SUPERADMIN_EMAIL: str = "admin@example.com"
    SUPERADMIN_PASSWORD: str = "changeme123"
    SUPERADMIN_NAME: str = "Super Admin"

    # File Storage
    KEEP_ORIGINAL_FILES: bool = True
    MAX_FILE_SIZE_MB: int = 250
    UPLOAD_DIR: str = "/app/uploads"

    # Ollama
    OLLAMA_BASE_URL: str = "http://ollama:11434"
    DEFAULT_OLLAMA_MODEL: str = "llama2"

    # Embedding Model
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    EMBEDDING_DEVICE: str = "cpu"
    EMBEDDING_DIMENSION: int = 384  # all-MiniLM-L6-v2 dimension

    # Celery
    CELERY_BROKER_URL: str | None = None
    CELERY_RESULT_BACKEND: str | None = None

    # API Keys Encryption
    ENCRYPTION_KEY: Optional[str] = None

    # CORS
    CORS_ORIGINS: list = [
        "http://localhost:3000",
        "http://frontend:3000",
    ]

    # WebSocket
    WS_MESSAGE_QUEUE_SIZE: int = 100

    # Chunking
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


settings = get_settings()
