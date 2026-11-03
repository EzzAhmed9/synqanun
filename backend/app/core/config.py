import os
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    PROJECT_NAME: str = "SynQanun Suite Backend"
    API_V1_STR: str = "/api"
    DATABASE_URL: str = Field(
        default="postgresql+psycopg2://postgres:@localhost:5432/synqanun_db",
        validation_alias="DATABASE_URL"
    )
    LEGAL_DATABASE_URL: str = Field(
        default="postgresql+psycopg2://postgres:@localhost:5432/full_saudi",
        validation_alias="LEGAL_DATABASE_URL"
    )
    SECRET_KEY: str = Field(
        default="synqanun-super-secret-jwt-key-2026-development-change-in-production",
        validation_alias="SECRET_KEY"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    MICROSOFT_OAUTH_CLIENT_ID: str = Field(
        default="",
        validation_alias="MICROSOFT_OAUTH_CLIENT_ID"
    )
    MICROSOFT_OAUTH_CLIENT_SECRET: str = Field(
        default="",
        validation_alias="MICROSOFT_OAUTH_CLIENT_SECRET"
    )

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
