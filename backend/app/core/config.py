import os
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field, model_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "SynQanun Suite Backend"
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = Field(
        default="development",
        validation_alias="ENVIRONMENT"
    )
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
    FRONTEND_URL: str = Field(
        default="http://localhost:3000",
        validation_alias="FRONTEND_URL"
    )
    DEV_PRINT_RESET_TOKEN: bool = Field(
        default=False,
        validation_alias="DEV_PRINT_RESET_TOKEN"
    )
    DEV_RETURN_RESET_TOKEN: bool = Field(
        default=False,
        validation_alias="DEV_RETURN_RESET_TOKEN"
    )
    MICROSOFT_OAUTH_CLIENT_ID: str = Field(
        default="",
        validation_alias="MICROSOFT_OAUTH_CLIENT_ID"
    )
    MICROSOFT_OAUTH_CLIENT_SECRET: str = Field(
        default="",
        validation_alias="MICROSOFT_OAUTH_CLIENT_SECRET"
    )
    ALLOW_VIEWER_HEADERS: bool = Field(
        default=False,
        validation_alias="ALLOW_VIEWER_HEADERS"
    )
    MAX_UPLOAD_SIZE_MB: int = Field(
        default=10,
        validation_alias="MAX_UPLOAD_SIZE_MB"
    )

    @model_validator(mode="after")
    def validate_secret_key_and_environment(self):
        is_prod = str(self.ENVIRONMENT).lower() == "production"
        known_default = "synqanun-super-secret-jwt-key-2026-development-change-in-production"
        is_insecure = not self.SECRET_KEY or self.SECRET_KEY == known_default or len(self.SECRET_KEY) < 32
        if is_prod and is_insecure:
            raise ValueError(
                "Production SECRET_KEY must be configured, cannot use the default key, and must be at least 32 characters long."
            )
        elif is_insecure:
            print("WARNING: Insecure or default SECRET_KEY is used in development environment.")

        if is_prod and self.ALLOW_VIEWER_HEADERS:
            raise ValueError("ALLOW_VIEWER_HEADERS cannot be enabled in production environment.")
        return self

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
