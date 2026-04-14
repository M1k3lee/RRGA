from __future__ import annotations

import json
import os
from functools import lru_cache
from pathlib import Path
from typing import Self

from pydantic import Field, computed_field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine.url import make_url
from sqlalchemy.exc import ArgumentError as SAArgumentError


def _is_supabase_direct_db_url(database_url: str) -> bool:
    """Supabase direct connections (port 5432 on db.*) are IPv6-first; Render is often IPv4-only."""
    try:
        parsed = make_url(database_url)
    except Exception:
        return False
    host = (parsed.host or "").lower()
    if not (host.startswith("db.") and host.endswith(".supabase.co")):
        return False
    return int(parsed.port or 5432) == 5432


def _parse_cors_origins_env(raw: str) -> list[str]:
    """CORS_ORIGINS is read as plain text so Render can use comma-separated URLs.

    pydantic-settings JSON-decodes env values for ``list[str]`` before validators run,
    which breaks empty strings and comma-separated values.
    """
    s = raw.strip()
    if not s:
        return []
    if s.startswith("["):
        try:
            parsed = json.loads(s)
        except json.JSONDecodeError:
            parsed = None
        if isinstance(parsed, list):
            return [str(x).strip() for x in parsed if str(x).strip()]
    return [part.strip() for part in s.split(",") if part.strip()]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "VOTO - Verified Oversight & Trust Oracle"
    env: str = Field(default="development", alias="RRGA_ENV")
    secret_key: str = Field(default="change-me", alias="RRGA_SECRET_KEY")
    database_url: str = Field(default="sqlite:///./rrga.db", alias="DATABASE_URL")
    redis_url: str = Field(default="redis://localhost:6379/0", alias="REDIS_URL")
    object_storage_root: Path = Field(default=Path("./data/artifacts"), alias="OBJECT_STORAGE_ROOT")
    public_base_url: str = Field(default="http://localhost:8000", alias="PUBLIC_BASE_URL")
    cors_origins_raw: str = Field(default="http://localhost:3000", alias="CORS_ORIGINS")
    etherscan_api_key: str | None = Field(default=None, alias="ETHERSCAN_API_KEY")
    coingecko_api_key: str | None = Field(default=None, alias="COINGECKO_API_KEY")
    bootstrap_admin_email: str | None = Field(default=None, alias="RRGA_BOOTSTRAP_ADMIN_EMAIL")
    bootstrap_admin_name: str | None = Field(default=None, alias="RRGA_BOOTSTRAP_ADMIN_NAME")
    bootstrap_api_key: str | None = Field(default=None, alias="RRGA_BOOTSTRAP_API_KEY")

    esma_mica_page_url: str = (
        "https://www.esma.europa.eu/esmas-activities/digital-finance-and-innovation/"
        "markets-crypto-assets-regulation-mica"
    )
    esma_csv_urls: dict[str, str] = {
        "whitepapers_other": "https://www.esma.europa.eu/sites/default/files/2024-12/OTHER.csv",
        "issuers_art": "https://www.esma.europa.eu/sites/default/files/2024-12/ARTZZ.csv",
        "issuers_emt": "https://www.esma.europa.eu/sites/default/files/2024-12/EMTWP.csv",
        "casps": "https://www.esma.europa.eu/sites/default/files/2024-12/CASPS.csv",
        "non_compliant_entities": "https://www.esma.europa.eu/sites/default/files/2024-12/NCASP.csv",
        "field_dictionary": (
            "https://www.esma.europa.eu/sites/default/files/2024-12/"
            "Description_of_the_fields_in_the_interim_MiCA_register.csv"
        ),
    }
    ofac_sdn_url: str = (
        "https://sanctionslistservice.ofac.treas.gov/api/publicationpreview/exports/sdn.xml"
    )
    ofac_consolidated_url: str = (
        "https://sanctionslistservice.ofac.treas.gov/api/publicationpreview/exports/consolidated.xml"
    )
    coingecko_api_base: str = "https://api.coingecko.com/api/v3"
    etherscan_api_base: str = "https://api.etherscan.io/v2/api"

    @field_validator("database_url", mode="before")
    @classmethod
    def _normalize_database_url(cls, v: object) -> str:
        if v is None:
            return "sqlite:///./rrga.db"
        s = str(v).strip().strip('"').strip("'")
        if not s:
            return "sqlite:///./rrga.db"
        if s.startswith("postgres://"):
            s = "postgresql://" + s[len("postgres://") :]
        # This project uses psycopg3 only; bare postgresql:// would load the missing psycopg2 dialect.
        if s.startswith("postgresql://") and not s.startswith("postgresql+"):
            s = "postgresql+psycopg://" + s[len("postgresql://") :]
        # Supabase from IPv4-only hosts (e.g. Render) needs TLS; pooler URL is still safest.
        if "supabase.co" in s and not s.startswith("sqlite"):
            low = s.lower()
            if "sslmode=" not in low and "ssl=" not in low:
                s += ("&" if "?" in s else "?") + "sslmode=require"
        return s

    @field_validator("database_url", mode="after")
    @classmethod
    def _database_url_must_parse(cls, v: str) -> str:
        try:
            make_url(v)
        except SAArgumentError as e:
            raise ValueError(
                "DATABASE_URL is not a valid SQLAlchemy URL. On Render, set it to your "
                "Postgres connection string (no surrounding quotes; one line). "
                "Example: postgresql+psycopg://USER:PASSWORD@HOST:5432/DATABASE"
            ) from e
        return v

    @model_validator(mode="after")
    def _production_requires_postgres(self) -> Self:
        url = self.database_url.strip()
        low = url.lower()
        if self.env == "production" and low.startswith("sqlite"):
            raise ValueError(
                "RRGA_ENV is production but DATABASE_URL is missing, empty, or still SQLite. "
                "In the Render dashboard, set DATABASE_URL to your hosted Postgres URL "
                "(for example from Supabase or a Render Postgres instance)."
            )
        if self.env == "production" and _is_supabase_direct_db_url(url):
            flag = os.environ.get("RRGA_SUPABASE_ALLOW_DIRECT", "").strip().lower()
            if flag not in ("1", "true", "yes"):
                raise ValueError(
                    "DATABASE_URL uses Supabase's direct host (db.<project>.supabase.co on port 5432). "
                    "That endpoint is IPv6-first; Render often cannot reach it. "
                    "In Supabase: Connect -> Session pooler, copy the URI, and paste it as "
                    "DATABASE_URL on Render (host like aws-0-<region>.pooler.supabase.com, "
                    "username postgres.<project_ref>). "
                    "If you use Supabase IPv4 direct add-on, set RRGA_SUPABASE_ALLOW_DIRECT=1."
                )
        return self

    @computed_field
    @property
    def cors_origins(self) -> list[str]:
        return _parse_cors_origins_env(self.cors_origins_raw)


@lru_cache
def get_settings() -> Settings:
    return Settings()
