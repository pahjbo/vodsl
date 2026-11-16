import { URI, type LangiumDocument, type LangiumSharedCoreServices } from 'langium';
import { isVoDataModel } from './generated/ast.js';
import { includeUri } from './scope.js';

export async function loadModelGraph(
    shared: LangiumSharedCoreServices,
    uri: URI
): Promise<LangiumDocument[]> {
    const documents: LangiumDocument[] = [];
    const visiting = new Set<string>();
    const visited = new Set<string>();

    async function visit(current: URI): Promise<void> {
        const key = current.toString();
        if (visiting.has(key)) throw new Error(`Cyclic include: ${key}`);
        if (visited.has(key)) return;
        visiting.add(key);
        const document = await shared.workspace.LangiumDocuments.getOrCreateDocument(current);
        if (!isVoDataModel(document.parseResult.value)) throw new Error(`Not a VODSL model: ${key}`);
        documents.push(document);
        for (const include of document.parseResult.value.includes) {
            const position = include.$cstNode?.range.start;
            const location = position ? `${key}:${position.line + 1}:${position.character + 1}` : key;
            let target: URI;
            try {
                target = includeUri(current, include.importURI);
            } catch (error) {
                throw new Error(`${location}: include '${include.importURI}': ${error instanceof Error ? error.message : String(error)}`);
            }
            try {
                await visit(target);
            } catch (error) {
                throw new Error(`${location}: include '${include.importURI}': ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        visiting.delete(key);
        visited.add(key);
    }

    await visit(uri);
    await shared.workspace.DocumentBuilder.build(documents, { validation: true });
    return documents;
}
