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
        await connection.sendRequest('shutdown');
        await connection.sendNotification('exit');
    } finally {
        connection.dispose();
        server.kill();
        await rm(directory, { recursive: true, force: true });
    }
});
