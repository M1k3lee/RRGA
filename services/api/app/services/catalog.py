from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.db.models import (
    Alias,
    ChangeEvent,
    Contract,
    Domain,
    Entity,
    EntityJurisdiction,
    IngestionRun,
    Jurisdiction,
    RegisterRecord,
    Relationship,
    RelationshipEvidence,
    SanctionsRecord,
    Source,
    SourceArtifact,
    WarningNotice,
    Wallet,
    Whitepaper,
)
from app.matching.resolution import is_evm_address, score_query_against_candidate


def node_key(node_type: str, raw_id: str) -> str:
    return f"{node_type}:{raw_id}"


NODE_MODEL_MAP: dict[str, Any] = {
    "entity": Entity,
    "domain": Domain,
    "contract": Contract,
    "wallet": Wallet,
    "whitepaper": Whitepaper,
    "register_record": RegisterRecord,
    "sanctions_record": SanctionsRecord,
    "warning_notice": WarningNotice,
    "jurisdiction": Jurisdiction,
}


def _get_required(session: Session, model: Any, item_id: str) -> Any:
    item = session.get(model, item_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return item


def serialize_node(session: Session, node_type: str, raw_id: str) -> dict[str, Any] | None:
    if node_type == "entity":
        entity = session.get(Entity, raw_id)
        if entity is None:
            return None
        return {
            "id": node_key(node_type, raw_id),
            "node_type": entity.entity_type,
            "label": entity.canonical_name,
            "status": entity.current_status,
            "meta": entity.metadata_json,
        }
    if node_type == "domain":
        domain = session.get(Domain, raw_id)
        if domain is None:
            return None
        return {
            "id": node_key(node_type, raw_id),
            "node_type": "domain",
            "label": domain.hostname,
            "status": None,
            "meta": domain.metadata_json,
        }
    if node_type == "contract":
        contract = session.get(Contract, raw_id)
        if contract is None:
            return None
        return {
            "id": node_key(node_type, raw_id),
            "node_type": "token_contract",
            "label": contract.token_name or contract.address,
            "status": "verified" if contract.is_verified else "observed",
            "meta": {"chain": contract.chain, "address": contract.address, **contract.metadata_json},
        }
    if node_type == "jurisdiction":
        jurisdiction = session.get(Jurisdiction, raw_id)
        if jurisdiction is None:
            return None
        return {
            "id": node_key(node_type, raw_id),
            "node_type": "jurisdiction",
            "label": jurisdiction.name,
            "status": None,
            "meta": {"code": jurisdiction.code, **jurisdiction.metadata_json},
        }
    if node_type == "wallet":
        wallet = session.get(Wallet, raw_id)
        if wallet is None:
            return None
        return {
            "id": node_key(node_type, raw_id),
            "node_type": "wallet_address",
            "label": wallet.label or wallet.address,
            "status": None,
            "meta": {"chain": wallet.chain, "address": wallet.address, **wallet.metadata_json},
        }
    if node_type == "whitepaper":
        whitepaper = session.get(Whitepaper, raw_id)
        if whitepaper is None:
            return None
        return {
            "id": node_key(node_type, raw_id),
            "node_type": "whitepaper",
            "label": whitepaper.title or whitepaper.url,
            "status": None,
            "meta": whitepaper.metadata_json,
        }
    if node_type == "register_record":
        record = session.get(RegisterRecord, raw_id)
        if record is None:
            return None
        return {
            "id": node_key(node_type, raw_id),
            "node_type": "register_record",
            "label": f"{record.record_type.replace('_', ' ')} / {record.status or 'listed'}",
            "status": record.status,
            "meta": {"regime": record.regime, **record.fields_json},
        }
    if node_type == "sanctions_record":
        record = session.get(SanctionsRecord, raw_id)
        if record is None:
            return None
        return {
            "id": node_key(node_type, raw_id),
            "node_type": "sanctions_entry",
            "label": f"{record.list_type} / {record.sanctions_uid}",
            "status": record.status,
            "meta": {"program_codes": record.program_codes, **record.fields_json},
        }
    if node_type == "warning_notice":
        warning = session.get(WarningNotice, raw_id)
        if warning is None:
            return None
        return {
            "id": node_key(node_type, raw_id),
            "node_type": "warning_notice",
            "label": warning.title,
            "status": "warning",
            "meta": warning.fields_json,
        }
    return None


def list_source_statuses(session: Session) -> list[dict[str, Any]]:
    sources = session.scalars(select(Source).order_by(Source.slug)).all()
    statuses = []
    for source in sources:
        last_artifact = session.scalar(
            select(func.max(SourceArtifact.fetched_at)).where(SourceArtifact.source_id == source.id)
        )
        last_run = session.scalar(
            select(IngestionRun.status)
            .where(IngestionRun.source_id == source.id)
            .order_by(IngestionRun.started_at.desc())
            .limit(1)
        )
        artifact_count = session.scalar(
            select(func.count(SourceArtifact.id)).where(SourceArtifact.source_id == source.id)
        ) or 0
        statuses.append(
            {
                "slug": source.slug,
                "name": source.name,
                "source_type": source.source_type,
                "enabled": source.enabled,
                "last_artifact_at": last_artifact,
                "last_run_status": last_run,
                "artifact_count": artifact_count,
            }
        )
    return statuses


def search_registry(session: Session, query: str, limit: int = 20) -> list[dict[str, Any]]:
    query = query.strip()
    if not query:
        return []

    results: list[dict[str, Any]] = []
    address_query = is_evm_address(query)

    if not address_query:
        entities = session.scalars(select(Entity).order_by(Entity.updated_at.desc()).limit(750)).all()
        aliases_by_entity = defaultdict(list)
        for alias in session.scalars(select(Alias)).all():
            aliases_by_entity[alias.entity_id].append(alias.alias)

        for entity in entities:
            scored = score_query_against_candidate(query, entity.canonical_name)
            matched_on = list(scored.reasons)
            for alias in aliases_by_entity.get(entity.id, []):
                alias_score = score_query_against_candidate(query, alias)
                if alias_score.score > scored.score:
                    scored = alias_score
                    matched_on = alias_score.reasons + ["alias"]
            if scored.score < 0.55:
                continue
            results.append(
                {
                    "id": entity.id,
                    "node_type": entity.entity_type,
                    "label": entity.canonical_name,
                    "score": round(scored.score, 3),
                    "current_status": entity.current_status,
                    "source_of_truth": entity.source_of_truth,
                    "matched_on": matched_on,
                }
            )

    if not address_query and "." in query:
        domains = session.scalars(
            select(Domain).where(or_(Domain.hostname.ilike(f"%{query}%"), Domain.canonical_url.ilike(f"%{query}%")))
        ).all()
        for domain in domains:
            results.append(
                {
                    "id": domain.id,
                    "node_type": "domain",
                    "label": domain.hostname,
                    "score": 0.99 if domain.hostname == query.lower() else 0.82,
                    "current_status": None,
                    "source_of_truth": None,
                    "matched_on": ["domain_lookup"],
                }
            )

    if address_query:
        normalized_address = query.lower()
        for contract in session.scalars(select(Contract).where(Contract.address == normalized_address)).all():
            results.append(
                {
                    "id": contract.id,
                    "node_type": "contract",
                    "label": contract.token_name or contract.address,
                    "score": 1.0,
                    "current_status": "verified" if contract.is_verified else "observed",
                    "source_of_truth": contract.metadata_json.get("source"),
                    "matched_on": ["address_lookup"],
                }
            )
        for wallet in session.scalars(select(Wallet).where(Wallet.address == normalized_address)).all():
            results.append(
                {
                    "id": wallet.id,
                    "node_type": "wallet",
                    "label": wallet.label or wallet.address,
                    "score": 1.0,
                    "current_status": None,
                    "source_of_truth": None,
                    "matched_on": ["address_lookup"],
                }
            )

    if not address_query:
        for jurisdiction in session.scalars(select(Jurisdiction)).all():
            scored = score_query_against_candidate(query, f"{jurisdiction.code} {jurisdiction.name}")
            if scored.score >= 0.7:
                results.append(
                    {
                        "id": jurisdiction.code,
                        "node_type": "jurisdiction",
                        "label": jurisdiction.name,
                        "score": round(scored.score, 3),
                        "current_status": None,
                        "source_of_truth": None,
                        "matched_on": scored.reasons,
                    }
                )

    results.sort(key=lambda item: item["score"], reverse=True)
    deduped: list[dict[str, Any]] = []
    seen = set()
    for item in results:
        key = (item["node_type"], item["id"])
        if key in seen:
            continue
        seen.add(key)
        deduped.append(item)
        if len(deduped) >= limit:
            break
    return deduped


def _entity_relationships(session: Session, entity_id: str) -> list[Relationship]:
    return session.scalars(
        select(Relationship).where(
            or_(
                (Relationship.from_node_type == "entity") & (Relationship.from_node_id == entity_id),
                (Relationship.to_node_type == "entity") & (Relationship.to_node_id == entity_id),
            )
        )
    ).all()


def _node_relationships(session: Session, node_type: str, node_id: str) -> list[Relationship]:
    return session.scalars(
        select(Relationship).where(
            or_(
                (Relationship.from_node_type == node_type) & (Relationship.from_node_id == node_id),
                (Relationship.to_node_type == node_type) & (Relationship.to_node_id == node_id),
            )
        )
    ).all()


def get_entity_graph(session: Session, entity_id: str) -> dict[str, Any]:
    _get_required(session, Entity, entity_id)
    nodes: dict[str, dict[str, Any]] = {}
    edges: list[dict[str, Any]] = []

    for relationship in _entity_relationships(session, entity_id):
        source_node = serialize_node(session, relationship.from_node_type, relationship.from_node_id)
        target_node = serialize_node(session, relationship.to_node_type, relationship.to_node_id)
        if source_node:
            nodes[source_node["id"]] = source_node
        if target_node:
            nodes[target_node["id"]] = target_node
        if source_node and target_node:
            edges.append(
                {
                    "id": relationship.id,
                    "source": source_node["id"],
                    "target": target_node["id"],
                    "edge_type": relationship.edge_type,
                    "confidence": relationship.confidence,
                    "inferred": relationship.is_inferred,
                }
            )

    if not nodes:
        base = serialize_node(session, "entity", entity_id)
        if base:
            nodes[base["id"]] = base
    return {"nodes": list(nodes.values()), "edges": edges}


def get_node_graph(session: Session, node_type: str, node_id: str) -> dict[str, Any]:
    if node_type == "entity":
        return get_entity_graph(session, node_id)

    model = NODE_MODEL_MAP.get(node_type)
    if model is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unsupported graph node")
    _get_required(session, model, node_id)

    nodes: dict[str, dict[str, Any]] = {}
    edges: list[dict[str, Any]] = []
    base = serialize_node(session, node_type, node_id)
    if base:
        nodes[base["id"]] = base

    if node_type == "jurisdiction":
        links = session.execute(
            select(EntityJurisdiction, Entity)
            .join(Entity, Entity.id == EntityJurisdiction.entity_id)
            .where(EntityJurisdiction.jurisdiction_code == node_id)
        ).all()
        for link, entity in links:
            entity_node = serialize_node(session, "entity", entity.id)
            jurisdiction_node = serialize_node(session, "jurisdiction", node_id)
            if entity_node:
                nodes[entity_node["id"]] = entity_node
            if jurisdiction_node:
                nodes[jurisdiction_node["id"]] = jurisdiction_node
            if entity_node and jurisdiction_node:
                edges.append(
                    {
                        "id": f"jurisdiction:{link.id}",
                        "source": entity_node["id"],
                        "target": jurisdiction_node["id"],
                        "edge_type": link.role,
                        "confidence": 1.0,
                        "inferred": False,
                    }
                )
        return {"nodes": list(nodes.values()), "edges": edges}

    for relationship in _node_relationships(session, node_type, node_id):
        source_node = serialize_node(session, relationship.from_node_type, relationship.from_node_id)
        target_node = serialize_node(session, relationship.to_node_type, relationship.to_node_id)
        if source_node:
            nodes[source_node["id"]] = source_node
        if target_node:
            nodes[target_node["id"]] = target_node
        if source_node and target_node:
            edges.append(
                {
                    "id": relationship.id,
                    "source": source_node["id"],
                    "target": target_node["id"],
                    "edge_type": relationship.edge_type,
                    "confidence": relationship.confidence,
                    "inferred": relationship.is_inferred,
                }
            )
    return {"nodes": list(nodes.values()), "edges": edges}


def get_entity_timeline(session: Session, entity_id: str) -> list[dict[str, Any]]:
    _get_required(session, Entity, entity_id)
    events = session.scalars(
        select(ChangeEvent).where(ChangeEvent.entity_id == entity_id).order_by(ChangeEvent.first_seen_at.desc())
    ).all()
    return [
        {
            "id": event.id,
            "event_type": event.event_type,
            "summary": event.summary,
            "first_seen_at": event.first_seen_at,
            "last_seen_at": event.last_seen_at,
            "diff": event.diff_json,
        }
        for event in events
    ]


def get_entity_evidence(session: Session, entity_id: str) -> list[dict[str, Any]]:
    _get_required(session, Entity, entity_id)
    items: list[dict[str, Any]] = []
    relationships = _entity_relationships(session, entity_id)
    rel_ids = [rel.id for rel in relationships]
    if rel_ids:
        evidence = session.scalars(
            select(RelationshipEvidence).where(RelationshipEvidence.relationship_id.in_(rel_ids))
        ).all()
        artifacts = {
            artifact.id: artifact
            for artifact in session.scalars(select(SourceArtifact).where(SourceArtifact.id.in_([item.source_artifact_id for item in evidence if item.source_artifact_id]))).all()
        }
        source_lookup = {
            source.id: {
                "slug": source.slug,
                "name": source.name,
                "source_type": source.source_type,
            }
            for source in session.scalars(select(Source)).all()
        }
        for item in evidence:
            artifact = artifacts.get(item.source_artifact_id or "")
            source_meta = source_lookup.get(artifact.source_id) if artifact else None
            items.append(
                {
                    "id": item.id,
                    "artifact_id": item.source_artifact_id,
                    "source": source_meta["slug"] if source_meta else "unknown",
                    "source_name": source_meta["name"] if source_meta else "unknown",
                    "source_type": source_meta["source_type"] if source_meta else "unknown",
                    "evidence_type": item.evidence_type,
                    "uri": item.evidence_uri or (artifact.remote_url if artifact else None),
                    "field_path": item.field_path,
                    "snippet": item.snippet,
                    "captured_at": item.captured_at,
                    "artifact_fetched_at": artifact.fetched_at if artifact else None,
                    "artifact_published_at": artifact.published_at if artifact else None,
                }
            )
    return items


def get_entity_profile(session: Session, entity_id: str) -> dict[str, Any]:
    entity = _get_required(session, Entity, entity_id)
    alias_rows = session.scalars(select(Alias).where(Alias.entity_id == entity_id)).all()
    jurisdiction_rows = session.execute(
        select(EntityJurisdiction, Jurisdiction)
        .join(Jurisdiction, Jurisdiction.code == EntityJurisdiction.jurisdiction_code)
        .where(EntityJurisdiction.entity_id == entity_id)
    ).all()
    relationships = _entity_relationships(session, entity_id)
    linked = defaultdict(list)
    for relationship in relationships:
        if relationship.from_node_type == "entity" and relationship.from_node_id == entity_id:
            target = serialize_node(session, relationship.to_node_type, relationship.to_node_id)
            if target:
                linked[relationship.to_node_type].append(target)

    register_records = session.scalars(
        select(RegisterRecord).where(RegisterRecord.entity_id == entity_id).order_by(RegisterRecord.publication_date.desc())
    ).all()
    sanctions_records = session.scalars(
        select(SanctionsRecord).where(SanctionsRecord.entity_id == entity_id).order_by(SanctionsRecord.publication_date.desc())
    ).all()
    warnings = session.scalars(
        select(WarningNotice).where(WarningNotice.entity_id == entity_id).order_by(WarningNotice.published_at.desc())
    ).all()
    return {
        "id": entity.id,
        "canonical_name": entity.canonical_name,
        "aliases": [row.alias for row in alias_rows],
        "entity_type": entity.entity_type,
        "first_seen_at": entity.first_seen_at,
        "last_seen_at": entity.last_seen_at,
        "jurisdictions": [
            {
                "code": jurisdiction.code,
                "name": jurisdiction.name,
                "role": link.role,
                "is_primary": link.is_primary,
            }
            for link, jurisdiction in jurisdiction_rows
        ],
        "current_regulatory_status": entity.current_status,
        "historical_status_changes": get_entity_timeline(session, entity_id),
        "linked_domains": linked["domain"],
        "linked_contracts": linked["contract"],
        "linked_wallets": linked["wallet"],
        "linked_whitepapers": linked["whitepaper"],
        "linked_sanctions": [serialize_node(session, "sanctions_record", record.id) for record in sanctions_records],
        "linked_warnings": [serialize_node(session, "warning_notice", record.id) for record in warnings],
        "register_records": [serialize_node(session, "register_record", record.id) for record in register_records],
        "evidence": get_entity_evidence(session, entity_id),
        "confidence_notes": [
            {
                "edge_type": rel.edge_type,
                "confidence": rel.confidence,
                "is_inferred": rel.is_inferred,
                "reasons": rel.match_reasons_json,
            }
            for rel in relationships
            if rel.is_inferred
        ],
        "source_provenance": sorted(
            {
                source_slug
                for source_slug in [
                    entity.source_of_truth,
                    *[
                        session.get(Source, record.source_id).slug
                        for record in register_records + sanctions_records
                        if session.get(Source, record.source_id)
                    ],
                ]
                if source_slug
            }
        ),
        "summary": entity.summary,
        "meta": entity.metadata_json,
    }


def get_domain_profile(session: Session, hostname: str) -> dict[str, Any]:
    domain = session.scalar(select(Domain).where(Domain.hostname == hostname.lower()))
    if domain is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Domain not found")
    relationships = session.scalars(
        select(Relationship).where(
            or_(
                (Relationship.from_node_type == "domain") & (Relationship.from_node_id == domain.id),
                (Relationship.to_node_type == "domain") & (Relationship.to_node_id == domain.id),
            )
        )
    ).all()
    linked_entities = []
    for relationship in relationships:
        if relationship.from_node_type == "entity":
            linked_entities.append(serialize_node(session, "entity", relationship.from_node_id))
        if relationship.to_node_type == "entity":
            linked_entities.append(serialize_node(session, "entity", relationship.to_node_id))
    return {
        "id": domain.id,
        "hostname": domain.hostname,
        "canonical_url": domain.canonical_url,
        "title": domain.title,
        "meta": domain.metadata_json,
        "linked_entities": [node for node in linked_entities if node],
    }


def get_contract_profile(session: Session, chain: str, address: str) -> dict[str, Any]:
    contract = session.scalar(
        select(Contract).where(Contract.chain == chain.lower(), Contract.address == address.lower())
    )
    if contract is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")
    relationships = session.scalars(
        select(Relationship).where(
            or_(
                (Relationship.from_node_type == "contract") & (Relationship.from_node_id == contract.id),
                (Relationship.to_node_type == "contract") & (Relationship.to_node_id == contract.id),
            )
        )
    ).all()
    related = []
    for relationship in relationships:
        other_type = relationship.from_node_type
        other_id = relationship.from_node_id
        if relationship.from_node_type == "contract" and relationship.from_node_id == contract.id:
            other_type, other_id = relationship.to_node_type, relationship.to_node_id
        related.append(serialize_node(session, other_type, other_id))
    return {
        "id": contract.id,
        "chain": contract.chain,
        "address": contract.address,
        "token_name": contract.token_name,
        "token_symbol": contract.token_symbol,
        "is_verified": contract.is_verified,
        "explorer_url": contract.explorer_url,
        "meta": contract.metadata_json,
        "related_nodes": [node for node in related if node],
    }


def get_wallet_profile(session: Session, chain: str, address: str) -> dict[str, Any]:
    wallet = session.scalar(select(Wallet).where(Wallet.chain == chain.lower(), Wallet.address == address.lower()))
    if wallet is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wallet not found")
    relationships = session.scalars(
        select(Relationship).where(
            or_(
                (Relationship.from_node_type == "wallet") & (Relationship.from_node_id == wallet.id),
                (Relationship.to_node_type == "wallet") & (Relationship.to_node_id == wallet.id),
            )
        )
    ).all()
    related = []
    for relationship in relationships:
        other_type = relationship.from_node_type
        other_id = relationship.from_node_id
        if relationship.from_node_type == "wallet" and relationship.from_node_id == wallet.id:
            other_type, other_id = relationship.to_node_type, relationship.to_node_id
        related.append(serialize_node(session, other_type, other_id))
    return {
        "id": wallet.id,
        "chain": wallet.chain,
        "address": wallet.address,
        "label": wallet.label,
        "meta": wallet.metadata_json,
        "related_nodes": [node for node in related if node],
    }


def get_jurisdiction_profile(session: Session, code: str) -> dict[str, Any]:
    jurisdiction = session.get(Jurisdiction, code.upper())
    if jurisdiction is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Jurisdiction not found")
    links = session.execute(
        select(EntityJurisdiction, Entity)
        .join(Entity, Entity.id == EntityJurisdiction.entity_id)
        .where(EntityJurisdiction.jurisdiction_code == jurisdiction.code)
    ).all()
    return {
        "code": jurisdiction.code,
        "name": jurisdiction.name,
        "meta": jurisdiction.metadata_json,
        "entities": [
            {
                "id": entity.id,
                "canonical_name": entity.canonical_name,
                "entity_type": entity.entity_type,
                "status": entity.current_status,
                "role": link.role,
            }
            for link, entity in links
        ],
    }


def get_diff(session: Session, from_value: datetime, to_value: datetime) -> dict[str, Any]:
    events = session.scalars(
        select(ChangeEvent)
        .where(ChangeEvent.first_seen_at >= from_value, ChangeEvent.first_seen_at <= to_value)
        .order_by(ChangeEvent.first_seen_at.desc())
    ).all()
    return {
        "from": from_value,
        "to": to_value,
        "events": [
            {
                "id": event.id,
                "entity_id": event.entity_id,
                "event_type": event.event_type,
                "summary": event.summary,
                "diff": event.diff_json,
                "first_seen_at": event.first_seen_at,
            }
            for event in events
        ],
    }
