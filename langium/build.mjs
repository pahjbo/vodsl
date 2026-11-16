import { copyFile, chmod, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { build } from 'esbuild';

await mkdir('vscode/dist', { recursive: true });
await copyFile('../LICENSE', 'vscode/LICENSE');
const server = await build({
    entryPoints: ['src/server.ts', 'src/cli.ts'],
    outdir: 'vscode/dist',
    bundle: true,
    platform: 'node',
    format: 'esm',
    metafile: true,
    banner: { js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);' }
});
const extension = await build({
    entryPoints: ['src/extension.ts'],
    outfile: 'vscode/dist/extension.cjs',
    bundle: true,
    platform: 'node',
    format: 'cjs',
    metafile: true,
    external: ['vscode']
});
const diagram = await build({
    entryPoints: ['src/diagram-webview.js'],
    outfile: 'vscode/dist/diagram-webview.js',
    bundle: true,
    platform: 'browser',
    format: 'iife',
    metafile: true
});
await copyFile('src/diagram.css', 'vscode/dist/diagram.css');
await copyFile('node_modules/vscode-languageclient/lib/node/terminateProcess.sh', 'vscode/dist/terminateProcess.sh');
await chmod('vscode/dist/terminateProcess.sh', 0o755);

const packages = new Set();
for (const input of [...Object.keys(server.metafile.inputs), ...Object.keys(extension.metafile.inputs), ...Object.keys(diagram.metafile.inputs)]) {
    const match = input.match(/^(.*node_modules\/(?:@[^/]+\/)?[^/]+)\//);
    if (match) packages.add(match[1]);
}
const notices = [];
for (const directory of [...packages].sort()) {
    const metadata = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'));
    const files = await readdir(directory);
    const license = files.find(file => /^licen[cs]e(?:\.(?:md|txt))?$/i.test(file));
    if (license) {
        notices.push(`${metadata.name} ${metadata.version}\n${await readFile(join(directory, license), 'utf8')}`);
    } else if (metadata.name === 'autocompleter') {
        const readme = await readFile(join(directory, 'readme.md'), 'utf8');
        const section = readme.match(/^## License\s*\n([\s\S]*)$/m);
        if (!section) throw new Error('Missing autocompleter license in README');
        notices.push(`${metadata.name} ${metadata.version}\n${section[1]}`);
    } else {
        throw new Error(`Missing license file for bundled dependency ${metadata.name}`);
    }
}
await writeFile('vscode/dist/THIRD_PARTY_LICENSES.txt', notices.join('\n\n--------------------\n\n'));
