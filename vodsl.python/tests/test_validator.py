"""Tests for the VODSL validator."""
from __future__ import annotations

import pytest
from vodsl.parser import parse_string
from vodsl.validator import validate_model, Severity


def test_attribute_type_error():
    """Attribute type must be a ValueType; ObjectType should trigger error."""
    src = '''\
model test (0.1) "test"
    primitive string ""
    otype Foo {
        x : string "";
    }
    otype Bar {
        bad : Foo "";
    }
'''
    model = parse_string(src)
    issues = validate_model(model)
    errors = [i for i in issues if i.severity == Severity.ERROR]
    assert any("should be a value type" in e.message for e in errors)


def test_multiplicity_star_attribute():
    """Attribute with @* must produce an error."""
    src = '''\
model test (0.1) "test"
    primitive integer ""
    otype Foo {
        m : integer @* "";
    }
'''
    model = parse_string(src)
    issues = validate_model(model)
    errors = [i for i in issues if i.severity == Severity.ERROR]
    assert any("strongly discouraged" in e.message and "'*'" in e.message for e in errors)


def test_multiplicity_plus_attribute():
    """Attribute with @+ must produce an error."""
    src = '''\
model test (0.1) "test"
    primitive integer ""
    otype Foo {
        m : integer @+ "";
    }
'''
    model = parse_string(src)
    issues = validate_model(model)
    errors = [i for i in issues if i.severity == Severity.ERROR]
    assert any("strongly discouraged" in e.message and "'+'" in e.message for e in errors)


def test_multiplicity_star_reference():
    """Reference with @* must produce an error."""
    src = '''\
model test (0.1) "test"
    primitive integer ""
    otype Foo {
        x : integer "";
    }
    otype Bar {
        r @* references Foo "";
    }
'''
    model = parse_string(src)
    issues = validate_model(model)
    errors = [i for i in issues if i.severity == Severity.ERROR]
    assert any("not advised for reference" in e.message for e in errors)


def test_multiplicity_plus_reference_warning():
    """Reference with @+ must produce a warning."""
    src = '''\
model test (0.1) "test"
    primitive integer ""
    otype Foo {
        x : integer "";
    }
    otype Bar {
        r @+ references Foo "";
    }
'''
    model = parse_string(src)
    issues = validate_model(model)
    warnings = [i for i in issues if i.severity == Severity.WARNING]
    assert any("not advised for reference" in w.message for w in warnings)


def test_multiplicity_optional_reference_ok():
    """Reference with @? must NOT produce any issue."""
    src = '''\
model test (0.1) "test"
    primitive integer ""
    otype Foo {
        x : integer "";
    }
    otype Bar {
        r @? references Foo "";
    }
'''
    model = parse_string(src)
    issues = validate_model(model)
    assert len(issues) == 0


def test_composition_max_less_than_min():
    """Composition with max < min must produce an error."""
    src = '''\
model test (0.1) "test"
    primitive integer ""
    otype Foo {
        x : integer "";
    }
    otype Bar {
        c : Foo @[5,2] as composition "";
    }
'''
    model = parse_string(src)
    issues = validate_model(model)
    errors = [i for i in issues if i.severity == Severity.ERROR]
    assert any("maximum multiplicity less than minimum" in e.message for e in errors)


def test_valid_model_no_errors():
    """A well-formed model should produce no validation errors."""
    src = '''\
model test (0.1) "test"
    primitive string ""
    primitive integer ""
    otype Foo {
        x : string "";
        y : integer @[3] "";
    }
'''
    model = parse_string(src)
    issues = validate_model(model)
    errors = [i for i in issues if i.severity == Severity.ERROR]
    assert len(errors) == 0
