"""
CiteVerify Backend Configuration
"""

import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "CiteVerify API"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"

    # Base Directories
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    DATA_DIR: str = os.path.join(BASE_DIR, "data")
    UPLOAD_DIR: str = os.path.join(DATA_DIR, "uploads")
    DATABASE_URL: str = f"sqlite:///{os.path.join(DATA_DIR, 'citeverify.db')}"

    # CORS
    CORS_ORIGINS: list[str] = ["*"]

    # HTTP Client Pool Configuration
    HTTP_MAX_CONNECTIONS: int = 50
    HTTP_MAX_KEEPALIVE_CONNECTIONS: int = 20
    HTTP_KEEPALIVE_EXPIRY: float = 30.0
    HTTP_DEFAULT_TIMEOUT: float = 12.0
    PDF_CACHE_MAX_ENTRIES: int = 50

    class Config:
        case_sensitive = True


settings = Settings()

# Ensure directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
