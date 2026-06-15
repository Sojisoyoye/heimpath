import warnings
from typing import Annotated, Any, Literal

from pydantic import (
    AnyUrl,
    BeforeValidator,
    EmailStr,
    HttpUrl,
    PostgresDsn,
    computed_field,
    model_validator,
)
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing_extensions import Self


def parse_cors(v: Any) -> list[str] | str:
    if isinstance(v, str) and not v.startswith("["):
        return [i.strip() for i in v.split(",") if i.strip()]
    elif isinstance(v, list | str):
        return v
    raise ValueError(v)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        # Use top level .env file (one level above ./backend/)
        env_file="../.env",
        env_ignore_empty=True,
        extra="ignore",
    )
    API_V1_STR: str = "/api/v1"
    # Must be set explicitly — no default. Generate with: openssl rand -hex 32
    SECRET_KEY: str
    # Token expiration settings
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    REMEMBER_ME_EXPIRE_DAYS: int = 30
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    # Redis (token blacklist + rate limiting)
    REDIS_URL: str = "redis://localhost:6379"
    FRONTEND_HOST: str = "http://localhost:5173"
    ENVIRONMENT: Literal["local", "staging", "production"] = "local"

    BACKEND_CORS_ORIGINS: Annotated[
        list[AnyUrl] | str, BeforeValidator(parse_cors)
    ] = []

    @computed_field  # type: ignore[prop-decorator]
    @property
    def all_cors_origins(self) -> list[str]:
        return [str(origin).rstrip("/") for origin in self.BACKEND_CORS_ORIGINS] + [
            self.FRONTEND_HOST
        ]

    PROJECT_NAME: str
    SENTRY_DSN: HttpUrl | None = None
    POSTGRES_SERVER: str
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str = ""
    POSTGRES_DB: str = ""
    # Set to false when connecting to a Postgres that has no TLS configured —
    # e.g. self-hosted Postgres on the Hetzner VPS, or a local dev Postgres.
    # Neon and any remote/cloud Postgres: keep true (default).
    DATABASE_USE_SSL: bool = True

    @computed_field  # type: ignore[prop-decorator]
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        base_url = str(
            PostgresDsn.build(
                scheme="postgresql+psycopg",
                username=self.POSTGRES_USER,
                password=self.POSTGRES_PASSWORD,
                host=self.POSTGRES_SERVER,
                port=self.POSTGRES_PORT,
                path=self.POSTGRES_DB,
            )
        )
        if self.DATABASE_USE_SSL:
            base_url += "?sslmode=require"
        return base_url

    @computed_field  # type: ignore[prop-decorator]
    @property
    def ASYNC_DATABASE_URI(self) -> str:
        # asyncpg does not accept sslmode as a URL parameter — SSL is configured
        # via connect_args in database.py instead.
        return str(
            PostgresDsn.build(
                scheme="postgresql+asyncpg",
                username=self.POSTGRES_USER,
                password=self.POSTGRES_PASSWORD,
                host=self.POSTGRES_SERVER,
                port=self.POSTGRES_PORT,
                path=self.POSTGRES_DB,
            )
        )

    SMTP_TLS: bool = True
    SMTP_SSL: bool = False
    SMTP_PORT: int = 587
    SMTP_HOST: str | None = None
    SMTP_USER: str | None = None
    SMTP_PASSWORD: str | None = None
    EMAILS_FROM_EMAIL: EmailStr | None = None
    EMAILS_FROM_NAME: str | None = None

    @model_validator(mode="after")
    def _set_default_emails_from(self) -> Self:
        if not self.EMAILS_FROM_NAME:
            self.EMAILS_FROM_NAME = self.PROJECT_NAME
        return self

    # Resend (preferred when configured — resend.com, free tier 3k/month)
    RESEND_API_KEY: str | None = None

    # SendGrid (used when Resend is not configured)
    SENDGRID_API_KEY: str | None = None

    EMAIL_RESET_TOKEN_EXPIRE_HOURS: int = 1

    @computed_field  # type: ignore[prop-decorator]
    @property
    def emails_enabled(self) -> bool:
        return bool(
            (self.RESEND_API_KEY or self.SMTP_HOST or self.SENDGRID_API_KEY)
            and self.EMAILS_FROM_EMAIL
        )

    @computed_field  # type: ignore[prop-decorator]
    @property
    def resend_enabled(self) -> bool:
        return bool(self.RESEND_API_KEY)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def sendgrid_enabled(self) -> bool:
        return bool(self.SENDGRID_API_KEY)

    EMAIL_TEST_USER: str = "test@example.com"
    FIRST_SUPERUSER: EmailStr
    FIRST_SUPERUSER_PASSWORD: str

    # Stripe configuration
    STRIPE_SECRET_KEY: str | None = None
    STRIPE_WEBHOOK_SECRET: str | None = None
    STRIPE_PREMIUM_PRICE_ID: str | None = None
    STRIPE_ENTERPRISE_PRICE_ID: str | None = None

    @computed_field  # type: ignore[prop-decorator]
    @property
    def stripe_enabled(self) -> bool:
        return bool(self.STRIPE_SECRET_KEY)

    # Azure Translator configuration (free tier: 2M chars/month)
    AZURE_TRANSLATOR_KEY: str | None = None
    AZURE_TRANSLATOR_REGION: str = "westeurope"
    AZURE_TRANSLATOR_ENDPOINT: str = "https://api.cognitive.microsofttranslator.com"

    @computed_field  # type: ignore[prop-decorator]
    @property
    def translator_enabled(self) -> bool:
        return bool(self.AZURE_TRANSLATOR_KEY)

    # Anthropic (Claude) configuration for AI analysis
    ANTHROPIC_API_KEY: str | None = None
    ANTHROPIC_MODEL: str = "claude-sonnet-4-20250514"
    ANTHROPIC_MAX_TOKENS: int = 4096

    @computed_field  # type: ignore[prop-decorator]
    @property
    def anthropic_enabled(self) -> bool:
        return bool(self.ANTHROPIC_API_KEY)

    # Document upload settings
    UPLOAD_DIR: str = "./uploads/documents"
    MAX_FILE_SIZE_MB: int = 20
    MAX_PAGES_FREE: int = 10
    MAX_PAGES_PREMIUM: int = 20

    # Reliability settings
    TRANSLATION_CONFIDENCE_THRESHOLD: float = 0.70
    # Minimum fraction of pages/clauses that must be translated before the document
    # is allowed to reach COMPLETED status. If Azure Translator returns fewer
    # results than submitted, the document is marked FAILED rather than silently
    # accepted as complete with missing pages.
    TRANSLATION_COVERAGE_THRESHOLD: float = 0.95
    AZURE_TRANSLATOR_TIMEOUT_SECONDS: int = 60
    # Quota: default 1,900,000 leaves a 5% buffer below the 2M free-tier limit.
    AZURE_TRANSLATOR_QUOTA_LIMIT: int = 1_900_000
    AZURE_TRANSLATOR_QUOTA_ALERT_THRESHOLD: float = 0.80
    MAX_JSON_BODY_SIZE_BYTES: int = 1_048_576  # 1 MB
    DB_STATEMENT_TIMEOUT_MS: int = 10_000  # 10 seconds
    POOL_EXHAUSTION_BACKOFF_SECONDS: int = 5
    REQUEST_TIMEOUT_SECONDS: int = 30  # default per-request wall-clock limit
    DOCUMENT_REQUEST_TIMEOUT_SECONDS: int = 120  # extended limit for upload/translation
    MARKET_DATA_MAX_AGE_DAYS: int = 30

    # Email settings
    # Set NOTIFICATION_EMAILS_ENABLED=false to suppress all non-essential emails
    # (notifications, weekly digest).  Forgot-password and email verification
    # emails are always sent regardless of this flag.
    NOTIFICATION_EMAILS_ENABLED: bool = True

    # Domain used to construct absolute backend URLs (e.g. avatar serving)
    DOMAIN: str = "localhost"

    @computed_field  # type: ignore[prop-decorator]
    @property
    def backend_url(self) -> str:
        """Absolute base URL for the backend API."""
        if self.ENVIRONMENT == "local":
            return "http://localhost:8000"
        return f"https://api.{self.DOMAIN}"

    def _check_default_secret(self, var_name: str, value: str | None) -> None:
        if not value and self.ENVIRONMENT != "local":
            raise ValueError(
                f"{var_name} must not be empty in {self.ENVIRONMENT}. "
                "Generate a secure value with: openssl rand -hex 32"
            )
        if value == "changethis":
            message = (
                f'The value of {var_name} is "changethis", '
                "for security, please change it, at least for deployments."
            )
            if self.ENVIRONMENT == "local":
                warnings.warn(message, stacklevel=1)
            else:
                raise ValueError(message)

    @model_validator(mode="after")
    def _enforce_non_default_secrets(self) -> Self:
        self._check_default_secret("SECRET_KEY", self.SECRET_KEY)
        self._check_default_secret("POSTGRES_PASSWORD", self.POSTGRES_PASSWORD)
        self._check_default_secret(
            "FIRST_SUPERUSER_PASSWORD", self.FIRST_SUPERUSER_PASSWORD
        )

        return self


settings = Settings()  # type: ignore
