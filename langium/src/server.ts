import { startLanguageServer } from 'langium/lsp';
import { NodeFileSystem } from 'langium/node';
import { DocumentState, URI } from 'langium';
import { createConnection, ProposedFeatures } from 'vscode-languageserver/node';
import { generateDiagram, type DiagramOptions } from './diagram-model.js';
import { createVodslServices } from './vodsl-module.js';

const connection = createConnection(ProposedFeatures.all);
const { shared } = createVodslServices({ connection, ...NodeFileSystem });
connection.onRequest('vodsl/diagram', async (params: { uri: string; options?: DiagramOptions }, cancelToken) => {
    const uri = URI.parse(params.uri);
    await shared.workspace.DocumentBuilder.waitUntil(DocumentState.Validated, uri, cancelToken);
    const document = shared.workspace.LangiumDocuments.getDocument(uri);
    if (!document) throw new Error(`VODSL document is no longer available: ${params.uri}`);
    return generateDiagram(document, shared, params.options);
});
shared.workspace.DocumentBuilder.onBuildPhase(DocumentState.Validated, documents => {
    connection.sendNotification('vodsl/diagramChanged', documents.map(document => document.uri.toString()));
});
startLanguageServer(shared);
