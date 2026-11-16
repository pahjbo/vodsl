#!/usr/bin/env node
import { stat, writeFile } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';
import { URI } from 'langium';
import { NodeFileSystem } from 'langium/node';
import { generateVodml } from './generator.js';
import { createVodslServices } from './vodsl-module.js';
import { loadModelGraph } from './workspace.js';

async function main(args: string[]): Promise<number> {
    if (args.length === 0 || args.includes('--help')) {
        console.error('Usage: vodsl <model.vodsl> [-o <output.vo-dml.xml>]');
        return args.includes('--help') ? 0 : 1;
    }
    if (args.length !== 1 && !(args.length === 3 && args[1] === '-o')) {
        throw new Error('Expected one input file and optional -o output file');
    }
    const input = resolve(args[0]);
    const output = resolve(args[2] ?? `${basename(input, extname(input))}.vo-dml.xml`);
    if (input === output) throw new Error('Output must not overwrite the input model');
    const { shared } = createVodslServices(NodeFileSystem);
    const documents = await loadModelGraph(shared, URI.file(input));
    if (documents.some(document => resolve(document.uri.fsPath) === output)) {
        throw new Error('Output must not overwrite an included VODSL model');
    }
    let errors = false;
    for (const document of documents) {
        for (const diagnostic of document.diagnostics ?? []) {
            const message = typeof diagnostic.message === 'string' ? diagnostic.message : diagnostic.message.value;
            const severity = diagnostic.severity === 1 ? 'error' : 'warning';
            const { line, character } = diagnostic.range.start;
            console.error(`${document.uri.fsPath}:${line + 1}:${character + 1}: ${severity}: ${message}`);
            if (diagnostic.severity === 1) errors = true;
        }
    }
    if (errors) return 1;
    const xml = generateVodml(documents[0], documents, (await stat(input)).mtime);
    await writeFile(output, xml, 'utf8');
    return 0;
}

main(process.argv.slice(2)).then(code => { process.exitCode = code; }).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
