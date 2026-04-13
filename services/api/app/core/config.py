from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "VOTO - Verified Oversight & Trust Oracle"
    env: str = Field(default="development", alias="RRGA_ENV")
    secret_key: str = Field(default="change-me", alias="RRGA_SECRET_KEY")
    database_url: str = Field(default="sqlite:///./rrga.db", alias="DATABASE_URL")
    redis_url: str = Field(default="redis://localhost:6379/0", alias="REDIS_URL")
    object_storage_root: Path = Field(default=Path("./data/artifacts"), alias="OBJECT_STORAGE_ROOT")
    public_base_url: str = Field(default="http://localhost:8000", alias="PUBLIC_BASE_URL")
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"], alias="CORS_ORIGINS")
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

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, list):
            return value
        return [origin.strip() for origin in value.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
