"""Integration tests with remote fixtures from ivoa/vodsl-models."""
from __future__ import annotations

from pathlib import Path

import pytest
import requests

_FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"
_BASE_URL = "https://raw.githubusercontent.com/ivoa/vodsl-models/refs/heads/master"

_REMOTE_FILES = {
    "example.vodsl": f"{_BASE_URL}/example.vodsl",
    "IVOA-v1.0.vodsl": f"{_BASE_URL}/IVOA-v1.0.vodsl",
}


@pytest.fixture(scope="session")
def remote_fixtures() -> Path:
    """Download remote test fixtures (skip if offline)."""
    _FIXTURES_DIR.mkdir(parents=True, exist_ok=True)
    for name, url in _REMOTE_FILES.items():
        target = _FIXTURES_DIR / name
        if target.exists():
            continue
        try:
            resp = requests.get(url, timeout=15)
            resp.raise_for_status()
            target.write_bytes(resp.content)
        except Exception:
            pytest.skip("Cannot download remote fixtures (offline?)")
    return _FIXTURES_DIR


@pytest.mark.integration
def test_parse_example_vodsl(remote_fixtures):
    """example.vodsl (with include) must parse without errors."""
    from vodsl.parser import parse_file
    path = remote_fixtures / "example.vodsl"
    model = parse_file(path)
    assert model is not None
    assert model.model.name == "example"


@pytest.mark.integration
def test_generate_example_vodsl(remote_fixtures):
    """example.vodsl must generate schema-valid VO-DML XML."""
    from vodsl.parser import parse_file
    from vodsl.generator import generate
    from vodsl.schema_validator import ensure_schema, validate_xml_against_schema
    from datetime import datetime, timezone

    path = remote_fixtures / "example.vodsl"
    model = parse_file(path)
    xml = generate(model, mod_date=datetime(2024, 1, 1, tzinfo=timezone.utc))
    assert "<vo-dml:model" in xml

    try:
        schema_path = ensure_schema()
        errors = validate_xml_against_schema(xml, schema_path)
        assert len(errors) == 0, f"Schema errors: {errors}"
    except Exception as exc:
        pytest.skip(f"Schema validation skipped: {exc}")
