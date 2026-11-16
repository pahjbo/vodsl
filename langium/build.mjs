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
await copyFile('node_modules/vscode-languageclient/lib/node/terminateProcess.sh', 'vscode/dist/terminateProcess.sh');
await chmod('vscode/dist/terminateProcess.sh', 0o755);

const packages = new Set();
for (const input of [...Object.keys(server.metafile.inputs), ...Object.keys(extension.metafile.inputs)]) {
    const match = input.match(/^(.*node_modules\/(?:@[^/]+\/)?[^/]+)\//);
    if (match) packages.add(match[1]);
}
const notices = [];
for (const directory of [...packages].sort()) {
    const metadata = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'));
    const files = await readdir(directory);
    const license = files.find(file => /^licen[cs]e(?:\.(?:md|txt))?$/i.test(file));
    if (!license) throw new Error(`Missing license file for bundled dependency ${metadata.name}`);
    notices.push(`${metadata.name} ${metadata.version}\n${await readFile(join(directory, license), 'utf8')}`);
}
await writeFile('vscode/dist/THIRD_PARTY_LICENSES.txt', notices.join('\n\n--------------------\n\n'));
