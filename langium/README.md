# VODSL for Langium implementation

This independent TypeScript implementation provides a VODSL parser, validation
and scoping, a VO-DML 1.1 compiler, and an example desktop VS Code extension.
It does not replace the Xtext/Eclipse implementation, but it is an alternative
where Eclipse is not desired. 
Note that the VO-DML tools use the java compiler created by 
Xtext/Eclipse.

## Setup and CLI

Use Node.js `^22.22.2`, `^24.15.0`, or `>=26` and npm 10.2.3 or later.
From this directory:

```sh
npm ci
npm run build
node out/cli.js path/to/model.vodsl
node out/cli.js path/to/model.vodsl -o path/to/output.vo-dml.xml
```

By default the compiler writes `<input-basename>.vo-dml.xml` in the current
working directory, like the existing standalone parser. Diagnostics go to
stderr; errors result in a nonzero exit and no output is written. Warnings do
not prevent generation. The compiler does not overwrite input or included
models. The XML `lastModified` is the input file's modification time in UTC.

Only local relative paths and `file:` URIs are supported in `include`. Paths
are resolved relative to the file containing the include. Imported models must
be present and valid; include cycles, missing files, duplicate includes, and
duplicate imported model names are errors. Only explicitly included models are
visible in each model; an included model may itself include other models.
Generated imports refer to the imported input's basename with a `.vo-dml.xml`
extension, as in the Xtext generator. Compile dependencies separately and put
their outputs where the generated import URLs can resolve.

The reusable Node API is `createVodslServices` in `src/vodsl-module.ts`,
`loadModelGraph` in `src/workspace.ts`, and `generateVodml` in
`src/generator.ts`. Load and validate the graph before calling the generator;
it rejects unvalidated documents or documents with errors. Pass an explicit
date to `generateVodml` for reproducible output.

## VS Code extension

The extension is prepared for the VS Code Marketplace as `tsastro.vodsl`.
Once published, install it from the Extensions view or with
`code --install-extension tsastro.vodsl`. It is a preview and requires desktop
VS Code 1.146 or later. Marketplace publisher setup and publication are
separate from access to the npm `@tsastro` scope.

The `vscode/` directory is an extension development root. After `npm run build`,
start a development instance with:

```sh
code --extensionDevelopmentPath="$PWD/vscode"
```

Open a folder containing `.vodsl` files in that instance. The extension
contributes a TextMate grammar, language configuration and a bundled Node
language server. Syntax highlighting works independently of the server; the
server supplies diagnostics, completion and navigation. The command palette's
**VODSL: Compile to VO-DML** saves the active file and writes XML next to it.
Compiler warnings and errors appear in the **VODSL compiler** output channel.

### Read-only diagram

Open a local VODSL file and choose **VODSL: Open Diagram** from the command
palette or editor title. The model overview shows immediate packages and
types, including types in nested packages. Double-click a package to view its
immediate contents, or use **Model overview** to return. Double-click a type,
attribute, literal or relationship to open its source; Enter also activates
focused diagram elements. Use **VODSL: Reveal in Diagram** with the cursor in
the editor to locate a displayed element, including nested packages.

Inheritance, compositions and references are shown with red, blue and green
lines respectively, with distinct arrowhead/diamond shapes. Referenced types
outside the current view are offered as **Show** buttons, including imported
types. The diagram reflects unsaved edits, displays errors alongside any
recoverable content, and refreshes when errors are corrected. Drag nodes to
reposition them; **Re-layout** discards temporary positions and **Fit** adjusts
the viewport. Layout and expansion are view state only and never modify the
source. Diagram styling approximates the original FXDiagram rather than
reproducing its exact rendering.

The diagram is a desktop extension feature. Editor-to-diagram navigation for
imports requires the declaration to be visible or offered as a relationship
target; arbitrary unrelated imported declarations are not indexed. Duplicate
or incomplete declarations may lose their temporary positions on refresh.

The language server and compiler use VS Code's embedded Node runtime; no
separate Node installation is needed for the extension. The optional
`vodsl.nodePath` setting overrides that runtime with a supported Node executable;
leave it empty to use VS Code's runtime and restart VS Code after changing it.
The installed VSIX has been exercised on macOS; the release workflow includes
Linux smoke tests. Windows, browser and remote extension hosts have not yet
been verified. To integrate the
language support into another extension, copy the language contributions in
`vscode/package.json`, the TextMate grammar and language configuration, and
use `src/extension.ts` and `src/server.ts` as the client/server wiring.

### Build, review and release

Build a VSIX with `npm ci && npm run package:vsix`; install it locally with
`code --install-extension vodsl.vsix`. `npm run test:vsix` installs that VSIX
into an isolated VS Code profile and runs desktop integration and schema
checks with Node absent from PATH. It downloads VS Code 1.146 by default; set
`VSCODE_EXECUTABLE_PATH` to an existing VS Code executable or `VSCODE_VERSION`
to another version. Linux needs a display (for example `xvfb-run -a`) and
`xmllint` must be on the test runner's PATH. To test the optional runtime
override, set `VODSL_NODE_OVERRIDE` to a supported Node executable when
running `test:vsix`.

Publishing requires one-time setup by a Marketplace publisher administrator:

1. At [Marketplace publisher management](https://marketplace.visualstudio.com/manage),
   create or confirm control of publisher `tsastro` and confirm `tsastro.vodsl`
   is available. The npm namespace does not grant Marketplace publisher rights.
2. In GitHub, create the `vodsl-marketplace` environment, add at least one
   required reviewer, restrict deployments to the protected `master` branch,
   and protect that branch and the workflow from unauthorized changes. GitHub
   plan and repository visibility determine availability of required reviewers.
3. Configure a Marketplace Trusted Publishing policy for `pahjbo/vodsl`,
   workflow `vodsl-marketplace.yml` and environment `vodsl-marketplace`.
   See the [Marketplace publishing guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension).

For each release, update and review the manifest version and changelog in a
commit on `master`. Manually run **Prepare and publish VODSL extension** on
`master`. Download and inspect the VSIX and `RELEASE-INFO.txt` artifact, check
the recorded commit, version and SHA-256, and test that exact file. Only then
approve the `vodsl-marketplace` environment deployment. The publish job checks
the same artifact and uses short-lived OIDC authentication; it does not rebuild,
create a commit or tag, or publish an npm package. An absent environment or
required reviewer causes the release to fail rather than publish without review.
Never approve a release before publisher setup and artifact review. Check the
Marketplace listing and install the released version afterwards.

Marketplace versions cannot be overwritten. For a bad release, publish a new
version containing the fix or restored code; users can select an older version
via **Install Another Version** while the fix is prepared. Unpublishing affects
availability and is not an automatic rollback.

## Compatibility and VO-DML output

The grammar follows `net.ivoa.vodsl/.../Vodsl.xtext`, including escaped
identifiers, processing instructions, qualified names, multiplicities,
natural keys and subsets. The scope provider searches enclosing packages,
the model, and explicit imports, supporting `model:pkg.Type` and dotted names.
Subset role and datatype candidates are restricted to inherited roles and
proper subtypes, respectively. As in the Xtext scope provider, primitive roles
cannot be subsetted. The active Xtext multiplicity restrictions are retained:
in particular `@*` and `@+` on attributes are errors, `@*` on references is
an error, and `@+` on references is a warning.

The compiler emits VO-DML against the upstream 1.1-WD XSD pinned in
`test-resources/schema/`, not the older 1.0 schema to which the Xtext
generator's schema URL redirects. XML text is escaped and definitions are
ordered as required by the schema. Optional descriptions are omitted; a
missing model title defaults to the model name. VODSL has no model URI field,
so `<uri/>` is emitted as in Xtext and must be populated downstream when a
resolvable model URI is required. Natural-key positions use explicit `ofRank`
when supplied, otherwise the 1-based position among key attributes.

Unlike the existing generator, the compiler retains representable type and
attribute constraints, enumeration inheritance and semantic concepts. The XSD
permits only one attribute constraint and has no representation for a
constraint's `Regex`/`OCL` language or for composition constraints/semantic
concepts. Such inputs are rejected rather than silently losing information.
Invalid XML processing instructions, invalid VO-DML identifiers, ambiguous
references, cyclic inheritance, and invalid multiplicity bounds are also
errors. Other VO-DML semantic rules beyond the Xtext checks and those
documented above are not yet a complete standards validator.

## Tests and upstream examples

`npm test` builds the project and runs parser, scope, validation, compiler,
TextMate and language-server tests. Schema tests run offline against the pinned
XSD and require `xmllint` on PATH. Set `VODSL_SCHEMA` to test an alternative
schema. To include the Sprotty browser interaction test, set
`VODSL_CHROME_PATH` to a local Chrome or Chromium executable.

The upstream `ivoa/vodsl-models` repository contains the
[example](https://raw.githubusercontent.com/ivoa/vodsl-models/9affff8f08f52461a44d558d5997abc172af489d/example.vodsl)
and [test model](https://raw.githubusercontent.com/ivoa/vodsl-models/9affff8f08f52461a44d558d5997abc172af489d/test.vodsl)
used for additional compatibility checks. With `example.vodsl`, `test.vodsl`, and
`IVOA-v1.0.vodsl` in the same directory, run:

```sh
VODSL_MODELS_DIR=/path/to/vodsl-models npm test
```

These are diagnostic fixtures, not clean compilation fixtures: the example's
`UCD` syntax is not in the current Xtext grammar, and it also contains
attribute multiplicities rejected by Xtext validation. `test.vodsl`
deliberately contains unresolved names and a syntax error. The normal test
suite skips these two checks when `VODSL_MODELS_DIR` is not set.
