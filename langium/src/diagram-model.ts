import { AstUtils, type AstNode, type LangiumDocument, type LangiumSharedCoreServices } from 'langium';
import type { Range } from 'vscode-languageserver';
import {
    isComplexType, isEnumeration, isPackageDeclaration, isProperty, isVoDataModel,
    type DefinitionType, type Element, type Multiplicity, type PackageDeclaration
} from './generated/ast.js';
import { qualifiedReference } from './scope.js';

export interface DiagramTrace {
    uri: string;
    range: Range;
}

export interface DiagramRow {
    id: string;
    text: string;
    trace?: DiagramTrace;
}

export interface DiagramNode {
    id: string;
    name: string;
    kind: 'package' | 'primitive' | 'enumeration' | 'dataType' | 'objectType';
    abstract: boolean;
    imported: boolean;
    stable: boolean;
    trace?: DiagramTrace;
    rows: DiagramRow[];
}

export interface DiagramEdge {
    id: string;
    source: string;
    target: string;
    kind: 'inheritance' | 'composition' | 'reference';
    label: string;
    trace?: DiagramTrace;
}

export interface DiagramTarget {
    id: string;
    name: string;
    imported: boolean;
    trace?: DiagramTrace;
}

export interface DiagramModel {
    title: string;
    nodes: DiagramNode[];
    edges: DiagramEdge[];
    targets: DiagramTarget[];
    packages: { id: string; parentId?: string; trace?: DiagramTrace }[];
    errors: string[];
}

export interface DiagramOptions {
    packageId?: string;
    expanded?: string[];
}

export function multiplicityLabel(multiplicity?: Multiplicity): string {
    if (!multiplicity) return '';
    switch (multiplicity.spec) {
        case '?': return '[0..1]';
        case '*': return '[0..*]';
        case '+': return '[1..*]';
        case 'ONE': return '[1]';
        default:
            if (multiplicity.minOccurs === undefined) return '';
            if (multiplicity.maxOccurs === undefined) return `[${multiplicity.minOccurs}]`;
            return `[${multiplicity.minOccurs}..${multiplicity.maxOccurs === -1 ? '*' : multiplicity.maxOccurs}]`;
    }
}

export function generateDiagram(
    document: LangiumDocument,
    shared: LangiumSharedCoreServices,
    options: DiagramOptions = {}
): DiagramModel {
    const model = document.parseResult.value;
    const result: DiagramModel = {
        title: isVoDataModel(model) ? model.model?.name ?? 'VODSL' : 'VODSL',
        nodes: [], edges: [], targets: [], packages: [], errors: []
    };
    for (const diagnostic of document.diagnostics ?? []) {
        if (diagnostic.severity === 1) result.errors.push(typeof diagnostic.message === 'string' ? diagnostic.message : diagnostic.message.value);
    }
    if (!isVoDataModel(model)) {
        result.errors.push('No recoverable VODSL model');
        return result;
    }
    const locator = shared.ServiceRegistry.getServices(document.uri).workspace.AstNodeLocator;
    const identities = new Map<string, Map<AstNode, { id: string; stable: boolean }>>();
    const identity = (node: AstNode): { id: string; stable: boolean } => {
        const owner = AstUtils.getDocument(node);
        const uri = owner.uri.toString();
        let entries = identities.get(uri);
        if (!entries) {
            entries = new Map();
            identities.set(uri, entries);
            const groups = new Map<string, AstNode[]>();
            for (const candidate of AstUtils.streamAllContents(owner.parseResult.value)) {
                const parts: string[] = [];
                let current: AstNode | undefined = candidate;
                let named = true;
                while (current && current !== owner.parseResult.value) {
                    if (!('name' in current) || typeof current.name !== 'string' || !current.name) {
                        named = false;
                        break;
                    }
                    parts.unshift(`${current.$type}:${current.name}`);
                    current = current.$container;
                }
                const key = named ? JSON.stringify(parts) : `path:${locator.getAstNodePath(candidate)}`;
                const group = groups.get(key) ?? [];
                group.push(candidate);
                groups.set(key, group);
            }
            for (const [key, group] of groups) {
                for (const candidate of group) {
                    const stable = !key.startsWith('path:') && group.length === 1;
                    entries.set(candidate, {
                        id: `${uri}#${key}${stable ? '' : `:${locator.getAstNodePath(candidate)}`}`,
                        stable
                    });
                }
            }
        }
        return entries.get(node) ?? { id: `${uri}#path:${locator.getAstNodePath(node)}`, stable: false };
    };
    const id = (node: AstNode): string => identity(node).id;
    const trace = (node: AstNode): DiagramTrace | undefined => node.$cstNode
        ? { uri: AstUtils.getDocument(node).uri.toString(), range: node.$cstNode.range } : undefined;
    const all: Element[] = [];
    const collect = (elements: Element[]): void => {
        for (const element of elements) {
            all.push(element);
            if (isPackageDeclaration(element)) collect(element.elements);
        }
    };
    collect(model.elements);
    result.packages = all.filter(isPackageDeclaration).map(element => ({
        id: id(element),
        parentId: isPackageDeclaration(element.$container) ? id(element.$container) : undefined,
        trace: trace(element)
    }));
    const selected = options.packageId
        ? all.find((element): element is PackageDeclaration => isPackageDeclaration(element) && id(element) === options.packageId)
        : undefined;
    if (options.packageId && !selected) result.errors.push('Selected package no longer exists; showing the model overview.');
    if (selected) result.title = qualifiedReference(selected);

    const initial: Element[] = [];
    if (selected) {
        initial.push(...selected.elements);
    } else {
        initial.push(...model.elements.filter(isPackageDeclaration));
        initial.push(...all.filter(element => !isPackageDeclaration(element)));
    }
    const nodeById = new Map<string, DiagramNode>();
    const definitionById = new Map<string, DefinitionType>();
    const addNode = (element: Element): void => {
        const key = id(element);
        if (nodeById.has(key)) return;
        const kind = isPackageDeclaration(element) ? 'package' : isEnumeration(element) ? 'enumeration'
            : isComplexType(element) ? element.kind === 'dtype' ? 'dataType' : 'objectType' : 'primitive';
        const rows: DiagramRow[] = [];
        if (isComplexType(element)) {
            for (const role of element.content) {
                if (!isProperty(role) || role.composition) continue;
                const target = role.type?.ref;
                const typeName = target ? qualifiedReference(target) : role.type?.$refText ?? '?';
                rows.push({ id: id(role), text: `${role.name}: ${typeName} ${multiplicityLabel(role.multiplicity)}`.trim(), trace: trace(role) });
            }
        } else if (isEnumeration(element)) {
            for (const literal of element.literals) rows.push({ id: id(literal), text: literal.name, trace: trace(literal) });
        }
        const node: DiagramNode = {
            id: key, name: element.name, kind, abstract: !isPackageDeclaration(element) && element.abstract,
            imported: AstUtils.getDocument(element).uri.toString() !== document.uri.toString(),
            stable: identity(element).stable,
            trace: trace(element), rows
        };
        nodeById.set(key, node);
        result.nodes.push(node);
        if (!isPackageDeclaration(element)) definitionById.set(key, element);
    };
    initial.forEach(addNode);

    const expanded = new Set(options.expanded ?? []);
    const targetIds = new Set<string>();
    for (let index = 0; index < result.nodes.length; index++) {
        const node = result.nodes[index];
        const element = definitionById.get(node.id);
        if (!element) continue;
        const addEdge = (target: DefinitionType | undefined, sourceNode: AstNode,
            kind: DiagramEdge['kind'], label: string): void => {
            if (!target) {
                result.errors.push(`Unresolved ${kind} in ${element.name}`);
                return;
            }
            const targetId = id(target);
            if (!nodeById.has(targetId) && expanded.has(targetId)) addNode(target);
            if (!nodeById.has(targetId)) {
                if (!targetIds.has(targetId)) {
                    targetIds.add(targetId);
                    result.targets.push({ id: targetId, name: qualifiedReference(target),
                        imported: AstUtils.getDocument(target).uri.toString() !== document.uri.toString(),
                        trace: trace(target) });
                }
                return;
            }
            result.edges.push({ id: `${kind}:${id(sourceNode)}`, source: node.id, target: targetId,
                kind, label, trace: trace(sourceNode) });
        };
        if (element.superType) addEdge(element.superType.ref, element, 'inheritance', '');
        if (isComplexType(element)) {
            for (const role of element.content) {
                if (isProperty(role) && !role.composition) continue;
                addEdge(role.type?.ref, role, isProperty(role) ? 'composition' : 'reference',
                    `${role.name} ${multiplicityLabel(role.multiplicity)}`.trim());
            }
        }
    }
    return result;
}
