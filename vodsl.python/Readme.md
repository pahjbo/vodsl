VODSL Python Parser
===================

A pure-Python VODSL parser and VO-DML XML generator. This standalone toolchain
parses `.vodsl` files and generates schema-valid `.vo-dml.xml` output, without
requiring the Eclipse plug-in.

## Quick start

```bash
# Install
pip install -e .

# Parse and generate VO-DML XML
vodsl model.vodsl

# Specify output directory
vodsl --output build/ model.vodsl

# Skip XSD schema validation
vodsl --no-validate model.vodsl
```

## Development

```bash
# Install dev dependencies
pip install -r requirements.txt

# Regenerate the textX grammar (after editing Vodsl.xtext)
python generate_grammar.py

# Run tests
PYTHONPATH=src python -m pytest -v

# Run integration tests only (requires network)
PYTHONPATH=src python -m pytest -m integration -v
```

## Architecture

The grammar is derived from the canonical Xtext source at
`../net.ivoa.vodsl/src/net/ivoa/vodsl/Vodsl.xtext`. Run
`python generate_grammar.py` after any grammar change to regenerate
`src/vodsl/grammar/vodsl.tx`.

| Module | Role |
|--------|------|
| `generate_grammar.py` | Xtext → textX grammar transpiler |
| `src/vodsl/parser.py` | textX-based parser |
| `src/vodsl/scoping.py` | Qualified-name handling and cross-reference resolution |
| `src/vodsl/validator.py` | Validation rules (ported from `VodslValidator.xtend`) |
| `src/vodsl/generator.py` | VO-DML XML generation (ported from `VodslGenerator.xtend`) |
| `src/vodsl/schema_validator.py` | XSD schema validation of generated XML |
| `src/vodsl/cli.py` | CLI entry point |

### Generated / cached artefacts

- `src/vodsl/grammar/vodsl.tx` — generated textX grammar (`.gitignore`d)
- `src/vodsl/schema/vo-dml-v1.0.xsd` — cached XSD schema (`.gitignore`d, fetched on first use)
