import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { URI } from 'langium';
import { NodeFileSystem } from 'langium/node';
import { generateVodml } from '../generator.js';
import { createVodslServices } from '../vodsl-module.js';
import { loadModelGraph } from '../workspace.js';

const source = `model example (1.0) "model &amp; text" title "Example"
    primitive string "value"
    dtype Quantity { value : string "value"; }
    dtype Narrow -> Quantity {}
    abstract otype Base { name : Quantity "name"; }
    !meta ucd="meta.id"!
    otype Child -> Base {
        subset Base.name as Narrow;
        id : string iskey "first";
        second : string iskey ofRank 0 "second" semantic "http://example.org/concept" in "http://example.org/vocab";
        parts : Child @[3,-1] as ordered composition "parts";
        parent @? references Base "parent";
    }
    enum options { one "one", two "two" }
    package nested { primitive angle "angle" }
`;

test('generates escaped, linked VO-DML with subsets and natural keys', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'vodsl-compiler-'));
    try {
        const path = join(directory, 'example.vodsl');
        await writeFile(path, source);
        const { shared } = createVodslServices(NodeFileSystem);
        const documents = await loadModelGraph(shared, URI.file(path));
        assert.deepEqual(documents[0].diagnostics, []);
        const xml = generateVodml(documents[0], documents, new Date('2024-01-02T03:04:05Z'));
        assert.match(xml, /model &amp;amp; text/);
        assert.match(xml, /<vodml-ref>example:Base.name<\/vodml-ref>/);
        assert.match(xml, /<maxOccurs>-1<\/maxOccurs>/);
        assert.match(xml, /<position>1<\/position>/);
        assert.match(xml, /<position>0<\/position>/);
        assert.match(xml, /<\?meta ucd="meta.id"\?>/);
        assert.match(xml, /<semanticconcept>/);
        const output = join(directory, 'output.xml');
        await writeFile(output, xml);
        const schema = process.env.VODSL_SCHEMA ?? resolve('test-resources/schema/vo-dml-v1.0.xsd');
        execFileSync('xmllint', ['--nonet', '--noout', '--schema', schema, output], { stdio: 'pipe' });
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});

test('CLI does not write output for syntax errors', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'vodsl-cli-'));
    try {
        const input = join(directory, 'invalid.vodsl');
        const output = join(directory, 'invalid.xml');
        await writeFile(input, 'model test (1) "" otype A { r references ; }');
        const cli = resolve('out/cli.js');
        const result = spawnSync(process.execPath, [cli, input, '-o', output], { encoding: 'utf8' });
        assert.equal(result.status, 1, result.stderr);
        assert.match(result.stderr, /error:/);
        assert.doesNotMatch(result.stderr, /An error occurred during validation/);
        await assert.rejects(readFile(output), { code: 'ENOENT' });
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});

test('CLI generates schema-valid imports and refuses to overwrite included models', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'vodsl-cli-import-'));
    try {
        const base = join(directory, 'base.vodsl');
        const input = join(directory, 'main.vodsl');
        const output = join(directory, 'main.xml');
        await writeFile(base, 'model base (1.0) "base" primitive text "text"');
        await writeFile(input, 'model main (1.0) "main" include "base.vodsl" dtype D { text : base:text "text"; }');
        const cli = resolve('out/cli.js');
        const result = spawnSync(process.execPath, [cli, input, '-o', output], { encoding: 'utf8' });
        assert.equal(result.status, 0, result.stderr);
        const xml = await readFile(output, 'utf8');
        assert.match(xml, /<import><name>base<\/name><version>1.0<\/version><url>base.vo-dml.xml<\/url><\/import>/);
        assert.match(xml, /<vodml-ref>base:text<\/vodml-ref>/);
        execFileSync('xmllint', [
            '--nonet', '--noout', '--schema',
            process.env.VODSL_SCHEMA ?? resolve('test-resources/schema/vo-dml-v1.0.xsd'), output
        ], { stdio: 'pipe' });
        const overwrite = spawnSync(process.execPath, [cli, input, '-o', base], { encoding: 'utf8' });
        assert.notEqual(overwrite.status, 0);
        assert.match(overwrite.stderr, /must not overwrite/);
        assert.match(await readFile(base, 'utf8'), /^model base/);
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});
