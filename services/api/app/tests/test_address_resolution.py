import json

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db import models  # noqa: F401
from app.db.models import Entity, Source, SourceArtifact
from app.db.session import Base
from app.ingest.sources.coingecko import materialize_contracts_from_catalog_address
from app.matching.resolution import normalize_text
from app.services.catalog import get_node_graph, search_registry

USDC_ETH = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"


def make_session():
    engine = create_engine("sqlite:///:memory:", future=True)
    Base.metadata.create_all(bind=engine)
    testing_session = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
    return testing_session()


def test_search_registry_does_not_fuzzy_match_hex_addresses() -> None:
    session = make_session()
    try:
        session.add(
            Entity(
                canonical_name="8",
                normalized_name=normalize_text("8"),
                entity_type="brand",
                current_status="market_metadata",
                metadata_json={},
            )
        )
        session.commit()

        assert search_registry(session, USDC_ETH) == []
    finally:
        session.close()


def test_materialized_contract_address_becomes_searchable_and_graphable(tmp_path) -> None:
    session = make_session()
    try:
        source = Source(
            slug="coingecko",
            name="CoinGecko Public API",
            source_type="market_metadata",
            base_url="https://api.coingecko.com",
            is_official=False,
            metadata_json={},
        )
        session.add(source)
        session.flush()

        payload = [
            {
                "id": "usd-coin",
                "symbol": "usdc",
                "name": "USDC",
                "platforms": {
                    "ethereum": USDC_ETH,
                    "base": "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
                },
            }
        ]
        artifact_path = tmp_path / "catalog.json"
        artifact_path.write_text(json.dumps(payload), encoding="utf-8")

        session.add(
            SourceArtifact(
                source_id=source.id,
                artifact_key="catalog",
                artifact_type="json",
                remote_url="https://api.coingecko.com/api/v3/coins/list?include_platform=true",
                storage_uri=str(artifact_path),
                checksum_sha256="0" * 64,
                content_type="application/json",
                size_bytes=artifact_path.stat().st_size,
                http_status=200,
                metadata_json={},
            )
        )
        session.commit()

        contracts = materialize_contracts_from_catalog_address(session, address=USDC_ETH)
        assert len(contracts) == 1

        results = search_registry(session, USDC_ETH)
        assert len(results) == 1
        assert results[0]["node_type"] == "contract"
        assert results[0]["label"] == "USDC"

        graph = get_node_graph(session, "contract", contracts[0].id)
        graph_node_ids = {node["id"] for node in graph["nodes"]}
        assert f"contract:{contracts[0].id}" in graph_node_ids
        assert any(node_id.startswith("entity:") for node_id in graph_node_ids)
        assert graph["edges"]
    finally:
        session.close()
