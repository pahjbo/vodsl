"""CLI entry point for the VODSL toolchain."""
from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path

from vodsl.parser import parse_file
from vodsl.validator import validate_model, Severity
from vodsl.generator import generate
from vodsl.schema_validator import validate_xml_against_schema, ensure_schema


def main():
    ap = argparse.ArgumentParser(description="VODSL parser and VO-DML generator")
    ap.add_argument("files", nargs="+", help="VODSL source files")
    ap.add_argument(
        "--output", "-o", default=None, help="Output directory (default: same as input)"
    )
    ap.add_argument("--refresh-schema", action="store_true")
    ap.add_argument("--no-validate", action="store_true")
    args = ap.parse_args()

    exit_code = 0
    for file_path in args.files:
        path = Path(file_path)
        try:
            model = parse_file(path)
        except Exception as exc:
            print(f"Parse error in {path}: {exc}", file=sys.stderr)
            exit_code = 1
            continue

        issues = validate_model(model)
        errors = [i for i in issues if i.severity == Severity.ERROR]
        warnings = [i for i in issues if i.severity == Severity.WARNING]
        for w in warnings:
            print(f"WARNING: {w.message}", file=sys.stderr)
        for e in errors:
            print(f"ERROR: {e.message}", file=sys.stderr)

        if errors:
            exit_code = 1
            continue

        mod_date = datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc)
        xml = generate(model, mod_date=mod_date)

        out_dir = Path(args.output) if args.output else path.parent
        out_dir.mkdir(parents=True, exist_ok=True)
        out_file = out_dir / (path.stem + ".vo-dml.xml")
        out_file.write_text(xml, encoding="utf-8")

        if not args.no_validate:
            schema_path = ensure_schema(refresh=args.refresh_schema)
            schema_errors = validate_xml_against_schema(xml, schema_path)
            if schema_errors:
                for se in schema_errors:
                    print(f"Schema validation error: {se}", file=sys.stderr)
                exit_code = 1

    sys.exit(exit_code)
