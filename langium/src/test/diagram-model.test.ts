import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { URI } from 'langium';
import { NodeFileSystem } from 'langium/node';
import { generateDiagram } from '../diagram-model.js';
import { createVodslServices } from '../vodsl-module.js';
import { loadModelGraph } from '../workspace.js';

test('diagram maps packages, roles, inheritance and imported targets', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'vodsl-diagram-'));
    try {
        const base = join(directory, 'base.vodsl');
        const main = join(directory, 'main.vodsl');
        await writeFile(base, 'model base (1.0) "base" otype External {}');
        await writeFile(main, `model main (1.0) "main"
            include "base.vodsl"
            primitive text "text"
            otype Base {}
            package nested {
                dtype Value { name : text @? "name"; }
                enum Choice { one "one", two "two" }
                otype Item -> Base {
                    child : base:External @* as composition "child";
                    link @? references Base "link";
                }
            }`);
        const { shared } = createVodslServices(NodeFileSystem);
        const [document] = await loadModelGraph(shared, URI.file(main));
        const diagram = generateDiagram(document, shared);
        assert.deepEqual(diagram.errors, []);
        assert.deepEqual(diagram.nodes.map(node => node.name).sort(), ['Base', 'Choice', 'Item', 'Value', 'nested', 'text']);
        assert.equal(diagram.nodes.find(node => node.name === 'Value')?.rows[0].text, 'name: main:text [0..1]');
        assert.deepEqual(diagram.nodes.find(node => node.name === 'Choice')?.rows.map(row => row.text), ['one', 'two']);
        assert.deepEqual(diagram.edges.map(edge => edge.kind).sort(), ['inheritance', 'reference']);
        assert.equal(diagram.targets.length, 1);
        assert.equal(diagram.targets[0].name, 'base:External');
        assert.equal(diagram.targets[0].imported, true);
        const expanded = generateDiagram(document, shared, { expanded: [diagram.targets[0].id] });
        assert.equal(expanded.nodes.find(node => node.name === 'External')?.imported, true);
        assert.equal(expanded.edges.find(edge => edge.kind === 'composition')?.label, 'child [0..*]');
        const packageId = diagram.nodes.find(node => node.name === 'nested')?.id;
        assert.ok(packageId);
        const packageDiagram = generateDiagram(document, shared, { packageId });
        assert.deepEqual(packageDiagram.nodes.map(node => node.name).sort(), ['Choice', 'Item', 'Value']);
        assert.ok(packageDiagram.targets.some(target => target.name === 'main:Base'));
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});

test('diagram exposes errors while retaining recoverable types', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'vodsl-diagram-errors-'));
    try {
        const file = join(directory, 'bad.vodsl');
        await writeFile(file, 'model bad (1) "" otype A { broken references Missing ""; }');
        const { shared } = createVodslServices(NodeFileSystem);
        const [document] = await loadModelGraph(shared, URI.file(file));
        const diagram = generateDiagram(document, shared);
        assert.ok(diagram.nodes.some(node => node.name === 'A'));
        assert.ok(diagram.errors.length > 0);
        assert.deepEqual(diagram.edges, []);
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});

test('named diagram identities survive sibling insertion without conflating duplicates', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'vodsl-diagram-identity-'));
    try {
        const file = join(directory, 'identity.vodsl');
        const diagram = async (source: string) => {
            await writeFile(file, source);
            const { shared } = createVodslServices(NodeFileSystem);
            const [document] = await loadModelGraph(shared, URI.file(file));
            return generateDiagram(document, shared);
        };
        const before = await diagram('model identity (1) "" otype A {} otype B {}');
        const after = await diagram('model identity (1) "" otype New {} otype A {} otype B {}');
        const b = before.nodes.find(node => node.name === 'B');
        assert.ok(b?.stable);
        assert.equal(after.nodes.find(node => node.name === 'B')?.id, b.id);
        const duplicates = await diagram('model identity (1) "" otype A {} otype A {}');
        assert.equal(new Set(duplicates.nodes.map(node => node.id)).size, 2);
        assert.ok(duplicates.nodes.every(node => !node.stable));
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});
