"""Tests that VODSL examples parse without errors."""
from __future__ import annotations

import pytest
from vodsl.parser import parse_string
from tests.conftest import EXAMPLE2, EXAMPLE_WITH_PI, MULTIPLICITY_MODEL, NATURAL_KEY_MODEL


def test_parse_example2():
    """example2 from BaseTest.xtend must parse cleanly."""
    model = parse_string(EXAMPLE2)
    assert model is not None
    assert model.model.name == "example"
    assert model.model.version == "0.1"
    assert len(model.model.authors) == 2


def test_parse_example_with_pi():
    """exampleWithPI must parse, with processing instructions attached."""
    model = parse_string(EXAMPLE_WITH_PI)
    assert model is not None
    assert model.model.name == "example"
    # Find Flux dtype
    flux = None
    for e in model.elements:
        if getattr(e, "name", None) == "Flux":
            flux = e
            break
    assert flux is not None, "Flux dtype not found"
    assert len(flux.pis) == 1
    assert 'ucd="phys.background"' in flux.pis[0].pitext


def test_parse_multiplicity():
    """multiplicityModel must parse with @[3,-1] multiplicity."""
    model = parse_string(MULTIPLICITY_MODEL)
    assert model is not None
    container = None
    for e in model.elements:
        if getattr(e, "name", None) == "Container":
            container = e
            break
    assert container is not None
    comp = container.content[0]
    mul = comp.multiplicity
    assert mul.minOccurs == 3
    assert mul.maxOccurs == -1


def test_parse_natural_key():
    """naturalKeyModel must parse with iskey / ofRank."""
    model = parse_string(NATURAL_KEY_MODEL)
    assert model is not None
    ranked = None
    for e in model.elements:
        if getattr(e, "name", None) == "RankedType":
            ranked = e
            break
    assert ranked is not None
    a_attr = ranked.content[0]
    assert a_attr.key.position == 3
    b_attr = ranked.content[1]
    assert b_attr.key.position == 1


def test_scoping_example2():
    """example2 model scope must contain expected types."""
    model = parse_string(EXAMPLE2)
    scope = model._scope
    # Check some expected names are in scope
    assert "example:real" in scope or "real" in scope
    assert "example:apackage.fq" in scope or "apackage.fq" in scope
    assert "example:apackage.base" in scope or "apackage.base" in scope
