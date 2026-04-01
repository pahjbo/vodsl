"""XSD schema validation for generated VO-DML XML."""
from __future__ import annotations

from pathlib import Path

from lxml import etree
import requests

_SCHEMA_URL = (
    "https://raw.githubusercontent.com/ivoa/vo-dml/refs/heads/main/xsd/vo-dml-v1.0.xsd"
)
_SCHEMA_DIR = Path(__file__).resolve().parent / "schema"
_SCHEMA_PATH = _SCHEMA_DIR / "vo-dml-v1.0.xsd"


def ensure_schema(refresh: bool = False) -> Path:
    """Download and cache the VO-DML XSD schema if needed."""
    if _SCHEMA_PATH.exists() and not refresh:
        return _SCHEMA_PATH
    _SCHEMA_DIR.mkdir(parents=True, exist_ok=True)
    resp = requests.get(_SCHEMA_URL, timeout=30)
    resp.raise_for_status()
    _SCHEMA_PATH.write_bytes(resp.content)
    return _SCHEMA_PATH


def validate_xml_against_schema(xml_string: str, schema_path: Path) -> list[str]:
    """Validate *xml_string* against the XSD at *schema_path*."""
    schema_doc = etree.parse(str(schema_path))
    schema = etree.XMLSchema(schema_doc)
    doc = etree.fromstring(xml_string.encode("utf-8"))
    if schema.validate(doc):
        return []
    return [str(e) for e in schema.error_log]
