import * as vscode from 'vscode';
import { fork } from 'node:child_process';
import * as path from 'node:path';
import { LanguageClient, TransportKind, type ServerOptions } from 'vscode-languageclient/node.js';

let client: LanguageClient | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    const node = vscode.workspace.getConfiguration('vodsl').get<string>('nodePath')?.trim() || undefined;
    const server = context.asAbsolutePath('dist/server.js');
    const options: ServerOptions = { module: server, runtime: node, transport: TransportKind.stdio };
    const watcher = vscode.workspace.createFileSystemWatcher('**/*.vodsl');
    const outputChannel = vscode.window.createOutputChannel('VODSL compiler');
    context.subscriptions.push(watcher, outputChannel);
    client = new LanguageClient('vodsl', 'VODSL Language Server', options, {
        documentSelector: [{ scheme: 'file', language: 'vodsl' }],
        synchronize: { fileEvents: watcher }
    });
    await client.start();
    context.subscriptions.push(
        vscode.commands.registerCommand('vodsl.compile', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor || editor.document.languageId !== 'vodsl' || editor.document.uri.scheme !== 'file') {
                void vscode.window.showErrorMessage('Open a local VODSL file to compile it.');
                return;
            }
            if (editor.document.isDirty && !(await editor.document.save())) {
                void vscode.window.showErrorMessage('Save the VODSL file before compiling.');
                return;
            }
            const input = editor.document.uri.fsPath;
            const output = path.join(path.dirname(input), `${path.basename(input, path.extname(input))}.vo-dml.xml`);
            const cli = context.asAbsolutePath('dist/cli.js');
            try {
                await new Promise<void>((resolve, reject) => {
                    const child = fork(cli, [input, '-o', output], {
                        execPath: node,
                        env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', ELECTRON_NO_ASAR: '1' },
                        silent: true
                    });
                    let stderr = '';
                    let failure: Error | undefined;
                    child.stderr?.setEncoding('utf8');
                    child.stderr?.on('data', (data: string) => { stderr += data; });
                    child.on('error', error => { failure = error; });
                    child.on('close', (code, signal) => {
                        if (stderr.trim()) {
                            outputChannel.appendLine(stderr.trim());
                            outputChannel.show(true);
                        }
                        if (failure || code !== 0) {
                            reject(new Error(stderr.trim() || failure?.message || `process exited with ${signal ?? code}`));
                        } else {
                            resolve();
                        }
                    });
                });
                void vscode.window.showInformationMessage(`Generated ${output}`);
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                void vscode.window.showErrorMessage(`VODSL compilation failed: ${message}`);
            }
        })
    );
}

export async function deactivate(): Promise<void> {
    await client?.stop();
}
