import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { URI } from 'langium';
import { NodeFileSystem } from 'langium/node';
import { createVodslServices } from '../vodsl-module.js';
import { loadModelGraph } from '../workspace.js';

const directory = process.env.VODSL_MODELS_DIR;

test('upstream example highlights its legacy UCD syntax and discouraged multiplicities', { skip: !directory }, async () => {
    const { shared } = createVodslServices(NodeFileSystem);
    const documents = await loadModelGraph(shared, URI.file(join(directory!, 'example.vodsl')));
    const messages = (documents[0].diagnostics ?? []).map(d => String(d.message)).join('\n');
    assert.match(messages, /UCD/);
    assert.match(messages, /Multiplicity '\*'/);
    assert.match(messages, /Multiplicity '\+'/);
    assert.doesNotMatch(messages, /An error occurred during validation/);
    assert.equal(documents[1].diagnostics?.length, 0);
});

test('upstream invalid example reports representative scoping and syntax errors', { skip: !directory }, async () => {
    const { shared } = createVodslServices(NodeFileSystem);
    const documents = await loadModelGraph(shared, URI.file(join(directory!, 'test.vodsl')));
    const messages = (documents[0].diagnostics ?? []).map(d => String(d.message)).join('\n');
    for (const expected of ['daft', 'sprim', 'obscore:Access', "found `;`", 'same kind of type', 'object type']) {
        assert.ok(messages.includes(expected), `Expected ${expected} in:\n${messages}`);
    }
    assert.doesNotMatch(messages, /An error occurred during validation/);
});
