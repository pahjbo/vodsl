import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { URI } from 'langium';
import { createMessageConnection, StreamMessageReader, StreamMessageWriter } from 'vscode-jsonrpc/node.js';

test('bundled language server publishes diagnostics and resolves an included type', { timeout: 15000 }, async () => {
    const directory = await mkdtemp(join(tmpdir(), 'vodsl-lsp-'));
    const base = join(directory, 'base.vodsl');
    const main = join(directory, 'main.vodsl');
    const source = 'model main (1) "" include "base.vodsl" dtype D { value : base:text ""; }';
    await writeFile(base, 'model base (1) "" primitive text ""');
    await writeFile(main, source);
    const server = spawn(process.execPath, [resolve('vscode/dist/server.js'), '--stdio'], { stdio: 'pipe' });
    let stderr = '';
    server.stderr.on('data', chunk => { stderr += String(chunk); });
    const connection = createMessageConnection(new StreamMessageReader(server.stdout), new StreamMessageWriter(server.stdin));
    connection.onRequest('workspace/configuration', () => []);
    connection.onRequest('client/registerCapability', () => null);
    const uri = URI.file(main).toString();
    const diagnostics = new Promise<unknown[]>(resolveDiagnostics => {
        connection.onNotification('textDocument/publishDiagnostics', (params: { uri: string; diagnostics: unknown[] }) => {
            if (params.uri === uri) resolveDiagnostics(params.diagnostics);
        });
    });
    connection.listen();
    try {
        const initialized = await connection.sendRequest<{ capabilities: { definitionProvider?: unknown } }>('initialize', {
            processId: process.pid,
            rootUri: URI.file(directory).toString(),
            capabilities: {},
            workspaceFolders: [{ uri: URI.file(directory).toString(), name: 'test' }]
        });
        assert.ok(initialized.capabilities.definitionProvider, stderr);
        await connection.sendNotification('initialized', {});
        await connection.sendNotification('textDocument/didOpen', {
            textDocument: { uri, languageId: 'vodsl', version: 1, text: source }
        });
        assert.deepEqual(await diagnostics, [], stderr);
        type Location = { uri?: string; targetUri?: string };
        const definition = await connection.sendRequest<Location | Location[]>('textDocument/definition', {
            textDocument: { uri }, position: { line: 0, character: source.indexOf('base:text') + 6 }
        });
        const location = Array.isArray(definition) ? definition[0] : definition;
        assert.equal(location.uri ?? location.targetUri, URI.file(base).toString());
        const diagram = await connection.sendRequest<{ nodes: { name: string; rows: { text: string }[] }[] }>(
            'vodsl/diagram', { uri }
        );
        assert.equal(diagram.nodes.find(node => node.name === 'D')?.rows[0].text, 'value: base:text');
        const changedDiagnostics = new Promise<unknown[]>(resolveDiagnostics => {
            connection.onNotification('textDocument/publishDiagnostics', (params: { uri: string; diagnostics: unknown[] }) => {
                if (params.uri === uri) resolveDiagnostics(params.diagnostics);
            });
        });
        await connection.sendNotification('textDocument/didChange', {
            textDocument: { uri, version: 2 },
            contentChanges: [{ text: source.replace('value :', 'renamed :') }]
        });
        assert.deepEqual(await changedDiagnostics, [], stderr);
        const updated = await connection.sendRequest<{ nodes: { name: string; rows: { text: string }[] }[] }>(
            'vodsl/diagram', { uri }
        );
        assert.equal(updated.nodes.find(node => node.name === 'D')?.rows[0].text, 'renamed: base:text');
        const baseUri = URI.file(base).toString();
        await connection.sendNotification('textDocument/didOpen', {
            textDocument: { uri: baseUri, languageId: 'vodsl', version: 1, text: 'model base (1) "" primitive text ""' }
        });
        const changedImportDiagnostics = new Promise<unknown[]>(resolveDiagnostics => {
            connection.onNotification('textDocument/publishDiagnostics', (params: { uri: string; diagnostics: unknown[] }) => {
                if (params.uri === uri && params.diagnostics.length) resolveDiagnostics(params.diagnostics);
            });
        });
        await connection.sendNotification('textDocument/didChange', {
            textDocument: { uri: baseUri, version: 2 },
            contentChanges: [{ text: 'model base (1) "" primitive renamed ""' }]
        });
        assert.ok((await changedImportDiagnostics).length > 0, 'dirty import should relink the dependent document');
        const broken = await connection.sendRequest<{ errors: string[] }>('vodsl/diagram', { uri });
        assert.ok(broken.errors.length > 0, 'diagram should expose errors caused by the unsaved import');
        const restoredImportDiagnostics = new Promise<unknown[]>(resolveDiagnostics => {
            connection.onNotification('textDocument/publishDiagnostics', (params: { uri: string; diagnostics: unknown[] }) => {
                if (params.uri === uri && !params.diagnostics.length) resolveDiagnostics(params.diagnostics);
            });
        });
        await connection.sendNotification('textDocument/didChange', {
            textDocument: { uri: baseUri, version: 3 },
            contentChanges: [{ text: 'model base (1) "" primitive text ""' }]
        });
        assert.deepEqual(await restoredImportDiagnostics, []);
        const restored = await connection.sendRequest<{ errors: string[] }>('vodsl/diagram', { uri });
        assert.deepEqual(restored.errors, []);
        await connection.sendRequest('shutdown');
        await connection.sendNotification('exit');
    } finally {
        connection.dispose();
        server.kill();
        await rm(directory, { recursive: true, force: true });
    }
});
