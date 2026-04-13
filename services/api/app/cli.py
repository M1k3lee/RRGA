from __future__ import annotations

import asyncio

import typer

from app.core.config import get_settings
from app.db import models  # noqa: F401
from app.db.bootstrap import ensure_bootstrap_data
from app.db.session import Base, SessionLocal, engine
from app.ingest.sources.coingecko import ingest_coingecko_catalog
from app.ingest.sources.esma import ingest_esma
from app.ingest.sources.etherscan import hydrate_contract_from_etherscan
from app.ingest.sources.ofac import ingest_ofac

cli = typer.Typer(help="VOTO backend CLI")


@cli.command("init-db")
def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    try:
        ensure_bootstrap_data(session, get_settings())
    finally:
        session.close()


@cli.command("ingest")
def ingest(source_slug: str, limit: int | None = None) -> None:
    session = SessionLocal()
    settings = get_settings()
    try:
        if source_slug == "esma_mica":
            asyncio.run(ingest_esma(session, settings))
        elif source_slug == "ofac_sdn":
            asyncio.run(ingest_ofac(session, settings, "ofac_sdn"))
        elif source_slug == "ofac_consolidated":
            asyncio.run(ingest_ofac(session, settings, "ofac_consolidated"))
        elif source_slug == "coingecko":
            asyncio.run(ingest_coingecko_catalog(session, settings, limit=limit))
        else:
            raise typer.BadParameter(f"Unknown source: {source_slug}")
    finally:
        session.close()


@cli.command("hydrate-contract")
def hydrate_contract(chain: str, address: str) -> None:
    session = SessionLocal()
    try:
        asyncio.run(hydrate_contract_from_etherscan(session, get_settings(), chain=chain, address=address))
    finally:
        session.close()


if __name__ == "__main__":
    cli()
