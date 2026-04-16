from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, Query
from sqlalchemy import func
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.models import AlertEvent, Entity, Source, Watchlist
from app.db.session import get_db
from app.matching.resolution import is_evm_address
from app.schemas.api import AlertTestRequest, SearchResponse, WatchlistCreateRequest
from app.services.alerts import create_test_alert, create_watchlist_with_rule
from app.services.auth import require_api_user
from app.services.catalog import (
    get_contract_profile,
    get_diff,
    get_domain_profile,
    get_entity_evidence,
    get_entity_graph,
    get_entity_profile,
    get_entity_timeline,
    get_jurisdiction_profile,
    get_node_graph,
    get_wallet_profile,
    list_source_statuses,
    search_registry,
)

router = APIRouter()

import logging
logger = logging.getLogger(__name__)
logger.info("Public routes initialized")


@router.get("/")
def root():
    return {"status": "VOTO API is online"}


@router.get("/health")
def health(session: Session = Depends(get_db)) -> dict:
    from app.db.models import Source
    source_count = session.scalar(select(func.count(Source.id))) or 0
    return {
        "status": "ok", 
        "timestamp": datetime.utcnow(),
        "source_count": source_count
    }


@router.get("/health/stats")
def health_stats(session: Session = Depends(get_db)) -> dict:
    from app.db.models import SourceArtifact, IngestionRun
    return {
        "entity_count": session.scalar(select(func.count(Entity.id))) or 0,
        "artifact_count": session.scalar(select(func.count(SourceArtifact.id))) or 0,
        "last_run": session.scalar(select(IngestionRun.status).order_by(IngestionRun.started_at.desc()).limit(1)),
    }


@router.get("/debug/db")
def debug_db(session: Session = Depends(get_db)):
    from app.db.models import Source, SourceArtifact, IngestionRun
    source_count = session.scalar(select(func.count(Source.id))) or 0
    artifact_count = session.scalar(select(func.count(SourceArtifact.id))) or 0
    run_count = session.scalar(select(func.count(IngestionRun.id))) or 0
    return {
        "source_count": source_count,
        "artifact_count": artifact_count,
        "run_count": run_count,
    }


@router.get("/debug/bootstrap")
def debug_bootstrap(session: Session = Depends(get_db)):
    from app.db.bootstrap import ensure_bootstrap_data
    from app.core.config import get_settings
    ensure_bootstrap_data(session, get_settings())
    return {"status": "bootstrap re-run complete"}


@router.get("/search", response_model=SearchResponse)
def search(q: str = Query(..., min_length=1), limit: int = Query(default=20, le=50), session: Session = Depends(get_db)):
    from app.ingest.sources.coingecko import materialize_contracts_from_catalog_address
    if is_evm_address(q) and not search_registry(session, q, limit=1):
        materialize_contracts_from_catalog_address(session, address=q)
    return {"query": q, "results": search_registry(session, q, limit)}


@router.get("/entity/{entity_id}")
async def entity_detail(entity_id: str, session: Session = Depends(get_db)):
    from app.ingest.sources.coingecko import hydrate_coin_detail
    entity = session.get(Entity, entity_id)
    if entity and entity.source_of_truth == "coingecko" and not entity.summary and entity.metadata_json.get("coingecko_id"):
        await hydrate_coin_detail(session, get_settings(), entity.metadata_json["coingecko_id"])
    return get_entity_profile(session, entity_id)


@router.get("/check/entity")
async def check_entity(id: str = Query(...), session: Session = Depends(get_db)):
    return await entity_detail(id, session)


@router.get("/entity/{entity_id}/graph")
def entity_graph(entity_id: str, session: Session = Depends(get_db)):
    return get_entity_graph(session, entity_id)


@router.get("/graph/{node_type}/{node_id}")
def node_graph(node_type: str, node_id: str, session: Session = Depends(get_db)):
    return get_node_graph(session, node_type, node_id)


@router.get("/entity/{entity_id}/timeline")
def entity_timeline(entity_id: str, session: Session = Depends(get_db)):
    return get_entity_timeline(session, entity_id)


@router.get("/entity/{entity_id}/evidence")
def entity_evidence(entity_id: str, session: Session = Depends(get_db)):
    return get_entity_evidence(session, entity_id)


@router.get("/contract/{chain}/{address}")
async def contract_detail(chain: str, address: str, session: Session = Depends(get_db)):
    from app.ingest.sources.coingecko import materialize_contracts_from_catalog_address
    from app.ingest.sources.etherscan import hydrate_contract_from_etherscan
    try:
        return get_contract_profile(session, chain, address)
    except Exception:
        contract = next(
            iter(materialize_contracts_from_catalog_address(session, address=address, chain=chain)),
            None,
        )
        if contract is not None:
            return get_contract_profile(session, chain, address)
        contract = await hydrate_contract_from_etherscan(session, get_settings(), chain=chain, address=address)
        if contract is None:
            return {"detail": "source unavailable"}
        return get_contract_profile(session, chain, address)


@router.get("/check/contract")
async def check_contract(
    chain: str = Query(...),
    address: str = Query(...),
    session: Session = Depends(get_db),
):
    return await contract_detail(chain, address, session)


@router.get("/domain/{hostname}")
def domain_detail(hostname: str, session: Session = Depends(get_db)):
    return get_domain_profile(session, hostname)


@router.get("/check/domain")
def check_domain(hostname: str = Query(...), session: Session = Depends(get_db)):
    return domain_detail(hostname, session)


@router.get("/wallet/{chain}/{address}")
def wallet_detail(chain: str, address: str, session: Session = Depends(get_db)):
    return get_wallet_profile(session, chain, address)


@router.get("/check/wallet")
def check_wallet(
    chain: str = Query(...),
    address: str = Query(...),
    session: Session = Depends(get_db),
):
    return wallet_detail(chain, address, session)


@router.get("/jurisdiction/{code}")
def jurisdiction_detail(code: str, session: Session = Depends(get_db)):
    return get_jurisdiction_profile(session, code)


@router.get("/sources")
def sources(session: Session = Depends(get_db)) -> list[dict]:
    from app.db.models import SourceArtifact, IngestionRun
    all_sources = session.scalars(select(Source).order_by(Source.slug)).all()
    statuses = []
    for source in all_sources:
        last_artifact = session.scalar(
            select(func.max(SourceArtifact.fetched_at)).where(SourceArtifact.source_id == source.id)
        )
        last_runs = session.scalars(
            select(IngestionRun.status)
            .where(IngestionRun.source_id == source.id)
            .order_by(IngestionRun.started_at.desc())
            .limit(3)
        ).all()
        artifact_count = session.scalar(
            select(func.count(SourceArtifact.id)).where(SourceArtifact.source_id == source.id)
        ) or 0
        statuses.append(
            {
                "slug": source.slug,
                "name": source.name,
                "source_type": source.source_type,
                "enabled": source.enabled,
                "last_artifact_at": last_artifact.isoformat() if hasattr(last_artifact, "isoformat") else str(last_artifact) if last_artifact else None,
                "last_run_status": last_runs[0] if last_runs else None,
                "artifact_count": artifact_count,
            }
        )
    return statuses


@router.post("/sources/sync")
async def sync_sources():
    """Manually trigger source ingestion. No auth required for debugging."""
    import asyncio
    import threading
    from app.ingest.sources.coingecko import ingest_coingecko_catalog
    from app.ingest.sources.esma import ingest_esma
    from app.ingest.sources.ofac import ingest_ofac
    from app.db.session import SessionLocal

    async def _sync():
        db = SessionLocal()
        try:
            await ingest_esma(db, get_settings())
            db.commit()
            await ingest_ofac(db, get_settings(), "ofac_sdn")
            db.commit()
            await ingest_coingecko_catalog(db, get_settings(), limit=50)
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    t = threading.Thread(target=lambda: asyncio.run(_sync()), daemon=True)
    t.start()
    return {"status": "sync started"}


@router.get("/diff")
def diff(from_: datetime = Query(alias="from"), to: datetime = Query(...), session: Session = Depends(get_db)):
    return get_diff(session, from_, to)


@router.post("/watchlists")
def create_watchlist(
    payload: WatchlistCreateRequest,
    session: Session = Depends(get_db),
    user=Depends(require_api_user),
):
    watchlist = create_watchlist_with_rule(
        session,
        owner_id=user.id,
        label=payload.label,
        target_type=payload.target_type,
        target_value=payload.target_value,
        rule_type=payload.rule_type,
        delivery_channel=payload.delivery_channel,
        threshold=payload.threshold,
        filters=payload.filters,
    )
    return {"id": watchlist.id, "label": watchlist.label, "target_type": watchlist.target_type}


@router.post("/alerts/test")
def test_alert(
    payload: AlertTestRequest,
    session: Session = Depends(get_db),
    _user=Depends(require_api_user),
):
    event = create_test_alert(session, title=payload.title, payload=payload.payload)
    return {"id": event.id, "status": event.status}


@router.get("/alerts")
def list_alerts(session: Session = Depends(get_db), _user=Depends(require_api_user)):
    events = session.scalars(select(AlertEvent).order_by(AlertEvent.created_at.desc()).limit(100)).all()
    return [
        {
            "id": event.id,
            "title": event.title,
            "status": event.status,
            "payload": event.payload_json,
            "created_at": event.created_at,
        }
        for event in events
    ]


@router.get("/watchlists")
def list_watchlists(session: Session = Depends(get_db), user=Depends(require_api_user)):
    items = session.scalars(select(Watchlist).where(Watchlist.owner_id == user.id).order_by(Watchlist.created_at.desc())).all()
    return [
        {
            "id": item.id,
            "label": item.label,
            "target_type": item.target_type,
            "target_value": item.target_value,
            "filters": item.filters_json,
        }
        for item in items
    ]


@router.post("/admin/ingest/{source_slug}")
async def trigger_ingest(source_slug: str, limit: int | None = None, session: Session = Depends(get_db), _user=Depends(require_api_user)):
    from app.ingest.sources.coingecko import ingest_coingecko_catalog
    from app.ingest.sources.esma import ingest_esma
    from app.ingest.sources.ofac import ingest_ofac
    settings = get_settings()
    if source_slug == "esma_mica":
        return await ingest_esma(session, settings)
    if source_slug == "ofac_sdn":
        return await ingest_ofac(session, settings, "ofac_sdn")
    if source_slug == "ofac_consolidated":
        return await ingest_ofac(session, settings, "ofac_consolidated")
    if source_slug == "coingecko":
        return await ingest_coingecko_catalog(session, settings, limit=limit)
    return {"detail": "source unavailable"}

@router.get("/debug-sync")
async def debug_sync(session: Session = Depends(get_db)):
    from app.ingest.sources.coingecko import ingest_coingecko_catalog
    try:
        await ingest_coingecko_catalog(session, get_settings(), limit=10)
        session.commit()
        return {"status": "success"}
    except Exception as e:
        session.rollback()
        return {"status": "error", "message": str(e)}

@router.get("/debug-sources")
def debug_sources(session: Session = Depends(get_db)):
    import traceback
    try:
        from app.db.models import SourceArtifact, IngestionRun, Source
        all_sources = session.scalars(select(Source).order_by(Source.slug)).all()
        statuses = []
        for source in all_sources:
            last_artifact = session.scalar(
                select(func.max(SourceArtifact.fetched_at)).where(SourceArtifact.source_id == source.id)
            )
            last_runs = session.scalars(
                select(IngestionRun.status)
                .where(IngestionRun.source_id == source.id)
                .order_by(IngestionRun.started_at.desc())
                .limit(3)
            ).all()
            artifact_count = session.scalar(
                select(func.count(SourceArtifact.id)).where(SourceArtifact.source_id == source.id)
            ) or 0
            statuses.append({
                "slug": source.slug,
                "name": source.name,
                "source_type": source.source_type,
                "enabled": source.enabled,
                "last_artifact_at": last_artifact.isoformat() if hasattr(last_artifact, "isoformat") else str(last_artifact) if last_artifact else None,
                "last_run_status": last_runs[0] if last_runs else None,
                "artifact_count": artifact_count,
            })
        return {"count": len(statuses), "sources": statuses}
    except Exception as e:
        return {"error": traceback.format_exc()}
