from app.matching.resolution import extract_hostnames, normalize_text, score_query_against_candidate


def test_normalize_text_collapses_noise() -> None:
    assert normalize_text("https://WWW.Example.com / MiCA ") == "example com mica"


def test_extract_hostnames_handles_pipe_delimited_values() -> None:
    assert extract_hostnames("https://alpha.example.com|beta.example.com") == [
        "alpha.example.com",
        "beta.example.com",
    ]


def test_score_query_prefers_exact_matches() -> None:
    result = score_query_against_candidate("Bitpanda", "Bitpanda")
    assert result.score == 1.0
    assert "exact_text_match" in result.reasons
