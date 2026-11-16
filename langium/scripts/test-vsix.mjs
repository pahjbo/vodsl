import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { downloadAndUnzipVSCode, resolveCliPathFromVSCodeExecutablePath, runTests } from '@vscode/test-electron';

const root = await mkdtemp(join(process.platform === 'win32' ? process.env.TEMP : '/tmp', 'vodsl-vsix-'));
const extensions = join(root, 'extensions');
const profile = join(root, 'profile');
const emptyPath = join(root, 'empty-path');
await mkdir(emptyPath);
const vsix = resolve(process.env.VODSL_VSIX ?? 'vodsl.vsix');
try {
    if (process.env.VODSL_NODE_OVERRIDE) {
        await mkdir(join(profile, 'User'), { recursive: true });
        await writeFile(join(profile, 'User', 'settings.json'),
            JSON.stringify({ 'vodsl.nodePath': process.env.VODSL_NODE_OVERRIDE }));
    }
    const executable = process.env.VSCODE_EXECUTABLE_PATH ??
        await downloadAndUnzipVSCode({ version: process.env.VSCODE_VERSION ?? '1.146.0' });
    const cli = resolveCliPathFromVSCodeExecutablePath(executable);
    const args = [`--extensions-dir=${extensions}`, `--user-data-dir=${profile}`, '--install-extension', vsix, '--force'];
    const install = spawnSync(cli, args, { stdio: 'inherit', shell: process.platform === 'win32' });
    if (install.error || install.status !== 0) throw install.error ?? new Error(`VSIX install failed: ${install.status}`);
    await runTests({
        vscodeExecutablePath: executable,
        extensionDevelopmentPath: resolve('test-resources/vscode-test'),
        extensionTestsPath: resolve('test-resources/vscode-test/runner.cjs'),
        extensionTestsEnv: { VODSL_VSIX_TEST_DIR: root, VODSL_EMPTY_PATH: emptyPath, PATH: emptyPath },
        launchArgs: [root, `--extensions-dir=${extensions}`, `--user-data-dir=${profile}`,
            '--disable-workspace-trust', '--skip-welcome', '--skip-release-notes']
    });
    const validation = spawnSync('xmllint', [
        '--nonet', '--noout', '--schema',
        resolve(process.env.VODSL_SCHEMA ?? 'test-resources/schema/vo-dml-v1.0.xsd'),
        join(root, 'main.vo-dml.xml')
    ], { stdio: 'inherit' });
    if (validation.error || validation.status !== 0) throw validation.error ?? new Error('Generated VO-DML failed schema validation');
} finally {
    await rm(root, { recursive: true, force: true });
}
