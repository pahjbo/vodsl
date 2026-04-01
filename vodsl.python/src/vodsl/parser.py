"""VODSL parser – loads the generated textX grammar and parses .vodsl files."""
from __future__ import annotations

from pathlib import Path
from typing import Any

from textx import metamodel_from_file

from vodsl.scoping import resolve_model

_GRAMMAR = Path(__file__).resolve().parent / "grammar" / "vodsl.tx"


def _get_metamodel():
    mm = metamodel_from_file(str(_GRAMMAR), use_regexp_group=True)
    # SINT is a regex rule returning a string; convert to int
    mm.register_obj_processors({
        "Multiplicity": _fix_multiplicity_types,
    })
    return mm


def _fix_multiplicity_types(mul):
    """Convert SINT string values to int on Multiplicity objects."""
    if isinstance(mul.maxOccurs, str):
        mul.maxOccurs = int(mul.maxOccurs)
    return mul


def parse_string(text: str, *, file_name: str = "<string>") -> Any:
    """Parse a VODSL source string and return the model."""
    mm = _get_metamodel()
    model = mm.model_from_str(text, file_name=file_name)
    resolve_model(model)
    return model


def parse_file(path: str | Path) -> Any:
    """Parse a VODSL source file and return the model."""
    path = Path(path)
    mm = _get_metamodel()
    model = mm.model_from_file(str(path))
    resolve_model(model, base_dir=path.parent)
    return model
