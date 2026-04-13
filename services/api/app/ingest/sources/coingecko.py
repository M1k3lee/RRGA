from __future__ import annotations

from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.db.models import Entity, Source
from app.ingest.pipeline import (
    ensure_aliases,
    ensure_contract,
    ensure_domain,
    ensure_relationship,
    ensure_relationship_evidence,
    ensure_whitepaper,
    fetch_and_store_artifact,
    finish_ingestion_run,
    get_or_create_entity,
    record_snapshot,
    start_ingestion_run,
)
from app.ingest.storage import LocalArtifactStorage


async def ingest_coingecko_catalog(
    session: Session,
    settings: Settings,
    *,
    limit: int | None = None,
) -> dict[str, int]:
    source = session.scalar(select(Source).where(Source.slug == "coingecko"))
    if source is None:
        raise RuntimeError("CoinGecko source is not configured")

    storage = LocalArtifactStorage(settings.object_storage_root)
    run = start_ingestion_run(session, source, trigger="manual")
    metrics = {"artifacts": 0, "records": 0, "entities": 0, "contracts": 0}

    async with httpx.AsyncClient(timeout=120) as client:
        headers = {"x-cg-demo-api-key": settings.coingecko_api_key} if settings.coingecko_api_key else {}
        artifact = await fetch_and_store_artifact(
            session=session,
            client=client,
            source=source,
            storage=storage,
            artifact_key="catalog",
            artifact_type="json",
            url=f"{settings.coingecko_api_base}/coins/list?include_platform=true",
            headers=headers,
        )
        metrics["artifacts"] += 1
        coins: list[dict[str, Any]] = httpx.Response(200, content=artifact.raw_bytes).json()
        if limit is not None:
            coins = coins[:limit]

        for coin in coins:
            if not coin.get("name"):
                continue
            entity = get_or_create_entity(
                session,
                name=coin["name"],
                entity_type="brand",
                status="market_metadata",
                source_of_truth=source.slug,
                metadata={"coingecko_id": coin.get("id"), "symbol": coin.get("symbol")},
            )
            metrics["entities"] += 1
            if coin.get("symbol"):
                ensure_aliases(session, entity.id, [coin["symbol"].upper()], artifact.artifact.id)

            for chain, address in (coin.get("platforms") or {}).items():
                if not address:
                    continue
                contract = ensure_contract(
                    session,
                    chain=chain or "native",
                    address=address,
                    token_symbol=coin.get("symbol"),
                    token_name=coin.get("name"),
                    metadata={"coingecko_id": coin.get("id")},
                )
                metrics["contracts"] += 1
                relationship = ensure_relationship(
                    session,
                    from_node_type="entity",
                    from_node_id=entity.id,
                    to_node_type="contract",
                    to_node_id=contract.id,
                    edge_type="linked_contract",
                )
                ensure_relationship_evidence(
                    session,
                    relationship_id=relationship.id,
                    source_artifact_id=artifact.artifact.id,
                    evidence_type="json_field",
                    field_path=f"platforms.{chain}",
                    snippet=address,
                )

            record_snapshot(
                session,
                scope=f"coingecko:coin:{coin.get('id')}",
                payload=coin,
                entity_id=entity.id,
                source_id=source.id,
                artifact_id=artifact.artifact.id,
                summary_label=f"CoinGecko coin {coin.get('name')}",
            )
            metrics["records"] += 1

        finish_ingestion_run(session, run, status="completed", metrics=metrics, artifact_id=artifact.artifact.id)
    return metrics


async def hydrate_coin_detail(session: Session, settings: Settings, coin_id: str) -> Entity | None:
    source = session.scalar(select(Source).where(Source.slug == "coingecko"))
    if source is None:
        return None

    async with httpx.AsyncClient(timeout=60) as client:
        headers = {"x-cg-demo-api-key": settings.coingecko_api_key} if settings.coingecko_api_key else {}
        response = await client.get(
            (
                f"{settings.coingecko_api_base}/coins/{coin_id}"
                "?localization=false&tickers=false&market_data=true&community_data=false"
                "&developer_data=false&sparkline=false"
            ),
            headers=headers,
            follow_redirects=True,
        )
        response.raise_for_status()
        payload = response.json()

    entity = next(
        (
            candidate
            for candidate in session.scalars(select(Entity).where(Entity.source_of_truth == source.slug)).all()
            if candidate.metadata_json.get("coingecko_id") == coin_id
        ),
        None,
    )
    if entity is None:
        entity = get_or_create_entity(
            session,
            name=payload["name"],
            entity_type="brand",
            status="market_metadata",
            source_of_truth=source.slug,
            metadata={"coingecko_id": coin_id, "symbol": payload.get("symbol")},
        )

    entity.summary = (payload.get("description") or {}).get("en")
    entity.metadata_json = {
        **entity.metadata_json,
        "market_cap_rank": payload.get("market_cap_rank"),
        "categories": payload.get("categories"),
        "image": payload.get("image", {}),
        "links": payload.get("links", {}),
    }

    links = payload.get("links", {})
    for homepage in links.get("homepage", []):
        if not homepage:
            continue
        domain = ensure_domain(session, homepage)
        if domain:
            ensure_relationship(
                session,
                from_node_type="entity",
                from_node_id=entity.id,
                to_node_type="domain",
                to_node_id=domain.id,
                edge_type="linked_domain",
            )

    whitepaper_url = links.get("whitepaper")
    if whitepaper_url:
        whitepaper = ensure_whitepaper(
            session,
            url=whitepaper_url,
            entity_id=entity.id,
            source_artifact_id=None,
            title=f"{payload['name']} whitepaper",
        )
        ensure_relationship(
            session,
            from_node_type="entity",
            from_node_id=entity.id,
            to_node_type="whitepaper",
            to_node_id=whitepaper.id,
            edge_type="disclosed_in",
        )

    session.commit()
    return entity
