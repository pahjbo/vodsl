const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const vscode = require('vscode');

async function eventually(predicate, description) {
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
        const result = await predicate();
        if (result) return result;
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    throw new Error(`Timed out waiting for ${description}`);
}

exports.run = async () => {
    const root = process.env.VODSL_VSIX_TEST_DIR;
    assert.ok(root);
    assert.ok(process.env.VODSL_EMPTY_PATH);
    process.env.PATH = process.env.VODSL_EMPTY_PATH;
    assert.equal(spawnSync('node', ['--version']).error?.code, 'ENOENT', 'system Node must not be on PATH');
    const base = path.join(root, 'base.vodsl');
    const main = path.join(root, 'main.vodsl');
    const invalid = path.join(root, 'invalid.vodsl');
    const output = path.join(root, 'main.vo-dml.xml');
    const source = 'model main (1.0) "main" include "base.vodsl" dtype D { value : base:text "value"; } package outer { package inner { otype Nested {} } }';
    await fs.writeFile(base, 'model base (1.0) "base" primitive text "text"');
    await fs.writeFile(main, source);
    await fs.writeFile(invalid, 'model broken (1) "" otype A { r references ; }');

    const extension = vscode.extensions.getExtension('tsastro.vodsl');
    assert.ok(extension, 'installed Marketplace extension not found');
    assert.ok(!extension.extensionPath.includes('vscode-test'), 'extension must be installed from the VSIX');
    assert.equal(extension.isActive, false, 'extension must not start before the PATH check');
    assert.equal(vscode.workspace.getConfiguration('vodsl').get('nodePath'), process.env.VODSL_NODE_OVERRIDE ?? '');
    const [major, minor, patch] = process.versions.node.split('.').map(Number);
    assert.ok(major >= 26 || (major === 24 && (minor > 15 || (minor === 15 && patch >= 0))) ||
        (major === 22 && (minor > 22 || (minor === 22 && patch >= 2))),
    `Unsupported extension-host Node ${process.versions.node}`);
    const document = await vscode.workspace.openTextDocument(main);
    assert.equal(document.languageId, 'vodsl');
    await vscode.window.showTextDocument(document);
    await eventually(() => extension.isActive, 'extension activation');
    await eventually(async () => {
        const result = await vscode.commands.executeCommand('vscode.executeDefinitionProvider',
            document.uri, document.positionAt(source.indexOf('base:text') + 6));
        return result?.some(location => (location.uri ?? location.targetUri)?.fsPath === base);
    }, 'cross-file definition');
    const completions = await vscode.commands.executeCommand('vscode.executeCompletionItemProvider',
        document.uri, document.positionAt(source.indexOf('base:text')));
    assert.ok(completions && completions.items.length > 0, 'expected completion items');
    assert.equal(vscode.languages.getDiagnostics(document.uri).filter(d => d.severity === vscode.DiagnosticSeverity.Error).length, 0);

    await vscode.commands.executeCommand('vodsl.showDiagram');
    await eventually(() => vscode.window.tabGroups.all.some(group => group.tabs.some(tab =>
        tab.label === 'VODSL: main.vodsl')), 'diagram webview');
    const diagram = await eventually(() => {
        const status = extension.exports.getDiagramStatus(document.uri.toString());
        return status?.rendered && status.model?.nodes.some(node => node.name === 'D') ? status : undefined;
    }, 'rendered Sprotty diagram');
    assert.ok(diagram.model.nodes.some(node => node.rows.some(row => row.text === 'value: base:text')));
    await vscode.window.showTextDocument(document);
    const editor = vscode.window.activeTextEditor;
    assert.ok(editor);
    const inner = document.positionAt(source.indexOf('inner'));
    editor.selection = new vscode.Selection(inner, inner);
    await vscode.commands.executeCommand('vodsl.revealInDiagram');
    await eventually(() => {
        const status = extension.exports.getDiagramStatus(document.uri.toString());
        return status?.rendered && status.model?.title === 'main:outer'
            && status.model.nodes.some(node => node.name === 'inner');
    }, 'nested package reveal');
    const imported = await vscode.workspace.openTextDocument(base);
    const importedEditor = await vscode.window.showTextDocument(imported);
    await importedEditor.edit(builder => builder.replace(
        new vscode.Range(imported.positionAt(0), imported.positionAt(imported.getText().length)),
        'model base (1.0) "base" primitive renamed "text"'));
    assert.ok(imported.isDirty);
    await eventually(() => {
        const status = extension.exports.getDiagramStatus(document.uri.toString());
        return status?.rendered && status.model?.errors.length;
    }, 'diagram errors from unsaved import');
    await importedEditor.edit(builder => builder.replace(
        new vscode.Range(imported.positionAt(0), imported.positionAt(imported.getText().length)),
        'model base (1.0) "base" primitive text "text"'));
    await eventually(() => {
        const status = extension.exports.getDiagramStatus(document.uri.toString());
        return status?.rendered && status.model && status.model.errors.length === 0;
    }, 'diagram recovery after unsaved import repair');
    assert.equal(await fs.readFile(base, 'utf8'), 'model base (1.0) "base" primitive text "text"');
    const mainEditor = await vscode.window.showTextDocument(document);
    await mainEditor.edit(builder => builder.insert(document.positionAt(source.length), '\n// saved by compilation'));
    assert.ok(document.isDirty);
    await eventually(() => {
        const status = extension.exports.getDiagramStatus(document.uri.toString());
        return status?.rendered && status.generation > diagram.generation;
    }, 'diagram refresh for unsaved edit');
    await vscode.commands.executeCommand('vodsl.compile');
    assert.ok(!document.isDirty);
    assert.match(await fs.readFile(main, 'utf8'), /saved by compilation/);
    await eventually(async () => {
        try { return (await fs.readFile(output, 'utf8')).includes('<vodml-ref>base:text</vodml-ref>'); }
        catch (error) { if (error.code === 'ENOENT') return false; throw error; }
    }, 'VO-DML output');

    const broken = await vscode.workspace.openTextDocument(invalid);
    await vscode.window.showTextDocument(broken);
    await eventually(() => vscode.languages.getDiagnostics(broken.uri)
        .some(d => d.severity === vscode.DiagnosticSeverity.Error), 'invalid-model diagnostics');
    await vscode.commands.executeCommand('vodsl.compile');
    await assert.rejects(fs.access(path.join(root, 'invalid.vo-dml.xml')), { code: 'ENOENT' });
};
