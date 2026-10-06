from functools import lru_cache
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parent.parent
_ENV_FILE = _BACKEND_DIR / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(_ENV_FILE, ".env", "../.env"), extra="ignore"
    )
    contact_email: str | None = None
    guide_url: str | None = None
    database_url: str
    jwt_secret: str = Field(min_length=32)
    access_token_minutes: int = Field(default=30, ge=1, le=1440)
    cors_origins: list[str] = ["http://localhost:3000"]
    gemini_api_key: str | None = None

    @field_validator("jwt_secret")
    @classmethod
    def reject_example(cls, value):
        if value.startswith("replace-"):
            raise ValueError(
                "Generate a random JWT_SECRET; do not use the example value"
            )
        return value

    @property
    def psycopg_url(self):
        parts = urlsplit(self.database_url)
        # Prisma's schema parameter is not a libpq connection option.
        query = dict(parse_qsl(parts.query))
        schema = query.pop("schema", "public")
        if schema != "public":
            raise ValueError("This package uses the public schema")
        return urlunsplit(parts._replace(query=urlencode(query)))


@lru_cache
def settings():
    return Settings()
