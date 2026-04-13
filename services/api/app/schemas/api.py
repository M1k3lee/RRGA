from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class SearchResult(BaseModel):
    id: str
    node_type: str
    label: str
    score: float
    current_status: str | None = None
    source_of_truth: str | None = None
    matched_on: list[str] = Field(default_factory=list)


class SearchResponse(BaseModel):
    query: str
    results: list[SearchResult]


class GraphNode(BaseModel):
    id: str
    node_type: str
    label: str
    status: str | None = None
    meta: dict[str, Any] = Field(default_factory=dict)


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    edge_type: str
    confidence: float
    inferred: bool


class GraphResponse(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]


class EvidenceItem(BaseModel):
    id: str
    artifact_id: str | None = None
    source: str
    evidence_type: str
    uri: str | None = None
    snippet: str | None = None
    captured_at: datetime | None = None


class TimelineEvent(BaseModel):
    id: str
    event_type: str
    summary: str
    first_seen_at: datetime
    last_seen_at: datetime
    diff: dict[str, Any] = Field(default_factory=dict)


class SourceStatus(BaseModel):
    slug: str
    name: str
    source_type: str
    enabled: bool
    last_artifact_at: datetime | None = None
    last_run_status: str | None = None
    artifact_count: int = 0


class WatchlistCreateRequest(BaseModel):
    label: str | None = None
    target_type: str
    target_value: str
    rule_type: str = "status_change"
    delivery_channel: str = "inbox"
    threshold: float | None = None
    filters: dict[str, Any] = Field(default_factory=dict)


class AlertTestRequest(BaseModel):
    title: str = "RRGA test alert"
    payload: dict[str, Any] = Field(default_factory=dict)
