from __future__ import annotations

import re
from dataclasses import dataclass
from urllib.parse import urlparse

from rapidfuzz import fuzz


def normalize_text(value: str | None) -> str:
    if not value:
        return ""
    lowered = value.strip().lower()
    lowered = re.sub(r"https?://", "", lowered)
    lowered = re.sub(r"www\.", "", lowered)
    lowered = re.sub(r"[^a-z0-9]+", " ", lowered)
    return re.sub(r"\s+", " ", lowered).strip()


def is_evm_address(value: str | None) -> bool:
    if not value:
        return False
    return bool(re.fullmatch(r"0x[a-fA-F0-9]{40}", value.strip()))


def extract_hostnames(value: str | None) -> list[str]:
    if not value:
        return []
    candidates = []
    for part in value.split("|"):
        raw = part.strip()
        if not raw:
            continue
        if not raw.startswith(("http://", "https://")):
            raw = f"https://{raw}"
        parsed = urlparse(raw)
        hostname = parsed.netloc or parsed.path
        hostname = hostname.lower().strip("/")
        hostname = hostname.removeprefix("www.")
        if hostname:
            candidates.append(hostname)
    return list(dict.fromkeys(candidates))


@dataclass(slots=True)
class MatchScore:
    value: str
    normalized: str
    score: float
    reasons: list[str]


def score_query_against_candidate(query: str, candidate: str) -> MatchScore:
    normalized_query = normalize_text(query)
    normalized_candidate = normalize_text(candidate)
    if not normalized_query or not normalized_candidate:
        return MatchScore(candidate, normalized_candidate, 0.0, [])

    exact = normalized_query == normalized_candidate
    partial = normalized_query in normalized_candidate
    fuzzy = fuzz.WRatio(normalized_query, normalized_candidate) / 100
    score = max(1.0 if exact else 0.0, 0.92 if partial else 0.0, fuzzy)
    reasons = []
    if exact:
        reasons.append("exact_text_match")
    if partial:
        reasons.append("substring_match")
    if fuzzy >= 0.8:
        reasons.append("high_fuzzy_similarity")
    return MatchScore(candidate, normalized_candidate, score, reasons)
