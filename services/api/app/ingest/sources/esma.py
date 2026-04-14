from __future__ import annotations

import asyncio
import re
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.db.models import Source
from app.ingest.pipeline import (
    csv_rows,
    create_warning_notice,
    ensure_aliases,
    ensure_domain,
    ensure_jurisdiction,
    ensure_relationship,
    ensure_relationship_evidence,
    ensure_whitepaper,
    fetch_and_store_artifact,
    finish_ingestion_run,
    get_or_create_entity,
    parse_date,
    record_snapshot,
    start_ingestion_run,
    upsert_register_record,
)
from app.ingest.storage import LocalArtifactStorage
from app.matching.resolution import extract_hostnames


FILE_PROFILES = {
    "casps": {"status": "authorized", "record_type": "casp_register", "edge_type": "authorized_by"},
    "issuers_art": {"status": "authorized", "record_type": "art_issuer", "edge_type": "authorized_by"},
    "issuers_emt": {"status": "authorized", "record_type": "emt_issuer", "edge_type": "authorized_by"},
    "whitepapers_other": {
        "status": "whitepaper_notified",
        "record_type": "whitepaper_other",
        "edge_type": "disclosed_in",
    },
    "non_compliant_entities": {
        "status": "non_compliant",
        "record_type": "non_compliant_entity",
        "edge_type": "warned_by",
    },
}


def _publication_from_page(html: str) -> Any:
    match = re.search(r"Last update:\s*</[^>]+>\s*([^<]+)", html, re.IGNORECASE)
    if match:
        return parse_date(match.group(1))
    return None


def _split_pipe(value: str | None) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.split("|") if item.strip()]


def _row_name(row: dict[str, str]) -> str | None:
    return (
        row.get("ae_lei_name")
        or row.get("ae_commercial_name")
        or row.get("ae_lei_name_casp")
        or row.get("ae_name")
        or row.get("name")
    )


def _external_key(profile_key: str, row: dict[str, str], fallback_name: str) -> str:
    lei = row.get("ae_lei")
    website = row.get("ae_website") or row.get("wp_url")
    return "|".join(part for part in [profile_key, lei, fallback_name, website] if part)


async def ingest_esma(session: Session, settings: Settings) -> dict[str, int]:
    source = session.scalar(select(Source).where(Source.slug == "esma_mica"))
    if source is None:
        raise RuntimeError("ESMA source is not configured")

    storage = LocalArtifactStorage(settings.object_storage_root)
    run = start_ingestion_run(session, source, trigger="manual")
    metrics = {"artifacts": 0, "records": 0, "entities": 0}

    async with httpx.AsyncClient(timeout=90) as client:
        page = await client.get(settings.esma_mica_page_url, follow_redirects=True)
        page.raise_for_status()
        source_publication_date = _publication_from_page(page.text)

        for key, url in settings.esma_csv_urls.items():
            # Yield to event loop to keep health checks alive
            await asyncio.sleep(0)
            artifact = await fetch_and_store_artifact(
                session=session,
                client=client,
                source=source,
                storage=storage,
                artifact_key=key,
                artifact_type="csv",
                url=url,
                published_at=source_publication_date,
            )
            metrics["artifacts"] += 1
            if key == "field_dictionary":
                continue

            profile = FILE_PROFILES[key]
            for row in csv_rows(artifact.text):
                # Yield frequently to keep the event loop responsive on low-resource environments
                if metrics["records"] % 5 == 0:
                    await asyncio.sleep(0.01)
                
                subject_name = _row_name(row)
                if not subject_name:
                    continue
                entity = get_or_create_entity(
                    session,
                    name=subject_name,
                    entity_type="legal_entity",
                    status=profile["status"],
                    source_of_truth=source.slug,
                    metadata={"lei": row.get("ae_lei"), "home_member_state": row.get("ae_homeMemberState")},
                )
                metrics["entities"] += 1
                aliases = _split_pipe(row.get("ae_commercial_name"))
                if row.get("ae_lei_name_casp") and row.get("ae_lei_name_casp") != subject_name:
                    aliases.append(row["ae_lei_name_casp"])
                ensure_aliases(session, entity.id, aliases, artifact.artifact.id)

                home_state = row.get("ae_homeMemberState")
                if home_state:
                    ensure_jurisdiction(session, home_state, entity_id=entity.id, is_primary=True)

                for code in _split_pipe(row.get("ae_offerCode_cou")) + _split_pipe(row.get("ac_serviceCode_cou")):
                    ensure_jurisdiction(session, code, entity_id=entity.id, role="passported_to")

                regulator_name = row.get("ae_competentAuthority")
                regulator = None
                if regulator_name:
                    regulator = get_or_create_entity(
                        session,
                        name=regulator_name,
                        entity_type="regulator",
                        status="official",
                        source_of_truth=source.slug,
                    )
                    relationship = ensure_relationship(
                        session,
                        from_node_type="entity",
                        from_node_id=entity.id,
                        to_node_type="entity",
                        to_node_id=regulator.id,
                        edge_type=profile["edge_type"],
                    )
                    ensure_relationship_evidence(
                        session,
                        relationship_id=relationship.id,
                        source_artifact_id=artifact.artifact.id,
                        evidence_type="source_row",
                        field_path="ae_competentAuthority",
                        snippet=regulator_name,
                    )

                publication_date = (
                    parse_date(row.get("wp_lastupdate"))
                    or parse_date(row.get("ac_lastupdate"))
                    or parse_date(row.get("ae_lastupdate"))
                    or parse_date(row.get("ae_decision_date"))
                    or source_publication_date
                )
                effective_from = (
                    parse_date(row.get("ac_authorisationNotificationDate"))
                    or parse_date(row.get("wp_authorisationNotificationDate"))
                    or parse_date(row.get("ae_decision_date"))
                )
                effective_to = parse_date(row.get("ac_authorisationEndDate"))

                register_record = upsert_register_record(
                    session,
                    entity_id=entity.id,
                    source_id=source.id,
                    source_artifact_id=artifact.artifact.id,
                    regime="MiCA",
                    record_type=profile["record_type"],
                    external_key=_external_key(key, row, subject_name),
                    status=profile["status"],
                    publication_date=publication_date,
                    effective_from=effective_from,
                    effective_to=effective_to,
                    fields_json=row,
                )
                metrics["records"] += 1

                record_rel = ensure_relationship(
                    session,
                    from_node_type="entity",
                    from_node_id=entity.id,
                    to_node_type="register_record",
                    to_node_id=register_record.id,
                    edge_type="listed_in",
                )
                ensure_relationship_evidence(
                    session,
                    relationship_id=record_rel.id,
                    source_artifact_id=artifact.artifact.id,
                    evidence_type="source_row",
                    evidence_uri=artifact.artifact.remote_url,
                    snippet=subject_name,
                )

                for website_field in [row.get("ae_website"), row.get("ae_website_platform")]:
                    for host in extract_hostnames(website_field):
                        domain = ensure_domain(session, host)
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
                            evidence_type="source_row",
                            field_path="ae_website",
                            snippet=host,
                        )

                if row.get("wp_url"):
                    whitepaper = ensure_whitepaper(
                        session,
                        url=row["wp_url"].strip(),
                        entity_id=entity.id,
                        source_artifact_id=artifact.artifact.id,
                        publication_date=parse_date(row.get("wp_authorisationNotificationDate"))
                        or publication_date,
                        metadata={"comments": row.get("wp_comments")},
                    )
                    wp_rel = ensure_relationship(
                        session,
                        from_node_type="entity",
                        from_node_id=entity.id,
                        to_node_type="whitepaper",
                        to_node_id=whitepaper.id,
                        edge_type="disclosed_in",
                    )
                    ensure_relationship_evidence(
                        session,
                        relationship_id=wp_rel.id,
                        source_artifact_id=artifact.artifact.id,
                        evidence_type="source_row",
                        field_path="wp_url",
                        evidence_uri=row["wp_url"].strip(),
                    )

                if key == "non_compliant_entities":
                    comment_text = row.get("ae_comments") or ""
                    url_match = re.search(r"https?://\S+", comment_text)
                    warning = create_warning_notice(
                        session,
                        entity_id=entity.id,
                        source_id=source.id,
                        source_artifact_id=artifact.artifact.id,
                        title=f"{subject_name} flagged as non-compliant",
                        url=url_match.group(0) if url_match else None,
                        jurisdiction_code=home_state,
                        published_at=publication_date,
                        summary=row.get("ae_reason"),
                        fields_json=row,
                    )
                    warning_rel = ensure_relationship(
                        session,
                        from_node_type="entity",
                        from_node_id=entity.id,
                        to_node_type="warning_notice",
                        to_node_id=warning.id,
                        edge_type="warned_by",
                    )
                    ensure_relationship_evidence(
                        session,
                        relationship_id=warning_rel.id,
                        source_artifact_id=artifact.artifact.id,
                        evidence_type="source_row",
                        field_path="ae_reason",
                        snippet=row.get("ae_reason"),
                    )

                record_snapshot(
                    session,
                    scope=f"esma:{profile['record_type']}:{register_record.external_key}",
                    payload=row,
                    entity_id=entity.id,
                    source_id=source.id,
                    artifact_id=artifact.artifact.id,
                    summary_label=f"ESMA {profile['record_type']} for {subject_name}",
                )

        finish_ingestion_run(
            session,
            run,
            status="completed",
            metrics=metrics,
            artifact_id=run.artifact_id,
        )
    return metrics
