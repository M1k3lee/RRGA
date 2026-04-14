from __future__ import annotations

import csv
import hashlib
import io
import json
from dataclasses import dataclass
from datetime import datetime
from typing import Any

import httpx
from dateutil import parser as date_parser
from sqlalchemy import select
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
    Snapshot,
    Source,
    SourceArtifact,
    Wallet,
    WarningNotice,
    Whitepaper,
)
from app.ingest.storage import LocalArtifactStorage
from app.matching.resolution import extract_hostnames, normalize_text


@dataclass(slots=True)
class ArtifactEnvelope:
    artifact: SourceArtifact
    raw_bytes: bytes
    text: str


def sha256_hexdigest(payload: bytes | str) -> str:
    raw = payload.encode("utf-8") if isinstance(payload, str) else payload
    return hashlib.sha256(raw).hexdigest()


def decode_payload(payload: bytes) -> str:
    for encoding in ("utf-8-sig", "utf-8", "cp1252", "latin-1"):
        try:
            return payload.decode(encoding)
        except UnicodeDecodeError:
            continue
    return payload.decode("utf-8", errors="ignore")


def parse_date(value: str | None) -> datetime | None:
    if not value:
        return None
    value = value.strip()
    if not value or value.lower() in {"n/a", "none"}:
        return None
    try:
        if "/" in value and len(value.split("/")) == 3:
            return datetime.strptime(value, "%d/%m/%Y")
        return date_parser.parse(value)
    except (ValueError, TypeError, OverflowError):
        return None


async def fetch_and_store_artifact(
    *,
    session: Session,
    client: httpx.AsyncClient,
    source: Source,
    storage: LocalArtifactStorage,
    artifact_key: str,
    artifact_type: str,
    url: str,
    published_at: datetime | None = None,
    headers: dict[str, str] | None = None,
) -> ArtifactEnvelope:
    import asyncio
    # Yield to event loop before network request
    await asyncio.sleep(0)
    response = await client.get(url, follow_redirects=True, headers=headers)
    response.raise_for_status()
    # Yield to event loop after network request
    await asyncio.sleep(0)
    raw_bytes = response.content
    checksum = sha256_hexdigest(raw_bytes)
    relative_path = f"{source.slug}/{artifact_key}/{checksum}.{artifact_type}"
    storage_uri = storage.write_bytes(relative_path, raw_bytes)
    artifact = SourceArtifact(
        source_id=source.id,
        artifact_key=artifact_key,
        artifact_type=artifact_type,
        remote_url=url,
        storage_uri=storage_uri,
        checksum_sha256=checksum,
        content_type=response.headers.get("content-type"),
        size_bytes=len(raw_bytes),
        http_status=response.status_code,
        published_at=published_at,
        metadata_json=dict(response.headers),
    )
    session.add(artifact)
    session.flush()
    return ArtifactEnvelope(artifact=artifact, raw_bytes=raw_bytes, text=decode_payload(raw_bytes))


from collections.abc import Generator


def csv_rows(text: str) -> Generator[dict[str, str], None, None]:
    reader = csv.DictReader(io.StringIO(text))
    for row in reader:
        yield {(key or "").replace("\ufeff", "").strip(): (value or "").strip() for key, value in row.items()}


def get_or_create_entity(
    session: Session,
    *,
    name: str,
    entity_type: str,
    status: str | None = None,
    source_of_truth: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> Entity:
    normalized = normalize_text(name)
    entity = session.scalar(
        select(Entity).where(
            Entity.normalized_name == normalized,
            Entity.entity_type == entity_type,
        )
    )
    now = datetime.utcnow()
    if entity is None:
        entity = Entity(
            canonical_name=name.strip(),
            normalized_name=normalized,
            entity_type=entity_type,
            current_status=status,
            source_of_truth=source_of_truth,
            first_seen_at=now,
            last_seen_at=now,
            metadata_json=metadata or {},
        )
        session.add(entity)
        session.flush()
    else:
        entity.canonical_name = name.strip()
        entity.current_status = status or entity.current_status
        entity.source_of_truth = source_of_truth or entity.source_of_truth
        entity.last_seen_at = now
        if metadata:
            entity.metadata_json = {**entity.metadata_json, **metadata}
    return entity


def ensure_aliases(
    session: Session,
    entity_id: str,
    aliases: list[str],
    source_artifact_id: str | None = None,
) -> None:
    existing = {
        alias.normalized_alias
        for alias in session.scalars(select(Alias).where(Alias.entity_id == entity_id)).all()
    }
    for alias in aliases:
        normalized = normalize_text(alias)
        if not normalized or normalized in existing:
            continue
        session.add(
            Alias(
                entity_id=entity_id,
                alias=alias.strip(),
                normalized_alias=normalized,
                source_artifact_id=source_artifact_id,
            )
        )
        existing.add(normalized)


def ensure_jurisdiction(
    session: Session,
    code: str,
    *,
    name: str | None = None,
    entity_id: str | None = None,
    role: str = "listed_in",
    is_primary: bool = False,
) -> Jurisdiction:
    jurisdiction = session.get(Jurisdiction, code)
    if jurisdiction is None:
        jurisdiction = Jurisdiction(code=code, name=name or code)
        session.add(jurisdiction)
        session.flush()
    elif name and jurisdiction.name == code:
        jurisdiction.name = name

    if entity_id:
        existing = session.scalar(
            select(EntityJurisdiction).where(
                EntityJurisdiction.entity_id == entity_id,
                EntityJurisdiction.jurisdiction_code == code,
            )
        )
        if existing is None:
            session.add(
                EntityJurisdiction(
                    entity_id=entity_id,
                    jurisdiction_code=code,
                    role=role,
                    is_primary=is_primary,
                )
            )
    return jurisdiction


def ensure_domain(session: Session, url_or_host: str) -> Domain | None:
    hostnames = extract_hostnames(url_or_host)
    if not hostnames:
        return None
    hostname = hostnames[0]
    domain = session.scalar(select(Domain).where(Domain.hostname == hostname))
    if domain is None:
        domain = Domain(hostname=hostname, canonical_url=url_or_host)
        session.add(domain)
        session.flush()
    elif url_or_host and not domain.canonical_url:
        domain.canonical_url = url_or_host
    return domain


def ensure_contract(
    session: Session,
    *,
    chain: str,
    address: str,
    metadata: dict[str, Any] | None = None,
    token_symbol: str | None = None,
    token_name: str | None = None,
) -> Contract:
    contract = session.scalar(
        select(Contract).where(Contract.chain == chain.lower(), Contract.address == address.lower())
    )
    if contract is None:
        contract = Contract(
            chain=chain.lower(),
            address=address.lower(),
            token_symbol=token_symbol,
            token_name=token_name,
            metadata_json=metadata or {},
        )
        session.add(contract)
        session.flush()
    else:
        contract.token_symbol = token_symbol or contract.token_symbol
        contract.token_name = token_name or contract.token_name
        if metadata:
            contract.metadata_json = {**contract.metadata_json, **metadata}
    return contract


def ensure_wallet(
    session: Session,
    *,
    chain: str,
    address: str,
    label: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> Wallet:
    wallet = session.scalar(
        select(Wallet).where(Wallet.chain == chain.lower(), Wallet.address == address.lower())
    )
    if wallet is None:
        wallet = Wallet(
            chain=chain.lower(),
            address=address.lower(),
            label=label,
            metadata_json=metadata or {},
        )
        session.add(wallet)
        session.flush()
    else:
        wallet.label = label or wallet.label
        if metadata:
            wallet.metadata_json = {**wallet.metadata_json, **metadata}
    return wallet


def ensure_whitepaper(
    session: Session,
    *,
    url: str,
    entity_id: str | None,
    source_artifact_id: str | None,
    title: str | None = None,
    publication_date: datetime | None = None,
    metadata: dict[str, Any] | None = None,
) -> Whitepaper:
    whitepaper = session.scalar(select(Whitepaper).where(Whitepaper.url == url))
    if whitepaper is None:
        whitepaper = Whitepaper(
            url=url,
            entity_id=entity_id,
            title=title,
            publication_date=publication_date,
            source_artifact_id=source_artifact_id,
            metadata_json=metadata or {},
        )
        session.add(whitepaper)
        session.flush()
    else:
        whitepaper.entity_id = entity_id or whitepaper.entity_id
        whitepaper.title = title or whitepaper.title
        whitepaper.publication_date = publication_date or whitepaper.publication_date
        if metadata:
            whitepaper.metadata_json = {**whitepaper.metadata_json, **metadata}
    return whitepaper


def ensure_relationship(
    session: Session,
    *,
    from_node_type: str,
    from_node_id: str,
    to_node_type: str,
    to_node_id: str,
    edge_type: str,
    is_inferred: bool = False,
    confidence: float = 1.0,
    explanation: str | None = None,
    match_reasons: list[str] | None = None,
    matched_fields: list[str] | None = None,
) -> Relationship:
    relationship = session.scalar(
        select(Relationship).where(
            Relationship.from_node_type == from_node_type,
            Relationship.from_node_id == from_node_id,
            Relationship.to_node_type == to_node_type,
            Relationship.to_node_id == to_node_id,
            Relationship.edge_type == edge_type,
        )
    )
    if relationship is None:
        relationship = Relationship(
            from_node_type=from_node_type,
            from_node_id=from_node_id,
            to_node_type=to_node_type,
            to_node_id=to_node_id,
            edge_type=edge_type,
            is_inferred=is_inferred,
            confidence=confidence,
            explanation=explanation,
            match_reasons_json=match_reasons or [],
            matched_fields_json=matched_fields or [],
            source_count=1,
            last_validated_at=datetime.utcnow(),
        )
        session.add(relationship)
        session.flush()
    else:
        relationship.source_count += 1
        relationship.last_validated_at = datetime.utcnow()
    return relationship


def ensure_relationship_evidence(
    session: Session,
    *,
    relationship_id: str,
    source_artifact_id: str | None,
    evidence_type: str,
    evidence_uri: str | None = None,
    field_path: str | None = None,
    snippet: str | None = None,
) -> None:
    session.add(
        RelationshipEvidence(
            relationship_id=relationship_id,
            source_artifact_id=source_artifact_id,
            evidence_type=evidence_type,
            evidence_uri=evidence_uri,
            field_path=field_path,
            snippet=snippet,
        )
    )


def upsert_register_record(
    session: Session,
    *,
    entity_id: str | None,
    source_id: str,
    source_artifact_id: str,
    regime: str,
    record_type: str,
    external_key: str,
    status: str | None,
    publication_date: datetime | None,
    effective_from: datetime | None,
    effective_to: datetime | None,
    fields_json: dict[str, Any],
) -> RegisterRecord:
    record = session.scalar(
        select(RegisterRecord).where(
            RegisterRecord.source_id == source_id,
            RegisterRecord.external_key == external_key,
            RegisterRecord.record_type == record_type,
        )
    )
    if record is None:
        record = RegisterRecord(
            entity_id=entity_id,
            source_id=source_id,
            source_artifact_id=source_artifact_id,
            regime=regime,
            record_type=record_type,
            external_key=external_key,
            status=status,
            publication_date=publication_date,
            effective_from=effective_from,
            effective_to=effective_to,
            fields_json=fields_json,
        )
        session.add(record)
        session.flush()
    else:
        record.entity_id = entity_id or record.entity_id
        record.source_artifact_id = source_artifact_id
        record.status = status or record.status
        record.publication_date = publication_date or record.publication_date
        record.effective_from = effective_from or record.effective_from
        record.effective_to = effective_to or record.effective_to
        record.fields_json = fields_json
    return record


def upsert_sanctions_record(
    session: Session,
    *,
    entity_id: str | None,
    source_id: str,
    source_artifact_id: str,
    list_type: str,
    sanctions_uid: str,
    publication_date: datetime | None,
    program_codes: list[str],
    fields_json: dict[str, Any],
) -> SanctionsRecord:
    record = session.scalar(
        select(SanctionsRecord).where(
            SanctionsRecord.source_id == source_id,
            SanctionsRecord.sanctions_uid == sanctions_uid,
        )
    )
    if record is None:
        record = SanctionsRecord(
            entity_id=entity_id,
            source_id=source_id,
            source_artifact_id=source_artifact_id,
            list_type=list_type,
            sanctions_uid=sanctions_uid,
            status="sanctioned",
            publication_date=publication_date,
            program_codes=program_codes,
            fields_json=fields_json,
        )
        session.add(record)
        session.flush()
    else:
        record.entity_id = entity_id or record.entity_id
        record.source_artifact_id = source_artifact_id
        record.publication_date = publication_date or record.publication_date
        record.program_codes = program_codes
        record.fields_json = fields_json
    return record


def create_warning_notice(
    session: Session,
    *,
    entity_id: str | None,
    source_id: str,
    source_artifact_id: str,
    title: str,
    url: str | None,
    jurisdiction_code: str | None,
    published_at: datetime | None,
    summary: str | None,
    fields_json: dict[str, Any],
) -> WarningNotice:
    warning = WarningNotice(
        entity_id=entity_id,
        source_id=source_id,
        source_artifact_id=source_artifact_id,
        title=title,
        url=url,
        jurisdiction_code=jurisdiction_code,
        published_at=published_at,
        summary=summary,
        fields_json=fields_json,
    )
    session.add(warning)
    session.flush()
    return warning


def record_snapshot(
    session: Session,
    *,
    scope: str,
    payload: dict[str, Any],
    entity_id: str | None,
    source_id: str | None,
    artifact_id: str | None,
    summary_label: str,
) -> None:
    checksum = sha256_hexdigest(json.dumps(payload, sort_keys=True, default=str))
    latest = session.scalar(
        select(Snapshot)
        .where(Snapshot.source_scope == scope)
        .order_by(Snapshot.snapshot_time.desc())
    )
    if latest and latest.checksum_sha256 == checksum:
        return

    snapshot = Snapshot(
        source_scope=scope,
        entity_id=entity_id,
        source_id=source_id,
        artifact_id=artifact_id,
        checksum_sha256=checksum,
        data_json=payload,
    )
    session.add(snapshot)

    if latest is None:
        session.add(
            ChangeEvent(
                entity_id=entity_id,
                source_id=source_id,
                artifact_id=artifact_id,
                event_type="first_seen",
                summary=f"{summary_label} first observed",
                diff_json={"after": payload},
            )
        )
    else:
        session.add(
            ChangeEvent(
                entity_id=entity_id,
                source_id=source_id,
                artifact_id=artifact_id,
                event_type="updated",
                summary=f"{summary_label} changed",
                diff_json={"before": latest.data_json, "after": payload},
            )
        )


def start_ingestion_run(session: Session, source: Source, trigger: str = "manual") -> IngestionRun:
    run = IngestionRun(source_id=source.id, trigger=trigger, status="running")
    session.add(run)
    session.flush()
    return run


def finish_ingestion_run(
    session: Session,
    run: IngestionRun,
    *,
    status: str,
    metrics: dict[str, Any],
    artifact_id: str | None = None,
    error: str | None = None,
) -> None:
    run.status = status
    run.finished_at = datetime.utcnow()
    run.metrics_json = metrics
    run.artifact_id = artifact_id
    run.error = error
    session.commit()
