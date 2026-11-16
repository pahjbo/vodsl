import {
    AstUtils, DefaultLinker, DefaultScopeProvider, URI, UriUtils,
    type AstNode, type AstNodeDescription, type LangiumCoreServices, type LinkingError, type ReferenceInfo, type Scope
} from 'langium';
import {
    isComplexType, isDefinitionType, isEnumeration, isPackageDeclaration, isPrimitiveType,
    isRole, isSubSet, isVoDataModel, type ComplexType, type Element, type VoDataModel
} from './generated/ast.js';

export function includeUri(base: URI, value: string): URI {
    if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(value)) {
        const uri = URI.parse(value, true);
        if (uri.scheme !== 'file') throw new Error(`Unsupported include URI scheme '${uri.scheme}'`);
        if (uri.authority && uri.authority !== 'localhost') throw new Error('Remote file URI authorities are not supported');
        if (uri.query || uri.fragment) throw new Error('File include URIs cannot have a query or fragment');
        if (!uri.path.startsWith('/')) throw new Error('File include URI must have an absolute path');
        return uri;
    }
    if (base.scheme !== 'file') throw new Error('Relative includes require a file URI');
    return UriUtils.resolvePath(UriUtils.dirname(base), value);
}

export function modelOf(node: AstNode): VoDataModel {
    const root = AstUtils.findRootNode(node);
    if (!isVoDataModel(root)) throw new Error('Expected a VODSL model');
    return root;
}

export function qualifiedId(node: AstNode & { name: string }): string {
    const segments = [node.name];
    let container = node.$container;
    while (container && !isVoDataModel(container)) {
        if ('name' in container && typeof container.name === 'string') segments.unshift(container.name);
        container = container.$container;
    }
    return segments.join('.');
}

export function qualifiedReference(node: AstNode & { name: string }): string {
    return `${modelOf(node).model.name}:${qualifiedId(node)}`;
}

export class VodslScopeProvider extends DefaultScopeProvider {
    private readonly documents;

    constructor(services: LangiumCoreServices) {
        super(services);
        this.documents = services.shared.workspace.LangiumDocuments;
    }

    override getScope(context: ReferenceInfo): Scope {
        const document = AstUtils.getDocument(context.container);
        const model = modelOf(context.container);
        const referenceType = this.reflection.getReferenceType(context);
        const layers: AstNodeDescription[][] = [];
        const allowed = (node: AstNode): boolean => {
            if (!isSubSet(context.container)) return true;
            const subset = context.container;
            if (context.property === 'ref') {
                if (!isRole(node)) return false;
                let parent = subset.$container.superType?.ref;
                const seen = new Set<ComplexType>();
                while (parent && !seen.has(parent)) {
                    if (parent === node.$container) return true;
                    seen.add(parent);
                    parent = parent.superType?.ref;
                }
                return false;
            }
            if (context.property === 'type') {
                const original = subset.ref?.ref?.type?.ref;
                if (!original || isPrimitiveType(original) || !isDefinitionType(node)) return false;
                const seen = new Set<AstNode>();
                let candidate: typeof node | undefined = node;
                while (candidate && !seen.has(candidate)) {
                    seen.add(candidate);
                    candidate = candidate.superType?.ref;
                    if (candidate === original) return true;
                }
                return false;
            }
            return true;
        };
        const appendElements = (elements: Element[], prefix: string, out: AstNodeDescription[]) => {
            for (const element of elements) {
                const name = prefix + element.name;
                if (this.reflection.isSubtype(element.$type, referenceType) && allowed(element)) {
                    out.push(this.descriptions.createDescription(element, name));
                }
                if (isComplexType(element)) {
                    for (const role of element.content) {
                        if (this.reflection.isSubtype(role.$type, referenceType) && allowed(role)) {
                            out.push(this.descriptions.createDescription(role, `${name}.${role.name}`));
                        }
                    }
                } else if (isEnumeration(element)) {
                    for (const literal of element.literals) {
                        if (this.reflection.isSubtype(literal.$type, referenceType) && allowed(literal)) {
                            out.push(this.descriptions.createDescription(literal, `${name}.${literal.name}`));
                        }
                    }
                } else if (isPackageDeclaration(element)) {
                    appendElements(element.elements, `${name}.`, out);
                }
            }
        };
        let current: AstNode | undefined = context.container;
        while (current) {
            if (isPackageDeclaration(current) || isVoDataModel(current)) {
                const layer: AstNodeDescription[] = [];
                appendElements(current.elements, '', layer);
                layers.push(layer);
            }
            current = current.$container;
        }
        const qualified: AstNodeDescription[] = [];
        if (model.model?.name) {
            appendElements(model.elements, `${model.model.name}:`, qualified);
            appendElements(model.elements, `${model.model.name}.`, qualified);
        }
        for (const include of model.includes) {
            try {
                const imported = this.documents.getDocument(includeUri(document.uri, include.importURI));
                if (imported && isVoDataModel(imported.parseResult.value) && imported.parseResult.value.model?.name) {
                    const importedModel = imported.parseResult.value;
                    appendElements(importedModel.elements, `${importedModel.model.name}:`, qualified);
                    appendElements(importedModel.elements, `${importedModel.model.name}.`, qualified);
                }
            } catch {
                // Include errors are reported by validation.
            }
        }
        let scope = this.createScope(qualified);
        for (let i = layers.length - 1; i >= 0; i--) {
            scope = this.createScope(layers[i], scope, { concatOuterScope: false });
        }
        return scope;
    }
}

export class VodslLinker extends DefaultLinker {
    override getCandidate(info: ReferenceInfo): AstNodeDescription | LinkingError {
        const name = info.reference.$refText.replace(/\^/g, '');
        const candidates = this.scopeProvider.getScope(info).getElements(name)
            .distinct(description => `${description.documentUri}#${description.path}`).toArray();
        if (candidates.length > 1) {
            return { info, message: `Ambiguous reference '${info.reference.$refText}'` };
        }
        if (candidates.length === 0 && isSubSet(info.container)) {
            if (info.property === 'ref') {
                return { info, message: `Subset role '${name}' must be inherited from a supertype` };
            }
            if (info.property === 'type' && info.container.ref?.ref) {
                return { info, message: `Subset datatype '${name}' must be a subtype of the inherited role datatype` };
            }
        }
        return candidates[0] ?? this.createLinkingError(info);
    }
}
