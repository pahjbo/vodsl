import assert from 'node:assert/strict';
import { test } from 'node:test';
import { URI } from 'langium';
import { NodeFileSystem } from 'langium/node';
import { type VoDataModel } from '../generated/ast.js';
import { createVodslServices } from '../vodsl-module.js';

async function diagnostics(text: string): Promise<string> {
    const { shared } = createVodslServices(NodeFileSystem);
    const document = shared.workspace.LangiumDocumentFactory.fromString<VoDataModel>(text, URI.parse('memory:///validation.vodsl'));
    shared.workspace.LangiumDocuments.addDocument(document);
    await shared.workspace.DocumentBuilder.build([document], { validation: true });
    return (document.diagnostics ?? []).map(d => String(d.message)).join('\n');
}

test('diagnoses duplicate names and cyclic inheritance', async () => {
    const messages = await diagnostics(`model sample (1) ""
        primitive text ""
        primitive text ""
        dtype A -> B {}
        dtype B -> A {}
        otype Foo { id : text ""; id : text ""; }`);
    assert.match(messages, /Duplicate name 'text'/);
    assert.match(messages, /Duplicate name 'id'/);
    assert.match(messages, /Cyclic inheritance/);
    assert.doesNotMatch(messages, /An error occurred during validation/);
});

test('checks subset inheritance and datatype narrowing', async () => {
    const messages = await diagnostics(`model sample (1) ""
        dtype Value {}
        dtype Narrow -> Value {}
        dtype Wrong {}
        otype Base { value : Value ""; }
        otype Unrelated { other : Value ""; }
        otype Good -> Base { subset Base.value as Narrow; }
        otype BadRole -> Base { subset Unrelated.other as Narrow; }
        otype BadType -> Base { subset Base.value as Wrong; }`);
    assert.match(messages, /must be inherited from a supertype/);
    assert.match(messages, /must be a subtype/);
    assert.doesNotMatch(messages, /An error occurred during validation/);
});

test('rejects constraints and processing instructions the schema cannot represent', async () => {
    const messages = await diagnostics(`model sample (1) ""
        primitive text "" < "regexp" as Regex >
        !xml x!
        otype Thing { id : text iskey "id" < "extra" >; }`);
    assert.match(messages, /Constraint language 'Regex'/);
    assert.match(messages, /Invalid XML processing instruction/);
    assert.match(messages, /at most one constraint/);
});

test('rejects integer values that would be rounded or invalid in XML', async () => {
    const messages = await diagnostics(`model sample (1) ""
        primitive text ""
        otype Thing { id : text @[2147483648] iskey ofRank 9007199254740993 "id"; }`);
    assert.match(messages, /Multiplicity exceeds the VO-DML maximum/);
    assert.match(messages, /Natural-key rank is too large/);
});
