import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { chromium } from 'playwright-core';

test('Sprotty webview renders nodes, relationships and navigation controls', {
    skip: !process.env.VODSL_CHROME_PATH, timeout: 30000
}, async () => {
    const browser = await chromium.launch({ executablePath: process.env.VODSL_CHROME_PATH, args: ['--no-sandbox'] });
    try {
        const page = await browser.newPage();
        const errors: string[] = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.setContent(`<!doctype html><html><body>
            <header><span id="title"></span><button id="overview"></button><button id="layout"></button><button id="fit"></button></header>
            <svg width="0" height="0"><defs><linearGradient id="node-gradient"><stop offset="0" stop-color="#9ebce3"/><stop offset="1" stop-color="#dce6ff"/></linearGradient></defs></svg>
            <div id="status"></div><div id="targets"></div><div id="diagram" style="width: 800px;height: 600px"></div>
            </body></html>`);
        await page.evaluate(() => {
            Object.assign(window, {
                messages: [] as unknown[],
                acquireVsCodeApi: () => ({ postMessage: (message: unknown) => (window as unknown as { messages: unknown[] }).messages.push(message) })
            });
        });
        await page.addStyleTag({ path: resolve('src/diagram.css') });
        await page.addScriptTag({ path: resolve('vscode/dist/diagram-webview.js') });
        await page.evaluate(() => {
            const message = {
            kind: 'model', model: {
                title: 'Demo',
                nodes: [
                    { id: 'file:///model.vodsl#["ComplexType:A"]', name: 'A', kind: 'objectType', abstract: false, imported: false, stable: true, rows: [{ id: 'row', text: 'name: demo:text' }] },
                    { id: 'b', name: 'B', kind: 'dataType', abstract: false, imported: false, stable: true, rows: [] },
                    { id: 'p', name: 'Package', kind: 'package', abstract: false, imported: false, stable: true, rows: [] }
                ],
                edges: [
                    { id: 'edge', source: 'file:///model.vodsl#["ComplexType:A"]', target: 'b', kind: 'reference', label: 'link [0..1]' },
                    { id: 'edge2', source: 'file:///model.vodsl#["ComplexType:A"]', target: 'b', kind: 'composition', label: 'child' },
                    { id: 'loop', source: 'file:///model.vodsl#["ComplexType:A"]', target: 'file:///model.vodsl#["ComplexType:A"]', kind: 'inheritance', label: '' }
                ],
                targets: [{ id: 'c', name: 'base:C', imported: true }], errors: []
            }};
            Object.assign(window, { diagramMessage: message });
            window.postMessage(message, '*');
        });
        await page.locator('.vodsl-node').first().waitFor();
        assert.equal(await page.locator('.vodsl-node').count(), 3);
        await page.locator('.relationship.reference').waitFor({ timeout: 5000, state: 'attached' }).catch(async error => {
            throw new Error(`${String(error)}; errors=${errors.join('; ')}; svg=${await page.locator('#diagram').innerHTML()}`);
        });
        assert.equal(await page.locator('.relationship.reference').getAttribute('marker-end'), 'url(#reference-end)');
        assert.equal(await page.locator('.relationship.composition').getAttribute('marker-start'), 'url(#composition-start)');
        assert.equal(await page.locator('.relationship.composition').getAttribute('marker-end'), 'url(#composition-end)');
        assert.equal(await page.locator('.relationship.inheritance').getAttribute('marker-end'), 'url(#inheritance-end)');
        assert.ok((await page.locator('.relationship.inheritance').getAttribute('d'))?.includes('L'));
        assert.equal(await page.locator('#title').textContent(), 'Demo');
        await page.getByText('Show base:C (import)').click();
        await page.getByText('A', { exact: true }).dblclick();
        await page.getByText('Package', { exact: true }).dblclick();
        const messages = await page.evaluate(() => (window as unknown as { messages: Array<{ kind: string; id?: string }> }).messages);
        assert.ok(messages.some(message => message.kind === 'expand' && message.id === 'c'));
        assert.ok(messages.some(message => message.kind === 'open' && message.id === 'file:///model.vodsl#["ComplexType:A"]'));
        assert.ok(messages.some(message => message.kind === 'package' && message.id === 'p'));
        const node = page.locator('[id="diagram_file:///model.vodsl#[\\"ComplexType:A\\"]"]');
        const before = await node.getAttribute('transform');
        const box = await node.boundingBox();
        assert.ok(box);
        await page.mouse.click(box.x + 30, box.y + 15);
        await page.waitForTimeout(300);
        await page.mouse.move(box.x + 30, box.y + 15);
        await page.mouse.down();
        await page.mouse.move(box.x + 80, box.y + 35, { steps: 5 });
        await page.mouse.up();
        await page.waitForTimeout(300);
        const moved = await node.getAttribute('transform');
        const hit = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.outerHTML, { x: box.x + 30, y: box.y + 15 });
        assert.notEqual(moved, before, `node should move when dragged; class=${await node.getAttribute('class')}; hit=${hit}; errors=${errors.join('; ')}`);
        await page.evaluate(() => window.postMessage((window as unknown as { diagramMessage: unknown }).diagramMessage, '*'));
        await page.waitForTimeout(1000);
        assert.equal(await node.getAttribute('transform'), moved, 'refresh should retain dragged positions');
        await page.locator('#diagram').click({ position: { x: 790, y: 590 } });
        await page.locator('.selected .vodsl-node').waitFor({ state: 'detached' });
        await page.evaluate(() => window.postMessage({ kind: 'select', id: 'row' }, '*'));
        await page.locator('.selected .vodsl-node').waitFor();
        await page.waitForTimeout(300);
        await page.locator('.row').dispatchEvent('keydown', { key: 'Enter' });
        await page.locator('.relationship.reference').dispatchEvent('keydown', { key: 'Enter' });
        const navigation = await page.evaluate(() => (window as unknown as { messages: Array<{ kind: string; id?: string }> }).messages);
        assert.ok(navigation.some(message => message.kind === 'open' && message.id === 'row'));
        assert.ok(navigation.some(message => message.kind === 'open' && message.id === 'edge'));
        await page.locator('#layout').click();
        await page.waitForFunction(({ id, moved }) => document.getElementById(id)?.getAttribute('transform') !== moved,
            { id: 'diagram_file:///model.vodsl#["ComplexType:A"]', moved });
        await page.evaluate(() => {
            const message = (window as unknown as { diagramMessage: { model: { errors: string[] } } }).diagramMessage;
            message.model.errors = ['Unresolved reference'];
            window.postMessage(message, '*');
        });
        await page.getByText('Partial diagram: Unresolved reference').waitFor();
        assert.deepEqual(errors, []);
    } finally {
        await browser.close();
    }
});
