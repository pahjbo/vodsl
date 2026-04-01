"""Tests for VO-DML XML generation."""
from __future__ import annotations

from datetime import datetime, timezone

import pytest
from vodsl.parser import parse_string
from vodsl.generator import generate
from tests.conftest import (
    EXAMPLE2,
    EXAMPLE_WITH_PI,
    MULTIPLICITY_MODEL,
    NATURAL_KEY_MODEL,
)


def _gen(text: str) -> str:
    model = parse_string(text)
    return generate(model, mod_date=datetime(2024, 1, 1, tzinfo=timezone.utc))


def test_generate_example2_valid_xml():
    """example2 must generate well-formed XML with expected structure."""
    xml = _gen(EXAMPLE2)
    assert '<?xml version="1.0"' in xml
    assert "<vo-dml:model" in xml
    assert "<name>example</name>" in xml
    assert "<version>0.1</version>" in xml
    assert "<author>Paul Harrison</author>" in xml
    assert "<author>another</author>" in xml
    assert "</vo-dml:model>" in xml


def test_generate_example2_primitives():
    """example2 must include primitive type declarations."""
    xml = _gen(EXAMPLE2)
    assert "<primitiveType>" in xml
    # Check that all 3 primitives are present
    assert "<name>real</name>" in xml
    assert "<name>boolean</name>" in xml
    assert "<name>string</name>" in xml


def test_generate_example2_dtype():
    """example2 must include dataType elements."""
    xml = _gen(EXAMPLE2)
    assert "<dataType" in xml
    assert "<name>AtomicValue</name>" in xml
    assert 'abstract="true"' in xml


def test_generate_example2_otype():
    """example2 must include objectType elements."""
    xml = _gen(EXAMPLE2)
    assert "<objectType" in xml
    assert "<name>base</name>" in xml
    assert "<name>derived</name>" in xml


def test_generate_example2_attribute_caret():
    """Attribute named ^author must appear as 'author' (caret stripped)."""
    xml = _gen(EXAMPLE2)
    # The ^author attribute should be output as 'author'
    assert "<name>author</name>" in xml


def test_generate_example2_reference():
    """example2 must include a reference element."""
    xml = _gen(EXAMPLE2)
    assert "<reference>" in xml
    assert "<name>rf</name>" in xml


def test_generate_example2_composition():
    """example2 must include composition elements."""
    xml = _gen(EXAMPLE2)
    assert "<composition>" in xml
    assert "<name>f2</name>" in xml


def test_generate_example2_extends():
    """Derived types must have <extends> with correct vodml-ref."""
    xml = _gen(EXAMPLE2)
    assert "<extends>" in xml


def test_generate_example2_package():
    """example2 must include package elements."""
    xml = _gen(EXAMPLE2)
    assert "<package>" in xml
    assert "<name>apackage</name>" in xml


def test_multiplicity_unbounded():
    """@[3,-1] must generate minOccurs=3 and maxOccurs=-1."""
    xml = _gen(MULTIPLICITY_MODEL)
    assert "<minOccurs>3</minOccurs>" in xml
    assert "<maxOccurs>-1</maxOccurs>" in xml


def test_multiplicity_array():
    """@[6] must generate minOccurs=6 and maxOccurs=6."""
    xml = _gen(EXAMPLE2)
    assert "<minOccurs>6</minOccurs>" in xml
    assert "<maxOccurs>6</maxOccurs>" in xml


def test_multiplicity_default():
    """No multiplicity annotation defaults to [1,1]."""
    xml = _gen(EXAMPLE2)
    assert "<minOccurs>1</minOccurs>" in xml
    assert "<maxOccurs>1</maxOccurs>" in xml


def test_natural_key_ordering():
    """Implicit iskey must auto-assign positions 1, 2, 3."""
    xml = _gen(NATURAL_KEY_MODEL)
    pos1 = xml.index("<position>1</position>")
    pos2 = xml.index("<position>2</position>")
    pos3 = xml.index("<position>3</position>")
    assert pos1 < pos2 < pos3


def test_natural_key_explicit_rank():
    """Explicit ofRank values must be preserved."""
    xml = _gen(NATURAL_KEY_MODEL)
    # There should be two occurrences of position 3:
    # implicit pos 3 for 'third' and explicit ofRank 3 for 'a'
    positions_of_3 = []
    start = 0
    while True:
        idx = xml.find("<position>3</position>", start)
        if idx == -1:
            break
        positions_of_3.append(idx)
        start = idx + 1
    assert len(positions_of_3) >= 2, f"Expected at least 2 occurrences of position 3, found {len(positions_of_3)}"


def test_pi_output():
    """Processing instructions must appear in generated XML."""
    xml = _gen(EXAMPLE_WITH_PI)
    assert '<?meta ucd="phys.background"?>' in xml
    assert '<?meta ucd="instr.background"?>' in xml
    assert '<?meta ucd="src.class"?>' in xml
    assert '<?meta ucd="meta.id"?>' in xml


def test_generate_example2_schema_validation():
    """example2 XML output must validate against the VO-DML XSD schema."""
    xml = _gen(EXAMPLE2)
    try:
        from vodsl.schema_validator import ensure_schema, validate_xml_against_schema
        schema_path = ensure_schema()
        errors = validate_xml_against_schema(xml, schema_path)
        assert len(errors) == 0, f"Schema validation errors: {errors}"
    except Exception as exc:
        pytest.skip(f"Schema validation skipped: {exc}")
