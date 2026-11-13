"""VODSL validator – ports ``@Check`` rules from ``VodslValidator.xtend``."""
from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Any

from vodsl.scoping import resolve_type, _strip_caret


class Severity(Enum):
    ERROR = "ERROR"
    WARNING = "WARNING"


@dataclass
class Issue:
    severity: Severity
    message: str
    element: Any


_VALUE_TYPE_CLASSES = frozenset({"PrimitiveType", "DataType", "Enumeration"})
_OBJECT_TYPE_CLASSES = frozenset({"ObjectType"})


def _class_name(element: Any) -> str:
    return type(element).__name__


def _is_value_type(element: Any) -> bool:
    return _class_name(element) in _VALUE_TYPE_CLASSES


def _is_object_type(element: Any) -> bool:
    return _class_name(element) in _OBJECT_TYPE_CLASSES


def check_attribute_type(attr: Any, model: Any) -> list[Issue]:
    """Attribute type must be a ValueType (primitive, dtype, enum)."""
    issues: list[Issue] = []
    type_str = attr.type
    resolved = resolve_type(model, type_str)
    if resolved is not None and not _is_value_type(resolved):
        name = _strip_caret(attr.name)
        issues.append(Issue(
            Severity.ERROR,
            f"Attribute '{name}' should be a value type",
            attr,
        ))
    return issues


def check_multiplicity_attribute(attr: Any) -> list[Issue]:
    """Check multiplicity constraints for attributes."""
    issues: list[Issue] = []
    mul = getattr(attr, "multiplicity", None)
    if mul is None:
        return issues
    spec = getattr(mul, "multiplicitySpec", None)
    if spec is not None:
        name = _strip_caret(attr.name)
        if spec == "+":
            issues.append(Issue(
                Severity.ERROR,
                f"multiplicity '+' strongly discouraged for attribute {name}",
                attr,
            ))
        elif spec == "*":
            issues.append(Issue(
                Severity.ERROR,
                f"multiplicity '*' strongly discouraged for attribute {name}",
                attr,
            ))
        elif spec in ("ONE", "?"):
            pass  # OK
    return issues


def check_multiplicity_reference(ref: Any) -> list[Issue]:
    """Check multiplicity constraints for references."""
    issues: list[Issue] = []
    mul = getattr(ref, "multiplicity", None)
    if mul is None:
        return issues
    spec = getattr(mul, "multiplicitySpec", None)
    if spec is not None:
        name = _strip_caret(ref.name)
        if spec == "+":
            issues.append(Issue(
                Severity.WARNING,
                f"multiplicity '+' not advised for reference {name}",
                ref,
            ))
        elif spec == "*":
            issues.append(Issue(
                Severity.ERROR,
                f"multiplicity '*' not advised for reference {name}",
                ref,
            ))
        elif spec == "?":
            pass  # OK
        elif spec == "ONE":
            max_o = getattr(mul, "maxOccurs", None)
            min_o = getattr(mul, "minOccurs", None)
            if max_o is not None and min_o is not None:
                if max_o != 1 or min_o != 1:
                    issues.append(Issue(
                        Severity.WARNING,
                        f"max occurs > 1 not advised for reference {name}",
                        ref,
                    ))
    return issues


def check_multiplicity_composition(comp: Any) -> list[Issue]:
    """Check multiplicity constraints for compositions."""
    issues: list[Issue] = []
    mul = getattr(comp, "multiplicity", None)
    if mul is None:
        return issues
    spec = getattr(mul, "multiplicitySpec", None)
    if spec is None or spec == "ONE":
        max_o = getattr(mul, "maxOccurs", None)
        min_o = getattr(mul, "minOccurs", None)
        if max_o is not None and min_o is not None:
            if max_o != -1 and max_o < min_o:
                name = _strip_caret(comp.name)
                issues.append(Issue(
                    Severity.ERROR,
                    f"maximum multiplicity less than minimum - {name}",
                    comp,
                ))
    return issues


def _walk_elements(container: Any):
    """Yield all elements recursively from a container."""
    for elem in getattr(container, "elements", None) or []:
        yield elem
        if getattr(elem, "elements", None):
            yield from _walk_elements(elem)


def validate_model(model: Any) -> list[Issue]:
    """Run all validation checks on *model* and return a list of issues."""
    issues: list[Issue] = []

    for elem in _walk_elements(model):
        cn = _class_name(elem)

        # Check attributes
        if cn in ("ObjectType", "DataType"):
            for child in getattr(elem, "content", None) or []:
                child_cn = _class_name(child)
                if child_cn == "Attribute":
                    issues.extend(check_attribute_type(child, model))
                    issues.extend(check_multiplicity_attribute(child))
                elif child_cn == "Reference":
                    issues.extend(check_multiplicity_reference(child))
                elif child_cn == "Composition":
                    issues.extend(check_multiplicity_composition(child))

    return issues
