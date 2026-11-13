"""VODSL scoping – qualified-name handling and cross-reference resolution."""
from __future__ import annotations

import re
from pathlib import Path
from typing import Any


def _strip_caret(name: str) -> str:
    """Remove leading ``^`` from an identifier (Xtext reserved-word escape)."""
    return name[1:] if name.startswith("^") else name


def split_qualified(qname: str) -> list[str]:
    """Split a qualified name on ``:`` or ``.``."""
    return re.split(r"[:\.]", qname)


def to_qualified_string(parts: list[str]) -> str:
    """Join parts using ``:`` after the first segment, ``.`` thereafter."""
    if not parts:
        return ""
    if len(parts) == 1:
        return parts[0]
    return parts[0] + ":" + ".".join(parts[1:])


def get_fqn_parts(element: Any) -> list[str]:
    """Walk up the textX ``.parent`` chain to collect name parts."""
    parts: list[str] = []
    obj = element
    while obj is not None:
        name = getattr(obj, "name", None)
        if name is not None:
            parts.append(_strip_caret(name))
        else:
            # VoDataModel has no ``name`` but has ``model.name``
            md = getattr(obj, "model", None)
            if md is not None and hasattr(md, "name"):
                parts.append(_strip_caret(md.name))
        obj = getattr(obj, "parent", None)
    parts.reverse()
    return parts


def get_fully_qualified_name(element: Any, model: Any) -> str:
    """Return the fully qualified name: ``model:pkg.Type``."""
    parts = get_fqn_parts(element)
    return to_qualified_string(parts)


def vodml_id(element: Any, model: Any) -> str:
    """Return the vodml-id: FQN with the model name stripped."""
    parts = get_fqn_parts(element)
    return ".".join(parts[1:]) if len(parts) > 1 else parts[0]


def vodml_ref(element: Any, model: Any) -> str:
    """Return the vodml-ref: full ``model:pkg.Type`` form."""
    return get_fully_qualified_name(element, model)


# ---------------------------------------------------------------------------
# Scope building and resolution
# ---------------------------------------------------------------------------

def _collect_elements(container: Any, prefix: list[str], scope: dict[str, Any]):
    """Recursively register named elements into *scope*."""
    elements = getattr(container, "elements", []) or []
    for elem in elements:
        name = getattr(elem, "name", None)
        if name is None:
            continue
        clean = _strip_caret(name)
        parts = prefix + [clean]
        fqn = to_qualified_string(parts)
        short = ".".join(parts[1:]) if len(parts) > 1 else clean
        scope.setdefault(fqn, elem)
        scope.setdefault(short, elem)
        scope.setdefault(clean, elem)

        # Recurse into packages
        if getattr(elem, "elements", None):
            _collect_elements(elem, parts, scope)

        # Collect content (attributes, references, compositions)
        for child in getattr(elem, "content", None) or []:
            child_name = getattr(child, "name", None)
            if child_name:
                child_clean = _strip_caret(child_name)
                child_parts = parts + [child_clean]
                child_fqn = to_qualified_string(child_parts)
                child_short = ".".join(child_parts[1:]) if len(child_parts) > 1 else child_clean
                scope.setdefault(child_fqn, child)
                scope.setdefault(child_short, child)

        # Collect enum literals
        for lit in getattr(elem, "literals", None) or []:
            lit_name = getattr(lit, "name", None)
            if lit_name:
                lit_clean = _strip_caret(lit_name)
                lit_parts = parts + [lit_clean]
                lit_fqn = to_qualified_string(lit_parts)
                lit_short = ".".join(lit_parts[1:]) if len(lit_parts) > 1 else lit_clean
                scope.setdefault(lit_fqn, lit)
                scope.setdefault(lit_short, lit)


def build_scope(model: Any) -> dict[str, Any]:
    """Build a flat scope dict for *model*."""
    scope: dict[str, Any] = {}
    model_name = _strip_caret(model.model.name)
    # Register the model itself
    scope[model_name] = model
    _collect_elements(model, [model_name], scope)
    return scope


def resolve_model(model: Any, base_dir: Path | None = None):
    """Build scope for *model* and all its includes, store on ``model._scope``."""
    scope = build_scope(model)
    included_models: list[Any] = []

    for inc in model.includes or []:
        uri = inc.importURI
        if base_dir is not None:
            inc_path = base_dir / uri
        else:
            inc_path = Path(uri)
        if inc_path.exists():
            # Import here to avoid circular imports
            from vodsl.parser import parse_file
            inc_model = parse_file(inc_path)
            included_models.append(inc_model)
            inc_scope = getattr(inc_model, "_scope", {})
            # Merge: current model's names take priority
            for k, v in inc_scope.items():
                scope.setdefault(k, v)

    model._scope = scope
    model._included_models = included_models


def resolve_type(model: Any, qname_str: str) -> Any | None:
    """Look up a type by its (possibly partial) qualified name."""
    scope = getattr(model, "_scope", {})
    clean = _strip_caret(qname_str)
    return scope.get(clean)
