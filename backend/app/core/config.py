"""Application settings loaded from environment variables / backend/.env."""
from functools import lru_cache
from pathlib import Path
import logging

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]
DEFAULT_SECRET = "dev-only-change-me-astrokids-secret-key-please-replace"
INSECURE_SECRETS = {DEFAULT_SECRET, "change-me-to-a-long-random-string", "", "changeme"}

logger = logging.getLogger("astrokids")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR / ".env"), env_file_encoding="utf-8", extra="ignore"
    )

    app_name: str = "AstroKids Academy API"
    environment: str = "development"  # development | test | production

    # Database: SQLite works out of the box; switch to MySQL in .env
    # e.g. mysql+pymysql://astrokids:password@localhost:3306/astrokids?charset=utf8mb4
    database_url: str = f"sqlite:///{(BACKEND_DIR / 'astrokids.db').as_posix()}"

    # Security
    secret_key: str = DEFAULT_SECRET
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 720
    parent_gate_token_minutes: int = 30
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # AI (AstroBot). Provider: demo | openai | anthropic
    ai_provider: str = "demo"
    ai_api_key: str = ""
    ai_model: str = ""
    ai_base_url: str = ""
    ai_timeout_seconds: float = 20.0
    ai_max_tokens: int = 350

    # NASA open data (https://api.nasa.gov). DEMO_KEY works but is heavily rate-limited; a free key is better.
    nasa_api_key: str = "DEMO_KEY"

    # Rate limits
    rate_limit_auth_per_minute: int = 10
    rate_limit_ai_per_minute: int = 8

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")

    @property
    def live_ai_configured(self) -> bool:
        return self.ai_provider.lower() in {"openai", "anthropic"} and bool(self.ai_api_key.strip())


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    if settings.secret_key in INSECURE_SECRETS or len(settings.secret_key) < 24:
        if settings.environment == "production":
            raise RuntimeError("SECRET_KEY must be set in production (see backend/.env.example)")
        logger.warning("Using the development SECRET_KEY. Set SECRET_KEY in backend/.env.")
    return settings
