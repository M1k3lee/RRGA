from app.ingest.sources.esma import _external_key, _row_name


def test_row_name_prefers_lei_name_from_real_esma_shape() -> None:
    row = {
        "ae_lei_name": "Bybit EU GmbH",
        "ae_commercial_name": "Bybit",
        "ae_website": "https://www.bybit.eu",
    }
    assert _row_name(row) == "Bybit EU GmbH"


def test_external_key_includes_profile_lei_name_and_url() -> None:
    row = {
        "ae_lei": "5299005V5GBSN2A4C303",
        "ae_website": "https://www.bybit.eu",
    }
    assert _external_key("casps", row, "Bybit EU GmbH") == "casps|5299005V5GBSN2A4C303|Bybit EU GmbH|https://www.bybit.eu"
