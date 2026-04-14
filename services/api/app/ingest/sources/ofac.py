from __future__ import annotations

import asyncio
import io
import xml.etree.ElementTree as ET
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.db.models import Source
from app.ingest.pipeline import (
    ensure_aliases,
    ensure_domain,
    ensure_relationship,
    ensure_relationship_evidence,
    ensure_wallet,
    fetch_and_store_artifact,
    finish_ingestion_run,
    get_or_create_entity,
    parse_date,
    record_snapshot,
    start_ingestion_run,
    upsert_sanctions_record,
)
from app.ingest.storage import LocalArtifactStorage

NAMESPACE = {"ofac": "https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/XML"}


def _text(node: ET.Element | None, path: str) -> str | None:
    if node is None:
        return None
    # iterparse doesn't support the ofac: prefix in find(), it expects {url}tag
    full_path = path.replace("ofac:", f"{{{NAMESPACE['ofac']}}}")
    found = node.find(full_path)
    if found is None or found.text is None:
        return None
    return found.text.strip()


def _names(entry: ET.Element) -> tuple[str, list[str]]:
    first_name = _text(entry, "ofac:firstName")
    last_name = _text(entry, "ofac:lastName") or ""
    label = " ".join(part for part in [first_name, last_name] if part).strip() or last_name
    aliases = []
    aka_list_path = f"{{{NAMESPACE['ofac']}}}akaList/{{{NAMESPACE['ofac']}}}aka"
    for aka in entry.findall(aka_list_path):
        alias_first = _text(aka, "ofac:firstName")
        alias_last = _text(aka, "ofac:lastName") or ""
        alias = " ".join(part for part in [alias_first, alias_last] if part).strip() or alias_last
        if alias:
            aliases.append(alias)
    return label, aliases


def _collect_programs(entry: ET.Element) -> list[str]:
    program_path = f"{{{NAMESPACE['ofac']}}}programList/{{{NAMESPACE['ofac']}}}program"
    return [
        program.text.strip()
        for program in entry.findall(program_path)
        if program.text
    ]


def _collect_id_metadata(entry: ET.Element) -> tuple[list[dict[str, Any]], list[tuple[str, str]], list[str]]:
    identifiers: list[dict[str, Any]] = []
    wallets: list[tuple[str, str]] = []
    websites: list[str] = []
    id_list_path = f"{{{NAMESPACE['ofac']}}}idList/{{{NAMESPACE['ofac']}}}id"
    for item in entry.findall(id_list_path):
        id_type = _text(item, "ofac:idType") or ""
        id_number = _text(item, "ofac:idNumber") or ""
        if not id_number:
            continue
        identifiers.append({"type": id_type, "value": id_number})
        lowered = id_type.lower()
        if "digital currency address" in lowered:
            chain = id_type.split("-")[-1].strip().lower() if "-" in id_type else "unknown"
            wallets.append((chain, id_number))
        if "website" in lowered or "url" in lowered:
            websites.append(id_number)
    return identifiers, wallets, websites


async def ingest_ofac(session: Session, settings: Settings, slug: str) -> dict[str, int]:
    source = session.scalar(select(Source).where(Source.slug == slug))
    if source is None:
        raise RuntimeError(f"Source {slug} is not configured")

    storage = LocalArtifactStorage(settings.object_storage_root)
    run = start_ingestion_run(session, source, trigger="manual")
    metrics = {"artifacts": 0, "records": 0, "entities": 0, "wallets": 0}
    url = settings.ofac_sdn_url if slug == "ofac_sdn" else settings.ofac_consolidated_url
    list_type = "SDN" if slug == "ofac_sdn" else "NON_SDN"

    async with httpx.AsyncClient(timeout=120) as client:
        artifact = await fetch_and_store_artifact(
            session=session,
            client=client,
            source=source,
            storage=storage,
            artifact_key=list_type.lower(),
            artifact_type="xml",
            url=url,
        )
        metrics["artifacts"] += 1
        
        # Use iterparse to handle large XML files with low memory and frequent event loop yielding
        context = ET.iterparse(io.BytesIO(artifact.raw_bytes), events=("start", "end"))
        publication_date = None
        
        for event, elem in context:
            if event == "end" and elem.tag == f"{{{NAMESPACE['ofac']}}}Publish_Date":
                publication_date = parse_date(elem.text)
                continue
            
            if event == "end" and elem.tag == f"{{{NAMESPACE['ofac']}}}sdnEntry":
                entry = elem
                
                # Moderate yielding for Render stability (50ms pause every 5 records)
                if metrics["records"] % 5 == 0:
                    await asyncio.sleep(0.05)
                
                uid = _text(entry, "ofac:uid")
                label, aliases = _names(entry)
                if not uid or not label:
                    # Clear processed element to free memory
                    elem.clear()
                    continue

                entity = get_or_create_entity(
                    session,
                    name=label,
                    entity_type=(_text(entry, "ofac:sdnType") or "sanctions_subject").lower(),
                    status="sanctioned",
                    source_of_truth=source.slug,
                    metadata={"ofac_uid": uid},
                )
                metrics["entities"] += 1
                ensure_aliases(session, entity.id, aliases, artifact.artifact.id)

                programs = _collect_programs(entry)
                identifiers, wallets, websites = _collect_id_metadata(entry)
                sanctions_record = upsert_sanctions_record(
                    session,
                    entity_id=entity.id,
                    source_id=source.id,
                    source_artifact_id=artifact.artifact.id,
                    list_type=list_type,
                    sanctions_uid=uid,
                    publication_date=publication_date,
                    program_codes=programs,
                    fields_json={
                        "uid": uid,
                        "label": label,
                        "sdnType": _text(entry, "ofac:sdnType"),
                        "programs": programs,
                        "identifiers": identifiers,
                    },
                )
                metrics["records"] += 1
                sanctions_rel = ensure_relationship(
                    session,
                    from_node_type="entity",
                    from_node_id=entity.id,
                    to_node_type="sanctions_record",
                    to_node_id=sanctions_record.id,
                    edge_type="sanctioned_as",
                )
                ensure_relationship_evidence(
                    session,
                    relationship_id=sanctions_rel.id,
                    source_artifact_id=artifact.artifact.id,
                    evidence_type="xml_entry",
                    evidence_uri=artifact.artifact.remote_url,
                    snippet=label,
                )

                for chain, address in wallets:
                    wallet = ensure_wallet(
                        session,
                        chain=chain,
                        address=address,
                        label=label,
                        metadata={"source": "ofac"},
                    )
                    metrics["wallets"] += 1
                    wallet_rel = ensure_relationship(
                        session,
                        from_node_type="entity",
                        from_node_id=entity.id,
                        to_node_type="wallet",
                        to_node_id=wallet.id,
                        edge_type="linked_wallet",
                    )
                    ensure_relationship_evidence(
                        session,
                        relationship_id=wallet_rel.id,
                        source_artifact_id=artifact.artifact.id,
                        evidence_type="identifier",
                        field_path="idList.id",
                        snippet=address,
                    )

                for website in websites:
                    domain = ensure_domain(session, website)
                    if domain is None:
                        continue
                    domain_rel = ensure_relationship(
                        session,
                        from_node_type="entity",
                        from_node_id=entity.id,
                        to_node_type="domain",
                        to_node_id=domain.id,
                        edge_type="linked_domain",
                    )
                    ensure_relationship_evidence(
                        session,
                        relationship_id=domain_rel.id,
                        source_artifact_id=artifact.artifact.id,
                        evidence_type="identifier",
                        field_path="idList.id",
                        snippet=website,
                    )

                record_snapshot(
                    session,
                    scope=f"ofac:{list_type}:{uid}",
                    payload={
                        "uid": uid,
                        "label": label,
                        "programs": programs,
                        "identifiers": identifiers,
                    },
                    entity_id=entity.id,
                    source_id=source.id,
                    artifact_id=artifact.artifact.id,
                    summary_label=f"OFAC {list_type} entry {label}",
                )
                
                # Clear processed element to free memory
                elem.clear()

        finish_ingestion_run(session, run, status="completed", metrics=metrics, artifact_id=artifact.artifact.id)
    return metrics
