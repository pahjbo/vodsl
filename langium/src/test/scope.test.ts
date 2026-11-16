import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { URI } from 'langium';
import { NodeFileSystem } from 'langium/node';
import { createVodslServices } from '../vodsl-module.js';
import { loadModelGraph } from '../workspace.js';

test('resolves local packages and explicitly included models only', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'vodsl-scope-'));
    try {
        await writeFile(join(directory, 'base.vodsl'), `model ivoa (1.0) "base"
            primitive real "real" dtype Quantity {}`);
        await writeFile(join(directory, 'main.vodsl'), `model sample (1.0) "sample"
            include "base.vodsl"
            primitive real "local"
            package top {
                primitive value ""
                package a {
                    dtype Item -> ivoa:Quantity {
                        x : real "";
                        y : value "";
                        z : top.b.other "";
                        imported : ivoa:real "";
                        notVisible : other "";
                        notImported : unrelated:Thing "";
                    }
                }
                package b { primitive other "" }
            }`);
        const { shared } = createVodslServices(NodeFileSystem);
        const docs = await loadModelGraph(shared, URI.file(join(directory, 'main.vodsl')));
        const diagnostics = docs[0].diagnostics ?? [];
        const messages = diagnostics.map(d => typeof d.message === 'string' ? d.message : d.message.value);
        assert.equal(messages.length, 2, messages.join('\n'));
        assert.ok(messages.some(message => message.includes("'other'")));
        assert.ok(messages.some(message => message.includes("'unrelated:Thing'")));
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});

test('rejects remote and cyclic includes', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'vodsl-import-'));
    try {
        const main = join(directory, 'main.vodsl');
        await writeFile(main, 'model one (1) "" include "https://example.org/a.vodsl" primitive x ""');
        const one = createVodslServices(NodeFileSystem);
        await assert.rejects(loadModelGraph(one.shared, URI.file(main)), /Unsupported include URI scheme/);
        await writeFile(main, 'model one (1) "" include "other.vodsl" primitive x ""');
        await writeFile(join(directory, 'other.vodsl'), 'model two (1) "" include "main.vodsl" primitive y ""');
        const two = createVodslServices(NodeFileSystem);
        await assert.rejects(loadModelGraph(two.shared, URI.file(main)), /Cyclic include/);
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});

test('editor document builder loads imports and updates diagnostics when imports change', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'vodsl-update-'));
    try {
        const base = join(directory, 'base.vodsl');
        const main = join(directory, 'main.vodsl');
        await writeFile(base, 'model base (1) "" primitive text ""');
        await writeFile(main, 'model main (1) "" include "base.vodsl" dtype D { value : base:text ""; }');
        const { shared } = createVodslServices(NodeFileSystem);
        const document = await shared.workspace.LangiumDocuments.getOrCreateDocument(URI.file(main));
        await shared.workspace.DocumentBuilder.build([document], { validation: true });
        assert.equal(document.diagnostics?.length, 0);
        await writeFile(base, 'model base (1) "" primitive other ""');
        shared.workspace.DocumentBuilder.updateBuildOptions = { validation: true };
        await shared.workspace.DocumentBuilder.update([URI.file(base)], []);
        assert.ok(document.diagnostics?.some(d => String(d.message).includes('base:text')));
        await writeFile(base, 'model base (1) "" primitive text ""');
        await shared.workspace.DocumentBuilder.update([URI.file(base)], []);
        assert.equal(document.diagnostics?.length, 0);
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});

test('editor reports missing, duplicate and cyclic includes', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'vodsl-errors-'));
    try {
        const main = join(directory, 'main.vodsl');
        await writeFile(main, `model main (1) ""
            include "main.vodsl" include "main.vodsl"
            include "missing.vodsl" include "https://example.org/base.vodsl"
            primitive text ""`);
        const { shared } = createVodslServices(NodeFileSystem);
        const document = await shared.workspace.LangiumDocuments.getOrCreateDocument(URI.file(main));
        await shared.workspace.DocumentBuilder.build([document], { validation: true });
        const messages = (document.diagnostics ?? []).map(d => String(d.message)).join('\n');
        assert.match(messages, /Cyclic include/);
        assert.match(messages, /Duplicate include/);
        assert.match(messages, /Cannot load include 'missing.vodsl'/);
        assert.match(messages, /Unsupported include URI scheme/);
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});

test('supports absolute local file URIs and rejects remote file authorities', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'vodsl-file-uri-'));
    try {
        const base = join(directory, 'base.vodsl');
        const main = join(directory, 'main.vodsl');
        await writeFile(base, 'model base (1) "" primitive text ""');
        await writeFile(main, `model main (1) "" include "${URI.file(base).toString()}" dtype D { id : base:text ""; }`);
        const { shared } = createVodslServices(NodeFileSystem);
        const documents = await loadModelGraph(shared, URI.file(main));
        assert.equal(documents[0].diagnostics?.length, 0);
        const remote = join(directory, 'remote.vodsl');
        await writeFile(remote, 'model remote (1) "" include "file://example.org/model.vodsl" primitive text ""');
        await assert.rejects(loadModelGraph(createVodslServices(NodeFileSystem).shared, URI.file(remote)), /Remote file URI/);
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});
