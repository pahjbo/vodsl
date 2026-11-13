"""VODSL → VO-DML XML generator.

Ports ``VodslGenerator.xtend`` rule-for-rule.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from xml.sax.saxutils import escape as xml_escape

from vodsl.scoping import (
    _strip_caret,
    get_fqn_parts,
    resolve_type,
    to_qualified_string,
    vodml_id,
)


def generate(model: Any, *, mod_date: datetime | None = None) -> str:
    """Generate a complete VO-DML XML document from a parsed VODSL model."""
    if mod_date is None:
        mod_date = datetime.now(tz=timezone.utc)
    return _vodml_model(model, mod_date)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _fmt_date(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def _indent(text: str, level: int = 1) -> str:
    prefix = "\t" * level
    lines = text.split("\n")
    return "\n".join(prefix + line if line.strip() else line for line in lines)


def _preamble(element: Any, model: Any) -> str:
    vid = vodml_id(element, model)
    name = _strip_caret(getattr(element, "name", ""))
    desc = getattr(element, "description", None) or ""
    return (
        f"   <vodml-id>{xml_escape(vid)}</vodml-id>\n"
        f"   <name>{xml_escape(name)}</name>\n"
        f"   <description>{xml_escape(desc)}</description>\t    \n"
    )


def _ref(type_str: str, model: Any) -> str:
    """Resolve *type_str* and emit ``<vodml-ref>``."""
    resolved = resolve_type(model, type_str)
    if resolved is not None:
        parts = get_fqn_parts(resolved)
        ref_str = to_qualified_string(parts)
    else:
        ref_str = _strip_caret(type_str)
    return f"   <vodml-ref>{xml_escape(ref_str)}</vodml-ref>\n"


# ---------------------------------------------------------------------------
# Top-level model
# ---------------------------------------------------------------------------

def _vodml_model(model: Any, mod_date: datetime) -> str:
    md = model.model
    parts: list[str] = []
    parts.append('<?xml version="1.0" encoding="UTF-8"?>\n')
    parts.append(
        '<vo-dml:model xmlns:vo-dml="http://www.ivoa.net/xml/VODML/v1" \n'
        '              xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n'
        '              xsi:schemaLocation="http://www.ivoa.net/xml/VODML/v1 '
        'https://www.ivoa.net/xml/VODML/vo-dml-v1.xsd" \n'
        '              vodmlVersion="1.1">'
        '\t<!-- file generated from VODSL - needs validatation against v1.1 of schema  --> \n'
    )
    parts.append(f"      <name>{xml_escape(md.name)}</name>\n")
    parts.append(
        f"      <description>{xml_escape(md.description)}</description> \n"
    )
    parts.append("      <uri/>\n")
    titular = getattr(md, "titular", None) or ""
    parts.append(f"      <title>{xml_escape(titular)}</title>\n")
    for a in md.authors or []:
        parts.append(f"        <author>{xml_escape(a)}</author>\n")
    parts.append(f"      <version>{xml_escape(md.version)}</version>\n")
    parts.append(f"      <lastModified>{_fmt_date(mod_date)}</lastModified>\n")

    for inc in model.includes or []:
        parts.append(_vodml_include(inc, model))

    parts.append(_vodml_elements(model.elements, model))

    parts.append("</vo-dml:model>\n")
    return "".join(parts)


# ---------------------------------------------------------------------------
# Include → <import>
# ---------------------------------------------------------------------------

def _vodml_include(inc: Any, model: Any) -> str:
    uri = inc.importURI
    last_slash = uri.rfind("/")
    start = 0 if last_slash == -1 else last_slash + 1
    last_dot = uri.rfind(".")
    stem = uri[start:last_dot] if last_dot > start else uri[start:]
    url = stem + ".vo-dml.xml"

    # Try to get the included model's metadata
    included_models = getattr(model, "_included_models", [])
    inc_name = stem
    inc_version = ""
    for im in included_models:
        if _strip_caret(im.model.name) == stem or uri.replace(".vodsl", "") == stem:
            inc_name = _strip_caret(im.model.name)
            inc_version = im.model.version
            break
    # Also try matching by file stem
    if not inc_version:
        for im in included_models:
            fn = getattr(im, "_tx_filename", "")
            if fn and Path(fn).stem == stem:
                inc_name = _strip_caret(im.model.name)
                inc_version = im.model.version
                break

    return (
        "\t<import>\n"
        f"\t  <name>{xml_escape(inc_name)}</name>\n"
        f"\t  <version>{xml_escape(inc_version)}</version>\n"
        f"\t  <url>{xml_escape(url)}</url>\n"
        "\t  <documentationURL>not known</documentationURL>\n"
        "\t</import>\n"
    )


# Need Path for stem matching in _vodml_include
from pathlib import Path  # noqa: E402


# ---------------------------------------------------------------------------
# Element ordering
# ---------------------------------------------------------------------------

def _vodml_elements(elements: list[Any], model: Any) -> str:
    """Emit elements in standard order: primitives → enums → dtypes → otypes → packages."""
    parts: list[str] = []
    by_type: dict[str, list[Any]] = {
        "PrimitiveType": [],
        "Enumeration": [],
        "DataType": [],
        "ObjectType": [],
        "PackageDeclaration": [],
    }
    for e in elements or []:
        cn = type(e).__name__
        if cn in by_type:
            by_type[cn].append(e)

    for pt in by_type["PrimitiveType"]:
        parts.append(_vodml_primitive_type(pt, model))
    for en in by_type["Enumeration"]:
        parts.append(_vodml_enumeration(en, model))
    for dt in by_type["DataType"]:
        parts.append(_vodml_data_type(dt, model))
    for ot in by_type["ObjectType"]:
        parts.append(_vodml_object_type(ot, model))
    for pkg in by_type["PackageDeclaration"]:
        parts.append(_vodml_package(pkg, model))

    return "".join(parts)


# ---------------------------------------------------------------------------
# Individual element generators
# ---------------------------------------------------------------------------

def _vodml_package(pkg: Any, model: Any) -> str:
    return (
        "\t<package>\n"
        f"\t   {_preamble(pkg, model)}"
        f"       {_vodml_elements(pkg.elements, model)}"
        "\t</package>\n"
    )


def _vodml_primitive_type(pt: Any, model: Any) -> str:
    abstract_attr = ""
    if getattr(pt, "abstract", False):
        abstract_attr = ' abstract="true"'
    parts: list[str] = []
    parts.append(f"    <primitiveType{abstract_attr}>\n")
    parts.append(f"    {_preamble(pt, model)}")
    st = getattr(pt, "superType", None)
    if st:
        parts.append(
            " \t   <extends>\n"
            f" \t      {_ref(st, model)}"
            " \t   </extends>\n"
        )
    parts.append("    </primitiveType>\n")
    return "".join(parts)


def _vodml_enumeration(en: Any, model: Any) -> str:
    parts: list[str] = []
    parts.append("\t<enumeration>\n")
    parts.append(f"\t   {_preamble(en, model)}")
    for lit in en.literals or []:
        parts.append(_vodml_enum_literal(lit, model))
    parts.append("\t</enumeration>\n")
    return "".join(parts)


def _vodml_enum_literal(lit: Any, model: Any) -> str:
    return (
        "   <literal>\n"
        f"     {_preamble(lit, model)}"
        "   </literal>\t\n"
    )


def _vodml_data_type(dt: Any, model: Any) -> str:
    abstract_attr = ""
    if getattr(dt, "abstract", False):
        abstract_attr = ' abstract="true"'
    parts: list[str] = []
    for pi in getattr(dt, "pis", None) or []:
        parts.append(_vodml_pi(pi))
        parts.append("\n")
    parts.append(f"\t<dataType{abstract_attr}>\n")
    parts.append(f"\t  {_preamble(dt, model)}")
    st = getattr(dt, "superType", None)
    if st:
        parts.append(
            "\t   <extends>\n"
            f"\t      {_ref(st, model)}"
            "\t   </extends>\n"
        )
    for con in getattr(dt, "constraints", None) or []:
        parts.append(f"\t   \t{_vodml_constraint(con)}")
    for sub in getattr(dt, "subsets", None) or []:
        parts.append(f"       {_vodml_subset(sub, model)}")
    for child in getattr(dt, "content", None) or []:
        cn = type(child).__name__
        if cn == "Attribute":
            parts.append(f"\t   \t{_vodml_attribute(child, model, dt)}")
        elif cn == "Reference":
            parts.append(f"\t   \t{_vodml_reference(child, model)}")
    parts.append("\t</dataType>\n")
    return "".join(parts)


def _vodml_object_type(ot: Any, model: Any) -> str:
    abstract_attr = ""
    if getattr(ot, "abstract", False):
        abstract_attr = ' abstract="true"'
    parts: list[str] = []
    for pi in getattr(ot, "pis", None) or []:
        parts.append(_vodml_pi(pi))
        parts.append("\n")
    parts.append(f"\t<objectType{abstract_attr}>\n")
    parts.append(f"\t   {_preamble(ot, model)}")
    st = getattr(ot, "superType", None)
    if st:
        parts.append(
            "\t   <extends>\n"
            f"\t      {_ref(st, model)}"
            "\t   </extends>\n"
        )
    for con in getattr(ot, "constraints", None) or []:
        parts.append(f"\t   \t{_vodml_constraint(con)}")
    for sub in getattr(ot, "subsets", None) or []:
        parts.append(f"\t   \t{_vodml_subset(sub, model)}")
    for child in getattr(ot, "content", None) or []:
        cn = type(child).__name__
        if cn == "Attribute":
            parts.append(f"\t   \t{_vodml_attribute(child, model, ot)}")
        elif cn == "Reference":
            parts.append(f"\t   \t{_vodml_reference(child, model)}")
        elif cn == "Composition":
            parts.append(f"\t   \t{_vodml_composition(child, model)}")
    parts.append("\t</objectType>\n")
    return "".join(parts)


def _vodml_attribute(attr: Any, model: Any, container: Any) -> str:
    parts: list[str] = []
    for pi in getattr(attr, "pis", None) or []:
        parts.append(_vodml_pi(pi))
        parts.append("\n")
    parts.append("\t<attribute>\n")
    parts.append(f"\t  {_preamble(attr, model)}")
    parts.append(f"\t  <datatype>\n\t     {_ref(attr.type, model)}\t  </datatype>\n")
    parts.append(_vodml_multiplicity(getattr(attr, "multiplicity", None)))
    sc = getattr(attr, "semanticConcept", None)
    if sc is not None:
        parts.append(f"\t  {_vodml_semantic_concept(sc)}")
    key = getattr(attr, "key", None)
    if key is not None:
        parts.append(f"\t  {_vodml_natural_key(key, attr, container)}")
    parts.append("\t</attribute>\n")
    return "".join(parts)


def _vodml_composition(comp: Any, model: Any) -> str:
    parts: list[str] = []
    parts.append("\t<composition>\n")
    parts.append(f"\t  {_preamble(comp, model)}")
    parts.append(f"\t  <datatype>\n\t     {_ref(comp.type, model)}\t  </datatype>\n")
    parts.append(_vodml_multiplicity(getattr(comp, "multiplicity", None)))
    if getattr(comp, "ordered", False):
        parts.append("\t  <isOrdered>true</isOrdered>")
    parts.append("\t</composition>\n")
    return "".join(parts)


def _vodml_reference(ref: Any, model: Any) -> str:
    return (
        "   <reference>\n"
        f"     {_preamble(ref, model)}"
        f"     <datatype>\n       {_ref(ref.type, model)}     </datatype>\n"
        f"     {_vodml_multiplicity(getattr(ref, 'multiplicity', None))}"
        "   </reference>\n"
    )


def _vodml_multiplicity(mul: Any) -> str:
    if mul is None:
        return _vodml_mul_values(1, 1)

    spec = getattr(mul, "multiplicitySpec", None)
    if spec is not None:
        if spec == "+":
            return _vodml_mul_values(1, -1)
        if spec == "*":
            return _vodml_mul_values(0, -1)
        if spec == "?":
            return _vodml_mul_values(0, 1)
        # ONE shorthand – fall through to bracket logic
    # Bracket form @[min] or @[min,max], or ONE shorthand
    min_o = getattr(mul, "minOccurs", None)
    max_o = getattr(mul, "maxOccurs", None)
    if min_o is None:
        min_o = 0
    # maxOccurs is None when not specified (e.g. @[n]) — treat like Xtext ONE
    if max_o is not None and max_o != 0:
        return _vodml_mul_values(min_o, max_o)
    if min_o != 0:
        return _vodml_mul_values(min_o, min_o)
    return _vodml_mul_values(1, 1)


def _vodml_mul_values(min_o: int, max_o: int) -> str:
    return (
        "\t<multiplicity>\n"
        f"\t  <minOccurs>{min_o}</minOccurs>\n"
        f"\t  <maxOccurs>{max_o}</maxOccurs>\n"
        "\t</multiplicity>\n"
    )


def _vodml_constraint(con: Any) -> str:
    expr = getattr(con, "expr", None)
    if expr is not None:
        lang = getattr(con, "language", None) or ""
        return (
            "   <constraint>\n"
            f"     <description><![CDATA[{expr}]]></description>\n"
            f"     <!-- <language>{xml_escape(lang)}</language> -->\n"
            "   </constraint>\n"
        )
    return "   <constraint>\n   </constraint>\n"


def _vodml_subset(sub: Any, model: Any) -> str:
    return (
        '\t<constraint xsi:type="vo-dml:SubsettedRole">\n'
        f"\t   <role>\n\t      {_ref(sub.ref, model)}\t   </role>\n"
        f"\t   <datatype>\n\t      {_ref(sub.type, model)}\t   </datatype>\n"
        "\t</constraint>\n"
    )


def _vodml_natural_key(key: Any, attr: Any, container: Any) -> str:
    pos = getattr(key, "position", 0)
    if pos is None or pos < 1:
        # Auto-assign: 1-based index among iskey attributes in the container
        content = getattr(container, "content", []) or []
        key_attrs = [
            c for c in content
            if type(c).__name__ == "Attribute" and getattr(c, "key", None) is not None
        ]
        try:
            pos = key_attrs.index(attr) + 1
        except ValueError:
            pos = 1
    return (
        '    <constraint xsi:type="vo-dml:NaturalKey">\n'
        f"    \t<position>{pos}</position>\n"
        "    </constraint>\n"
    )


def _vodml_semantic_concept(sc: Any) -> str:
    parts: list[str] = ["\t<semanticconcept>\n"]
    bc = getattr(sc, "broadestConcept", None)
    if bc is not None:
        parts.append(f"\t    <topConcept>{xml_escape(bc)}</topConcept>\n")
    vu = getattr(sc, "vocabularyURI", None)
    if vu is not None:
        parts.append(f"\t    <vocabularyURI>{xml_escape(vu)}</vocabularyURI>\n")
    parts.append("\t</semanticconcept>\n")
    return "".join(parts)


def _vodml_pi(pi: Any) -> str:
    pitext = getattr(pi, "pitext", None)
    if not pitext or len(pitext) < 2:
        return ""
    inner = pitext[1:-1].strip()
    space_idx = inner.find(" ")
    if space_idx == -1:
        name = inner
        content = ""
    else:
        name = inner[:space_idx]
        content = inner[space_idx + 1:].strip()
    safe_content = content.replace("?>", "? >")
    if not safe_content:
        return f"<?{name}?>"
    return f"<?{name} {safe_content}?>"
