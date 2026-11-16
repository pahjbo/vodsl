# VODSL for Visual Studio Code

Preview language support for the IVOA VODSL data modelling language.

- Syntax highlighting, diagnostics, completion and navigation between local
  included models.
- **VODSL: Compile to VO-DML** saves the active file and writes VO-DML XML next
  to it. Warnings and errors appear in the **VODSL compiler** output channel.
- Relative paths and `file:` URIs are supported in `include`. Compile imported
  models separately.
- **VODSL: Open Diagram** opens a read-only UML-style overview of the active
  model. Double-click a package to explore it or a type, row or relationship
  to open its source. **VODSL: Reveal in Diagram** locates the editor cursor.
  Referenced types outside the view can be added with the **Show** buttons.
  Unsaved changes and recoverable errors appear in the diagram; dragging,
  **Re-layout** and **Fit** affect only its temporary view, not the source.
  For imports, reveal is limited to types already displayed or offered as
  relationship targets. The styling approximates the Eclipse FXDiagram view.

The extension uses VS Code's embedded Node runtime and does not require a
separate Node installation. An optional `vodsl.nodePath` setting overrides the
runtime; restart VS Code after changing it. The extension targets desktop VS
Code 1.146 or later, not VS Code for the Web. macOS has been tested; Windows
and remote extension hosts have not yet been verified.

See the [project documentation](https://github.com/pahjbo/vodsl/tree/master/langium)
for syntax compatibility, CLI usage and known limitations. This is a preview;
report problems at the [issue tracker](https://github.com/pahjbo/vodsl/issues).
