import assert from 'node:assert/strict';
import { test } from 'node:test';
import { URI } from 'langium';
import { NodeFileSystem } from 'langium/node';
import { createVodslServices } from '../vodsl-module.js';
import { isComplexType, isProperty, type VoDataModel } from '../generated/ast.js';

test('parses representative VODSL syntax', async () => {
    const { shared } = createVodslServices(NodeFileSystem);
    const text = `model example (1.0) "model" author "A"
        primitive string "value"
        !meta ucd="meta.id"!
        otype Source "source" {
            !meta ucd="meta.id"!
            ^author : string @? iskey ofRank 0 "author";
        }`;
    const document = shared.workspace.LangiumDocumentFactory.fromString<VoDataModel>(text, URI.parse('memory:///test.vodsl'));
    assert.deepEqual(document.parseResult.lexerErrors, []);
    assert.deepEqual(document.parseResult.parserErrors, []);
    assert.equal(document.parseResult.value.model.version, '1.0');
    const source = document.parseResult.value.elements[1];
    assert.ok(isComplexType(source));
    const attribute = source.content[0];
    assert.ok(isProperty(attribute));
    assert.equal(attribute.name, 'author');
    assert.equal(attribute.key?.position, 0);
    assert.equal(attribute.multiplicity?.spec, '?');
});

test('parses unbounded multiplicities and qualified names', async () => {
    const { shared } = createVodslServices(NodeFileSystem);
    const text = `model example (1) "model"
        otype Container {
            items : example:pkg.Item @[3,-1] as ordered composition "items";
        }`;
    const document = shared.workspace.LangiumDocumentFactory.fromString<VoDataModel>(text, URI.parse('memory:///test.vodsl'));
    assert.deepEqual(document.parseResult.lexerErrors, []);
    assert.deepEqual(document.parseResult.parserErrors, []);
    const source = document.parseResult.value.elements[0];
    assert.ok(isComplexType(source));
    const item = source.content[0];
    assert.ok(isProperty(item));
    assert.equal(item.type.$refText, 'example:pkg.Item');
    assert.equal(item.multiplicity?.maxOccurs, -1);
    assert.equal(item.ordered, true);
});

test('reports invalid attribute targets and unbounded multiplicity', async () => {
    const { shared } = createVodslServices(NodeFileSystem);
    const text = `model example (1.0) "model"
        otype Target {}
        otype Source {
            target : Target @* "invalid";
        }`;
    const document = shared.workspace.LangiumDocumentFactory.fromString<VoDataModel>(text, URI.parse('memory:///validation.vodsl'));
    shared.workspace.LangiumDocuments.addDocument(document);
    await shared.workspace.DocumentBuilder.build([document], { validation: true });
    const messages = (document.diagnostics ?? []).map(diagnostic =>
        typeof diagnostic.message === 'string' ? diagnostic.message : diagnostic.message.value);
    assert.ok(messages.some(message => message.includes('value type')), messages.join('\n'));
    assert.ok(messages.some(message => message.includes('strongly discouraged')), messages.join('\n'));
});

test('allows whitespace and comments in datatype and reference rules', async () => {
    const { shared } = createVodslServices(NodeFileSystem);
    const text = `model example (1 /* version */ . 0) ""
        primitive text ""
        otype A { value : example /* model */ : text @[3, - 1] ""; }`;
    const document = shared.workspace.LangiumDocumentFactory.fromString<VoDataModel>(text, URI.parse('memory:///spacing.vodsl'));
    shared.workspace.LangiumDocuments.addDocument(document);
    await shared.workspace.DocumentBuilder.build([document], { validation: true });
    const model = document.parseResult.value;
    assert.equal(model.model.version, '1.0');
    const type = model.elements[1];
    assert.ok(isComplexType(type));
    const value = type.content[0];
    assert.ok(isProperty(value));
    assert.equal(value.multiplicity?.maxOccurs, -1);
    assert.ok(value.type.ref);
});

test('decodes Unicode and escaped backslashes in strings', async () => {
    const { shared } = createVodslServices(NodeFileSystem);
    const text = String.raw`model example (1.0) "\u0041 \\u0042 \n" primitive text ""`;
    const document = shared.workspace.LangiumDocumentFactory.fromString<VoDataModel>(text, URI.parse('memory:///strings.vodsl'));
    assert.deepEqual(document.parseResult.lexerErrors, []);
    assert.deepEqual(document.parseResult.parserErrors, []);
    assert.equal(document.parseResult.value.model.description, 'A \\u0042 \n');
});
