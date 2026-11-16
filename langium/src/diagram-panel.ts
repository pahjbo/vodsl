import * as vscode from 'vscode';
import { randomBytes } from 'node:crypto';
import type { LanguageClient } from 'vscode-languageclient/node.js';
import type { DiagramModel, DiagramTrace } from './diagram-model.js';

interface PanelState {
    panel: vscode.WebviewPanel;
    document: vscode.TextDocument;
    packageId?: string;
    expanded: Set<string>;
    model?: DiagramModel;
    generation: number;
    timer?: ReturnType<typeof setTimeout>;
    pending?: vscode.CancellationTokenSource;
    versions?: Map<string, number>;
    rendered?: number;
}
export class DiagramPanels implements vscode.Disposable {
    private readonly panels = new Map<string, PanelState>();
    private readonly subscriptions: vscode.Disposable[] = [];

    constructor(private readonly context: vscode.ExtensionContext, private readonly client: LanguageClient) {
        this.subscriptions.push(client.onNotification('vodsl/diagramChanged', () => {
            for (const state of this.panels.values()) this.schedule(state);
        }));
        this.subscriptions.push(vscode.workspace.onDidChangeTextDocument(event => {
            if (event.document.languageId === 'vodsl') {
                for (const state of this.panels.values()) this.schedule(state);
            }

        }));
    }

    getStatus(uri: string): { generation: number; rendered: boolean; model?: DiagramModel } | undefined {
        const state = this.panels.get(uri);
        return state && { generation: state.generation, rendered: state.rendered === state.generation, model: state.model };
    }

    open(editor: vscode.TextEditor): void {
        const document = editor.document;
        const key = document.uri.toString();
        const existing = this.panels.get(key);
        if (existing) {
            existing.panel.reveal(vscode.ViewColumn.Beside);
            return;
        }
        const root = vscode.Uri.joinPath(this.context.extensionUri, 'dist');
        const panel = vscode.window.createWebviewPanel('vodsl.diagram', `VODSL: ${pathName(document.uri)}`,
            vscode.ViewColumn.Beside, { enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [root] });
        const state: PanelState = { panel, document, expanded: new Set(), generation: 0 };
        this.panels.set(key, state);
        const script = panel.webview.asWebviewUri(vscode.Uri.joinPath(root, 'diagram-webview.js'));
        const style = panel.webview.asWebviewUri(vscode.Uri.joinPath(root, 'diagram.css'));
        const nonce = randomBytes(16).toString('hex');
        panel.webview.html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src ${panel.webview.cspSource};">
<link rel="stylesheet" href="${style}"></head><body>
<header><strong id="title">VODSL</strong><button id="overview">Model overview</button><button id="layout">Re-layout</button><button id="fit">Fit</button>
<span class="legend">Inheritance: red triangle · Composition: blue diamond · Reference: green arrow</span></header>
<div id="status" role="status"></div><div id="targets"></div>
<svg width="0" height="0" aria-hidden="true"><defs>
<linearGradient id="node-gradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9ebce3"/><stop offset="1" stop-color="#dce6ff"/></linearGradient>
<marker id="inheritance-end" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto" markerUnits="userSpaceOnUse"><path d="M 0 0 L 10 6 L 0 12 Z" fill="white" stroke="#c00000"/></marker>
<marker id="composition-start" markerWidth="12" markerHeight="12" refX="0" refY="6" orient="auto" markerUnits="userSpaceOnUse"><path d="M 0 6 L 6 1 L 12 6 L 6 11 Z" fill="#0050bd"/></marker>
<marker id="composition-end" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto" markerUnits="userSpaceOnUse"><path d="M 1 1 L 10 6 L 1 11" fill="none" stroke="#0050bd"/></marker>
<marker id="reference-end" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto" markerUnits="userSpaceOnUse"><path d="M 1 1 L 10 6 L 1 11" fill="none" stroke="#008000"/></marker>
</defs></svg><div id="diagram"></div><script nonce="${nonce}" src="${script}"></script></body></html>`;
        panel.webview.onDidReceiveMessage((message: unknown) => {
            void this.handle(state, message).catch(error => {
                void vscode.window.showErrorMessage(`Diagram action failed: ${error instanceof Error ? error.message : String(error)}`);
            });
        }, null, this.subscriptions);
        panel.onDidDispose(() => {
            state.pending?.cancel();
            state.pending?.dispose();
            if (state.timer) clearTimeout(state.timer);
            this.panels.delete(key);
        });
    }

    async revealSelection(editor: vscode.TextEditor): Promise<void> {
        const uri = editor.document.uri.toString();
        const state = this.panels.get(uri) ?? [...this.panels.values()].find(candidate =>
            candidate.model?.nodes.some(node => node.trace?.uri === uri) ||
            candidate.model?.targets.some(target => target.trace?.uri === uri));
        if (!state) {
            this.open(editor);
            void vscode.window.showInformationMessage('Diagram opened. Run “Reveal in VODSL Diagram” again when it has loaded.');
            return;
        }
        if (state.packageId && state.document.uri.toString() === uri) {
            state.packageId = undefined;
            await this.refresh(state);
        }
        const target = state.model?.targets.find(item => item.trace?.uri === uri && contains(item.trace.range, editor.selection.active));
        if (target) {
            state.expanded.add(target.id);
            await this.refresh(state);
        }
        const model = state.model;
        if (!model) {
            void vscode.window.showInformationMessage('Diagram is updating; try revealing the selection again.');
            return;
        }
        const position = editor.selection.active;
        const entries = [
            ...model.nodes.flatMap(node => [{ id: node.id, trace: node.trace }, ...node.rows]),
            ...model.edges, ...model.packages
        ];
        const matches = entries.filter(entry => entry.trace?.uri === editor.document.uri.toString()
            && contains(entry.trace.range, position));
        matches.sort((a, b) => span(a.trace!.range) - span(b.trace!.range));
        if (!matches.length) {
            void vscode.window.showInformationMessage('No diagram element corresponds to the current selection.');
            return;
        }
        const selectedPackage = model.packages.find(item => item.id === matches[0].id);
        if (selectedPackage && !model.nodes.some(node => node.id === selectedPackage.id)) {
            state.packageId = selectedPackage.parentId;
            await this.refresh(state);
            if (!state.model?.nodes.some(node => node.id === selectedPackage.id)) {
                void vscode.window.showWarningMessage('Package is no longer available in the diagram.');
                return;
            }
        }
        state.panel.reveal(vscode.ViewColumn.Beside, true);
        await state.panel.webview.postMessage({ kind: 'select', id: matches[0].id });
    }

    private schedule(state: PanelState): void {
        state.generation++;
        state.pending?.cancel();
        state.model = undefined;
        void state.panel.webview.postMessage({ kind: 'error', message: 'Updating diagram…' });
        if (state.timer) clearTimeout(state.timer);
        state.timer = setTimeout(() => { void this.refresh(state); }, 200);
    }

    private async refresh(state: PanelState): Promise<void> {
        if (state.timer) {
            clearTimeout(state.timer);
            state.timer = undefined;
        }
        const generation = ++state.generation;
        state.pending?.cancel();
        state.pending?.dispose();
        state.model = undefined;
        const token = state.pending = new vscode.CancellationTokenSource();
        try {
            const model = await this.client.sendRequest<DiagramModel>('vodsl/diagram', {
                uri: state.document.uri.toString(), options: { packageId: state.packageId, expanded: [...state.expanded] }
            }, token.token);
            if (generation !== state.generation || token.token.isCancellationRequested) return;
            state.model = model;
            state.versions = new Map(vscode.workspace.textDocuments.map(document => [document.uri.toString(), document.version]));
            await state.panel.webview.postMessage({ kind: 'model', model, generation });
        } catch (error) {
            if (generation !== state.generation || token.token.isCancellationRequested) return;
            const message = error instanceof Error ? error.message : String(error);
            await state.panel.webview.postMessage({ kind: 'error', message: `Diagram update failed: ${message}` });
        }
    }

    private async handle(state: PanelState, value: unknown): Promise<void> {
        if (!value || typeof value !== 'object' || !('kind' in value)) return;
        const message = value as { kind: unknown; id?: unknown; generation?: unknown };
        if (message.kind === 'ready') return this.refresh(state);
        if (message.kind === 'rendered' && message.generation === state.generation) {
            state.rendered = state.generation;
            return;
        }
        if (message.kind === 'overview') {
            state.packageId = undefined;
            state.expanded.clear();
            return this.refresh(state);
        }
        if (typeof message.id !== 'string' || !state.model) return;
        const id = message.id;
        if (message.kind === 'expand' && state.model.targets.some(target => target.id === id)) {
            state.expanded.add(id);
            return this.refresh(state);
        }
        if (message.kind === 'package' && state.model.nodes.some(node => node.id === id && node.kind === 'package')) {
            state.packageId = id;
            state.expanded.clear();
            return this.refresh(state);
        }
        if (message.kind === 'open') {
            const entries = [...state.model.nodes.flatMap(node => [node, ...node.rows]), ...state.model.edges];
            const trace = entries.find(entry => entry.id === id)?.trace;
            if (trace) {
                const current = vscode.workspace.textDocuments.find(document => document.uri.toString() === trace.uri);
                if (current && state.versions?.get(trace.uri) !== current.version) {
                    this.schedule(state);
                    void vscode.window.showWarningMessage('Diagram source changed; wait for the diagram to refresh.');
                    return;
                }
                await this.openTrace(trace);
            }
        }
    }

    private async openTrace(trace: DiagramTrace): Promise<void> {
        try {
            const document = await vscode.workspace.openTextDocument(vscode.Uri.parse(trace.uri));
            const start = new vscode.Position(trace.range.start.line, trace.range.start.character);
            const end = new vscode.Position(trace.range.end.line, trace.range.end.character);
            const range = new vscode.Range(start, end);
            if (!document.validateRange(range).isEqual(range)) throw new Error('Source location is no longer valid');
            const editor = await vscode.window.showTextDocument(document, { viewColumn: vscode.ViewColumn.One });
            editor.selection = new vscode.Selection(start, end);
            editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
        } catch (error) {
            void vscode.window.showErrorMessage(`Cannot navigate to diagram source: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    dispose(): void {
        for (const state of this.panels.values()) state.panel.dispose();
        this.subscriptions.forEach(subscription => subscription.dispose());
    }
}

function pathName(uri: vscode.Uri): string {
    return uri.path.split('/').pop() || uri.path;
}

function contains(range: DiagramTrace['range'], position: vscode.Position): boolean {
    return new vscode.Range(range.start.line, range.start.character, range.end.line, range.end.character).contains(position);
}

function span(range: DiagramTrace['range']): number {
    return (range.end.line - range.start.line) * 100000 + range.end.character - range.start.character;
}
