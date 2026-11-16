import 'reflect-metadata';
import { Container, ContainerModule, injectable } from 'inversify';
import {
    configureModelElement, configureViewerOptions, loadDefaultModules, LocalModelSource,
    PolylineEdgeView, SGraphImpl, SGraphView, SNodeImpl, SEdgeImpl, TYPES
} from 'sprotty';
import { svg } from 'sprotty/lib/lib/jsx.js';
import ELK from 'elkjs/lib/elk.bundled.js';

const vscode = acquireVsCodeApi();
const elk = new ELK();
const positions = new Map();
let sequence = 0;
let current;

class NodeView {
    render(node) {
        const stereotype = { dataType: '<<dataType>>', enumeration: '<<enumeration>>', primitive: '<<primitive>>', package: '<<package>>' }[node.kind] ?? '';
        const headingY = stereotype ? 39 : 25;
        const children = [
            svg('rect', { width: node.size.width, height: node.size.height, 'class-vodsl-node': true }),
            svg('text', { x: node.size.width / 2, y: 20, 'class-stereotype': true }, stereotype),
            svg('text', { x: node.size.width / 2, y: headingY, 'class-heading': true, 'class-abstract': node.abstract }, node.name),
            svg('line', { x1: 0, x2: node.size.width, y1: 48, y2: 48, 'class-divider': true })
        ];
        if (node.imported) children.push(svg('text', { x: node.size.width - 6, y: 13, 'class-imported': true }, 'import'));
        node.rows.forEach((row, index) => children.push(svg('text', {
            x: 10, y: 67 + index * 19, 'class-row': true, tabindex: '0',
            on: {
                dblclick: event => { event.stopPropagation(); vscode.postMessage({ kind: 'open', id: row.id }); },
                keydown: event => { if (event.key === 'Enter') vscode.postMessage({ kind: 'open', id: row.id }); }
            }
        }, row.text)));
        return svg('g', {
            'class-vodsl-class': true, 'class-selected': node.selected,
            tabindex: '0', role: 'button', attrs: { 'aria-label': `${node.kind} ${node.name}` },
            on: {
                dblclick: event => {
                    event.stopPropagation();
                    vscode.postMessage({ kind: node.kind === 'package' ? 'package' : 'open', id: node.id });
                },
                keydown: event => {
                    if (event.key === 'Enter') vscode.postMessage({ kind: node.kind === 'package' ? 'package' : 'open', id: node.id });
                }
            }
        }, ...children);
    }
}
injectable()(NodeView);

class EdgeView extends PolylineEdgeView {
    renderLine(edge, points) {
        const path = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x},${point.y}`).join(' ');
        return svg('path', {
            d: path, 'class-relationship': true, 'class-selected': edge.selected, [`class-${edge.kind}`]: true,
            tabindex: '0', role: 'button',
            attrs: {
                'marker-end': `url(#${edge.kind}-end)`,
                'aria-label': `${edge.kind} ${edge.label}`,
                ...(edge.kind === 'composition' ? { 'marker-start': 'url(#composition-start)' } : {})
            },
            on: {
                dblclick: () => vscode.postMessage({ kind: 'open', id: edge.id }),
                keydown: event => { if (event.key === 'Enter') vscode.postMessage({ kind: 'open', id: edge.id }); }
            }
        });
    }
    renderAdditionals(edge, points) {
        if (!edge.label || points.length < 2) return [];
        const a = points[Math.floor((points.length - 1) / 2)];
        const b = points[Math.ceil((points.length - 1) / 2)];
        return [svg('text', { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 5, 'class-edge-label': true }, edge.label)];
    }
}
injectable()(EdgeView);

const container = new Container();
loadDefaultModules(container);
container.load(new ContainerModule((bind, unbind, isBound, rebind) => {
    const context = { bind, unbind, isBound, rebind };
    bind(TYPES.ModelSource).to(LocalModelSource).inSingletonScope();
    configureModelElement(context, 'graph', SGraphImpl, SGraphView);
    configureModelElement(context, 'node:vodsl', SNodeImpl, NodeView);
    configureModelElement(context, 'edge:vodsl', SEdgeImpl, EdgeView);
    configureViewerOptions(context, { baseDiv: 'diagram', needsClientLayout: false, needsServerLayout: false });
}));
const source = container.get(TYPES.ModelSource);
const dispatcher = container.get(TYPES.IActionDispatcher);

async function show(model, relayout = false) {
    const request = ++sequence;
    const selected = new Set();
    if (!relayout && source.model.children) {
        for (const child of source.model.children) {
            if (child.type === 'node:vodsl' && child.stable && child.position) positions.set(child.id, child.position);
            if (child.selected) selected.add(child.id);
        }
    }
    if (relayout) positions.clear();
    const stableIds = new Set(model.nodes.filter(node => node.stable).map(node => node.id));
    for (const id of positions.keys()) if (!stableIds.has(id)) positions.delete(id);
    const nodes = model.nodes.map(node => {
        const width = Math.max(150, Math.min(650, Math.max(node.name.length, ...node.rows.map(row => row.text.length), 0) * 8 + 30));
        return { ...node, type: 'node:vodsl', size: { width, height: Math.max(65, 58 + node.rows.length * 19) } };
    });
    const layout = await elk.layout({
        id: 'layout', layoutOptions: { 'elk.algorithm': 'layered', 'elk.direction': 'RIGHT', 'elk.spacing.nodeNode': '50' },
        children: nodes.map(node => ({ id: node.id, width: node.size.width, height: node.size.height })),
        edges: model.edges.map(edge => ({ id: edge.id, sources: [edge.source], targets: [edge.target] }))
    });
    if (request !== sequence) return false;
    const placed = new Map(layout.children.map(node => [node.id, { x: node.x ?? 0, y: node.y ?? 0 }]));
    const routes = new Map((layout.edges ?? []).map(edge => [edge.id, edge.sections?.[0]?.bendPoints ?? []]));
    const children = [
        ...model.edges.map(edge => ({ ...edge, type: 'edge:vodsl', sourceId: edge.source, targetId: edge.target,
            routingPoints: positions.has(edge.source) || positions.has(edge.target) ? [] : routes.get(edge.id) ?? [] })),
        ...nodes.map(node => ({ ...node, selected: selected.has(node.id), position: positions.get(node.id) ?? placed.get(node.id) ?? { x: 0, y: 0 } }))
    ];
    await source.updateModel({ id: 'root', type: 'graph', children });
    if (request !== sequence) return false;
    current = model;
    document.getElementById('title').textContent = model.title;
    document.getElementById('status').textContent = model.errors.length ? `Partial diagram: ${model.errors.join('; ')}` : '';
    const targets = document.getElementById('targets');
    targets.replaceChildren();
    for (const target of model.targets) {
        const button = document.createElement('button');
        button.textContent = `Show ${target.name}${target.imported ? ' (import)' : ''}`;
        button.addEventListener('click', () => vscode.postMessage({ kind: 'expand', id: target.id }));
        targets.appendChild(button);
    }
    return true;
}

window.addEventListener('message', event => {
    const message = event.data;
    if (message.kind === 'model') {
        const update = show(message.model);
        const request = sequence;
        update.then(rendered => { if (rendered) vscode.postMessage({ kind: 'rendered', generation: message.generation }); })
            .catch(error => { if (request === sequence) document.getElementById('status').textContent = `Diagram layout failed: ${error.message}`; });
    } else if (message.kind === 'error') {
        sequence++;
        document.getElementById('status').textContent = message.message;
    } else if (message.kind === 'select') {
        const owner = current?.nodes.find(node => node.id === message.id || node.rows.some(row => row.id === message.id));
        const id = owner?.id ?? message.id;
        const deselectedElementsIDs = (source.model.children ?? []).filter(child => child.selected && child.id !== id).map(child => child.id);
        dispatcher.dispatch({ kind: 'elementSelected', selectedElementsIDs: [id], deselectedElementsIDs });
        dispatcher.dispatch({ kind: 'center', elementIds: [id], animate: true });
    }
});
document.getElementById('overview').addEventListener('click', () => vscode.postMessage({ kind: 'overview' }));
document.getElementById('layout').addEventListener('click', () => {
    if (current) {
        const update = show(current, true);
        const request = sequence;
        update.catch(error => { if (request === sequence) document.getElementById('status').textContent = `Diagram layout failed: ${error.message}`; });
    }
});
document.getElementById('fit').addEventListener('click', () => dispatcher.dispatch({ kind: 'fit', elementIds: [], animate: true }));
vscode.postMessage({ kind: 'ready' });
