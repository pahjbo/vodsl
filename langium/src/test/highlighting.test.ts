import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { test } from 'node:test';
import oniguruma from 'vscode-oniguruma';
import textmate from 'vscode-textmate';

const { loadWASM, OnigScanner, OnigString } = oniguruma;
const { INITIAL, Registry, parseRawGrammar } = textmate;

test('TextMate grammar highlights language keywords, strings, escapes and processing instructions', async () => {
    const require = createRequire(import.meta.url);
    await loadWASM(await readFile(require.resolve('vscode-oniguruma/release/onig.wasm')));
    const grammarText = await readFile(resolve('vscode/vodsl.tmLanguage.json'), 'utf8');
    const registry = new Registry({
        onigLib: Promise.resolve({
            createOnigScanner: patterns => new OnigScanner(patterns),
            createOnigString: text => new OnigString(text)
        }),
        loadGrammar: async () => parseRawGrammar(grammarText, 'vodsl.tmLanguage.json')
    });
    const grammar = await registry.loadGrammar('source.vodsl');
    assert.ok(grammar);
    const text = 'otype ^author { !meta x! value : string "hello"; // comment';
    const tokens = grammar.tokenizeLine(text, INITIAL).tokens;
    const scopeAt = (needle: string) => tokens.find(token => token.startIndex <= text.indexOf(needle) && token.endIndex > text.indexOf(needle))?.scopes.join(' ');
    assert.match(scopeAt('otype') ?? '', /keyword/);
    assert.match(scopeAt('^author') ?? '', /escaped/);
    assert.match(scopeAt('!meta') ?? '', /processing-instruction/);
    assert.match(scopeAt('"hello"') ?? '', /string/);
    assert.match(scopeAt('// comment') ?? '', /comment/);
});
