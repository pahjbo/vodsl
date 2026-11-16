import {
    Cancellation, DefaultDocumentBuilder, DocumentState, isOperationCancelled, type BuildOptions,
    type LangiumDocument, type LangiumSharedCoreServices
} from 'langium';
import { isVoDataModel } from './generated/ast.js';
import { includeUri } from './scope.js';

export class VodslDocumentBuilder extends DefaultDocumentBuilder {
    readonly includeErrors = new Map<string, string>();

    constructor(services: LangiumSharedCoreServices) {
        super(services);
    }

    protected override async buildDocuments(
        documents: LangiumDocument[],
        options: BuildOptions,
        cancelToken: Cancellation.CancellationToken
    ): Promise<void> {
        const all = [...documents];
        const seen = new Set(all.map(doc => doc.uri.toString()));
        for (let index = 0; index < all.length; index++) {
            const doc = all[index];
            await this.runCancelable([doc], DocumentState.Parsed, cancelToken,
                document => this.langiumDocumentFactory.update(document, cancelToken));
            const prefix = `${doc.uri.toString()}\n`;
            for (const key of this.includeErrors.keys()) {
                if (key.startsWith(prefix)) this.includeErrors.delete(key);
            }
            const model = doc.parseResult.value;
            if (!isVoDataModel(model)) continue;
            for (const include of model.includes) {
                const errorKey = `${doc.uri.toString()}\n${include.importURI}`;
                try {
                    const uri = includeUri(doc.uri, include.importURI);
                    if (seen.has(uri.toString())) continue;
                    const imported = await this.langiumDocuments.getOrCreateDocument(uri, cancelToken);
                    seen.add(uri.toString());
                    all.push(imported);
                } catch (error) {
                    if (isOperationCancelled(error)) throw error;
                    this.includeErrors.set(errorKey, error instanceof Error ? error.message : String(error));
                }
            }
        }
        await super.buildDocuments(all, options, cancelToken);
    }

    protected override shouldRelink(document: LangiumDocument, changedUris: Set<string>): boolean {
        if (super.shouldRelink(document, changedUris)) return true;
        const visited = new Set<string>();
        const dependsOnChanged = (doc: LangiumDocument): boolean => {
            if (visited.has(doc.uri.toString())) return false;
            visited.add(doc.uri.toString());
            const model = doc.parseResult.value;
            if (!isVoDataModel(model)) return false;
            for (const include of model.includes) {
                let uri;
                try {
                    uri = includeUri(doc.uri, include.importURI);
                } catch {
                    continue;
                }
                if (changedUris.has(uri.toString())) return true;
                const imported = this.langiumDocuments.getDocument(uri);
                if (imported && dependsOnChanged(imported)) return true;
            }
            return false;
        };
        return dependsOnChanged(document);
    }
}
