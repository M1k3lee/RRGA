from __future__ import annotations

import hashlib
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.db.models import APIKey, Source, User


BASE_SOURCES = [
    {
        "slug": "esma_mica",
        "name": "ESMA MiCA Interim Register",
        "source_type": "register",
        "base_url": "https://www.esma.europa.eu",
        "is_official": True,
        "freshness_expected_hours": 168,
        "metadata_json": {"register": "MiCA"},
    },
    {
        "slug": "ofac_sdn",
        "name": "OFAC Sanctions List Service SDN",
        "source_type": "sanctions",
        "base_url": "https://sanctionslistservice.ofac.treas.gov",
        "is_official": True,
        "freshness_expected_hours": 24,
        "metadata_json": {"list_type": "SDN"},
    },
    {
        "slug": "ofac_consolidated",
        "name": "OFAC Sanctions List Service Consolidated",
        "source_type": "sanctions",
        "base_url": "https://sanctionslistservice.ofac.treas.gov",
        "is_official": True,
        "freshness_expected_hours": 24,
        "metadata_json": {"list_type": "NON_SDN"},
    },
    {
        "slug": "coingecko",
        "name": "CoinGecko Public API",
        "source_type": "market_metadata",
        "base_url": "https://api.coingecko.com",
        "is_official": False,
        "freshness_expected_hours": 24,
        "metadata_json": {"enrichment": True},
    },
    {
        "slug": "etherscan",
        "name": "Etherscan API V2",
        "source_type": "contract_metadata",
        "base_url": "https://api.etherscan.io",
        "is_official": False,
        "freshness_expected_hours": 24,
        "metadata_json": {"enrichment": True},
    },
]


def hash_api_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


def ensure_bootstrap_data(session: Session, settings: Settings) -> None:
    for source_data in BASE_SOURCES:
        existing = session.scalar(select(Source).where(Source.slug == source_data["slug"]))
        if existing is None:
            session.add(Source(**source_data))

    if settings.bootstrap_admin_email and settings.bootstrap_api_key:
        user = session.scalar(select(User).where(User.email == settings.bootstrap_admin_email))
        if user is None:
            user = User(
                email=settings.bootstrap_admin_email,
                name=settings.bootstrap_admin_name,
                role="admin",
                created_at=datetime.utcnow(),
            )
            session.add(user)
            session.flush()

        key_hash = hash_api_key(settings.bootstrap_api_key)
        existing_key = session.scalar(select(APIKey).where(APIKey.hashed_key == key_hash))
        if existing_key is None:
            session.add(
                APIKey(
                    user_id=user.id,
                    label="bootstrap-admin",
                    hashed_key=key_hash,
                )
            )

    session.commit()
