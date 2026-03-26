# AGENTS Guide for `vodsl`

# Overall Aim of Project
- Provide a domain-specific language (DSL) for modelling data structures and relationships
- The language is designed to "compile" to the existing VO-DML XML format, providing a more user-friendly syntax and tooling for creating VO-DML models.
- There are two main products of this repository: the VODSL language and its Eclipse-based editor/IDE, and a standalone parser/translator that can be used outside of Eclipse. When making changes, prioritise the correctness of the standalone parser and the generated VO-DML output, since the editor is just one of many potential clients of the language.


## Scope and Source of Conventions
- Existing agent-specific rule files were not found from the requested glob; only `Readme.md` and `doc/ivoatex/**/README.rst` exist.
- Treat this file as the canonical AI-agent playbook for this repository.

## Big Picture Architecture
- This is an Xtext/Tycho multi-module project for the VODSL language and Eclipse tooling.
- Language core is `net.ivoa.vodsl`: grammar in `src/net/ivoa/vodsl/Vodsl.xtext`, validation in `validation/VodslValidator.xtend`, VO-DML XML generation in `generator/VodslGenerator.xtend`.
- UI/editor plugin is `net.ivoa.vodsl.ui` (Eclipse editor wiring in `net.ivoa.vodsl.ui/plugin.xml`, FXDiagram config in `ui/fxdiagram/VodslDiagramConfig.xtend`).
- IDE/LSP packaging is `net.ivoa.vodsl.ide` (language-server launcher assembly configured in `net.ivoa.vodsl.ide/pom.xml`).
- Standalone parser CLI is `vodsl.standalone` (`ParserRunner` loads Xtext resources, validates, then runs generator).
- Feature/update-site stack is `net.ivoa.vodsl.sdk` + `eclipse.repository`; target platform is `eclipse.target/eclipse.vodsl.target.target`.

## Critical Workflows
- Main build: run `mvn install` at repo root (`pom.xml` modules). This does **not** include commented modules like `eclipse.repository` and test plugins.
- Regenerate Xtext artifacts via Maven in language module: `mvn -f net.ivoa.vodsl/pom.xml generate-sources` (executes `GenerateVodsl.mwe2`).
- Build standalone parser jar: `mvn -f vodsl.standalone/pom.xml install`; run `java -jar target/*-standalone.jar model.vodsl`.
- Build update site explicitly from its module when needed: `mvn -f eclipse.repository/pom.xml package`.
- Run tests from module poms directly when needed (e.g., `net.ivoa.vodsl.tests`), since tests are not in default root reactor list.

## Editing Rules Specific to This Repo
- Do not hand-edit generated trees: `**/src-gen`, `**/xtend-gen`, `**/target`, `**/plugin.xml_gen` (`.gitignore` and build configs enforce this).
- Prefer editing grammar/runtime/UI sources under `src/` and regenerating rather than patching generated Java.
- Keep qualified-name behavior consistent: names use model-root prefix and `model:pkg.type` style via `VodslQualifiedNameProvider` and `VodslQualifiedNameConverter`.
- Preserve import/scoping behavior: global scope uses import URIs (`VodslRuntimeModule` binds `ImportUriGlobalScopeProvider`).
- Generator behavior is semantic contract: `VodslGenerator` emits `*.vo-dml.xml` and resolves `include` URIs through `ImportUriResolver`; avoid incompatible output format changes unless requested.

## Integration and Environment Notes
- Tycho parent config is centralized in `mavenbase/pom.xml` (target platform, surefire argLine, macOS `-XstartOnFirstThread`, JDK9+ module flags).
- External p2 repos (Eclipse, FXDiagram, OpenJFX, Kieler) are required by target/platform builds; build failures are often dependency-resolution related.
- `net.ivoa.vodsl.ui` has explicit JavaFX classpath handling in its `pom.xml`; keep this intact when upgrading dependencies.
- If changing validation/messages, also check `VodslSyntaxErrorMessageProvider.xtend` for user-facing parser diagnostics.

