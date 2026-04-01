"""Tests that generate_grammar.py produces a valid textX grammar."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import pytest
from textx import metamodel_from_file

_GRAMMAR = Path(__file__).resolve().parent.parent / "src" / "vodsl" / "grammar" / "vodsl.tx"
_GENERATOR = Path(__file__).resolve().parent.parent / "generate_grammar.py"


def test_grammar_file_exists():
    """Grammar file must exist (generated before running tests)."""
    assert _GRAMMAR.exists(), f"Grammar file not found: {_GRAMMAR}"


def test_grammar_has_hash_stamp():
    """Generated grammar must contain the Xtext SHA-256 hash."""
    content = _GRAMMAR.read_text()
    assert "SHA-256:" in content


def test_grammar_loads_as_metamodel():
    """textX must be able to load the grammar without errors."""
    mm = metamodel_from_file(str(_GRAMMAR), use_regexp_group=True)
    assert mm is not None
    # Check that critical classes exist
    for name in [
        "VoDataModel", "ModelDeclaration", "PrimitiveType",
        "DataType", "ObjectType", "Enumeration",
        "Attribute", "Reference", "Composition",
        "Multiplicity", "Constraint", "ProcessingInstruction",
    ]:
        assert name in mm, f"Class {name} missing from metamodel"


def test_regeneration_is_idempotent():
    """Running generate_grammar.py twice must produce identical output."""
    result = subprocess.run(
        [sys.executable, str(_GENERATOR)],
        capture_output=True, text=True,
    )
    assert result.returncode == 0, result.stderr
    content_after = _GRAMMAR.read_text()
    # Run again
    result2 = subprocess.run(
        [sys.executable, str(_GENERATOR)],
        capture_output=True, text=True,
    )
    assert result2.returncode == 0, result2.stderr
    assert _GRAMMAR.read_text() == content_after
