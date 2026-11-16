import { startLanguageServer } from 'langium/lsp';
import { NodeFileSystem } from 'langium/node';
import { createConnection, ProposedFeatures } from 'vscode-languageserver/node';
import { createVodslServices } from './vodsl-module.js';

const connection = createConnection(ProposedFeatures.all);
const { shared } = createVodslServices({ connection, ...NodeFileSystem });
startLanguageServer(shared);
