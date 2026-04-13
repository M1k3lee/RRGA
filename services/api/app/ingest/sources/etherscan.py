from __future__ import annotations

from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.db.models import Contract, Source
from app.ingest.pipeline import (
    ensure_contract,
    ensure_relationship,
    fetch_and_store_artifact,
    finish_ingestion_run,
    get_or_create_entity,
    record_snapshot,
    start_ingestion_run,
)
from app.ingest.storage import LocalArtifactStorage

CHAIN_MAP = {
    "ethereum": 1,
    "base": 8453,
    "arbitrum": 42161,
    "optimism": 10,
    "polygon": 137,
}


async def hydrate_contract_from_etherscan(
    session: Session,
    settings: Settings,
    *,
    chain: str,
    address: str,
) -> Contract | None:
    source = session.scalar(select(Source).where(Source.slug == "etherscan"))
    if source is None or not settings.etherscan_api_key:
        return None

    storage = LocalArtifactStorage(settings.object_storage_root)
    run = start_ingestion_run(session, source, trigger="on_demand")
    chainid = chain if chain.isdigit() else str(CHAIN_MAP.get(chain.lower(), 1))
    url = (
        f"{settings.etherscan_api_base}?chainid={chainid}&module=contract&action=getsourcecode"
        f"&address={address}&apikey={settings.etherscan_api_key}"
    )

    async with httpx.AsyncClient(timeout=60) as client:
        artifact = await fetch_and_store_artifact(
            session=session,
            client=client,
            source=source,
            storage=storage,
            artifact_key=f"{chainid}_{address.lower()}",
            artifact_type="json",
            url=url,
        )
        payload: dict[str, Any] = httpx.Response(200, content=artifact.raw_bytes).json()

    result = (payload.get("result") or [{}])[0]
    contract = ensure_contract(
        session,
        chain=chain,
        address=address,
        token_symbol=result.get("ContractName"),
        token_name=result.get("ContractName"),
        metadata={
            "compiler_version": result.get("CompilerVersion"),
            "proxy": result.get("Proxy"),
            "implementation": result.get("Implementation"),
            "similar_match": result.get("SimilarMatch"),
        },
    )
    contract.is_verified = bool(result.get("SourceCode"))
    contract.explorer_url = f"https://etherscan.io/address/{address}"
    contract.last_validated_at = contract.updated_at

    if result.get("ContractName"):
        entity = get_or_create_entity(
            session,
            name=result["ContractName"],
            entity_type="brand",
            status="contract_observed",
            source_of_truth=source.slug,
            metadata={"etherscan_chainid": chainid},
        )
        ensure_relationship(
            session,
            from_node_type="entity",
            from_node_id=entity.id,
            to_node_type="contract",
            to_node_id=contract.id,
            edge_type="linked_contract",
        )

    record_snapshot(
        session,
        scope=f"etherscan:{chainid}:{address.lower()}",
        payload=result,
        entity_id=None,
        source_id=source.id,
        artifact_id=artifact.artifact.id,
        summary_label=f"Etherscan contract {address.lower()}",
    )
    finish_ingestion_run(
        session,
        run,
        status="completed",
        metrics={"artifacts": 1, "records": 1},
        artifact_id=artifact.artifact.id,
    )
    return contract
