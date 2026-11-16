import { basename, extname } from 'node:path';
import { type AstNode, type LangiumDocument } from 'langium';
import {
    isComplexType, isEnumeration, isPackageDeclaration, isPrimitiveType, isProperty, isVoDataModel,
    type Constraint, type Element, type Multiplicity, type ProcessingInstruction, type Property,
    type Reference, type SemanticConcept, type VoDataModel
} from './generated/ast.js';
import { includeUri, qualifiedId, qualifiedReference } from './scope.js';

function escapeXml(value: string): string {
    if (/[^\u0009\u000a\u000d\u0020-\ud7ff\ue000-\ufffd\u{10000}-\u{10ffff}]/u.test(value)) {
        throw new Error('Text contains a character that is not valid in XML 1.0');
    }
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function tag(name: string, value: string): string {
    return `<${name}>${escapeXml(value)}</${name}>`;
}

function ref(node: (AstNode & { name: string }) | undefined): string {
    if (!node) throw new Error('Cannot generate an unresolved reference');
    return tag('vodml-ref', qualifiedReference(node));
}

function preamble(node: AstNode & { name: string; description?: string }): string {
    return tag('vodml-id', qualifiedId(node)) + tag('name', node.name)
        + (node.description === undefined ? '' : tag('description', node.description));
}

function constraint(node: Constraint): string {
    if (node.language && node.language !== 'Natural') {
        throw new Error(`Constraint language '${node.language}' cannot be represented in VO-DML 1.1`);
    }
    return `<constraint>${tag('description', node.expr)}</constraint>`;
}

function semantic(node: SemanticConcept): string {
    return `<semanticconcept>${node.broadestConcept === undefined ? '' : tag('topConcept', node.broadestConcept)}${tag('vocabularyURI', node.vocabularyURI)}</semanticconcept>`;
}

function processingInstructions(nodes: ProcessingInstruction[]): string {
    return nodes.map(({ pitext }) => {
        const inner = pitext.slice(1, -1).trim();
        const match = /^([A-Za-z_:][A-Za-z0-9_.:-]*)(?:\s+([\s\S]*))?$/.exec(inner);
        if (!match || match[1].toLowerCase() === 'xml' || match[2]?.includes('?>')) {
            throw new Error(`Invalid XML processing instruction: ${pitext}`);
        }
        escapeXml(inner);
        return `<?${match[1]}${match[2] ? ` ${match[2]}` : ''}?>`;
    }).join('');
}

function multiplicity(node?: Multiplicity): string {
    let min = 1;
    let max = 1;
    if (node?.spec === '?') min = 0;
    else if (node?.spec === '*') { min = 0; max = -1; }
    else if (node?.spec === '+') max = -1;
    else if (node?.minOccurs !== undefined) {
        min = node.minOccurs;
        max = node.maxOccurs ?? min;
    }
    return `<multiplicity>${tag('minOccurs', String(min))}${tag('maxOccurs', String(max))}</multiplicity>`;
}

function role(node: Property | Reference): string {
    const property = isProperty(node) ? node : undefined;
    const element = property ? (property.composition ? 'composition' : 'attribute') : 'reference';
    const pi = property ? processingInstructions(property.pis) : '';
    let extra = '';
    if (property?.composition) {
        if (property.semanticConcept || property.constraints.length) {
            throw new Error(`Composition '${property.name}' has constraints or semantic concepts unsupported by the VO-DML schema`);
        }
        extra = property.ordered ? '<isOrdered>true</isOrdered>' : '';
    } else if (property) {
        if (property.constraints.length + Number(!!property.key) > 1) {
            throw new Error(`Attribute '${property.name}' has more than one constraint, which VO-DML 1.1 cannot represent`);
        }
        extra = property.semanticConcept ? semantic(property.semanticConcept) : '';
        if (property.key) {
            const keys = property.$container.content.filter((item): item is Property => isProperty(item) && !!item.key);
            const position = property.key.position ?? keys.indexOf(property) + 1;
            extra += `<constraint xsi:type="vo-dml:NaturalKey">${tag('position', String(position))}</constraint>`;
        }
        extra += property.constraints.map(constraint).join('');
    }
    return `${pi}<${element}>${preamble(node)}<datatype>${ref(node.type.ref)}</datatype>${multiplicity(node.multiplicity)}${extra}</${element}>`;
}

function elements(nodes: Element[]): string {
    const ordered = [
        ...nodes.filter(isPrimitiveType),
        ...nodes.filter(isEnumeration),
        ...nodes.filter(node => isComplexType(node) && node.kind === 'dtype'),
        ...nodes.filter(node => isComplexType(node) && node.kind === 'otype'),
        ...nodes.filter(isPackageDeclaration)
    ];
    return ordered.map(element => {
        if (isPackageDeclaration(element)) return `<package>${preamble(element)}${elements(element.elements)}</package>`;
        const name = isPrimitiveType(element) ? 'primitiveType'
            : isEnumeration(element) ? 'enumeration'
                : element.kind === 'dtype' ? 'dataType' : 'objectType';
        const pi = isComplexType(element) ? processingInstructions(element.pis) : '';
        const parent = element.superType?.ref;
        if (element.superType && !parent) throw new Error(`Unresolved supertype of '${element.name}'`);
        let body = preamble(element) + (parent ? `<extends>${ref(parent)}</extends>` : '');
        body += element.constraints.map(constraint).join('');
        if (isComplexType(element)) {
            body += element.subsets.map(subset =>
                `<constraint xsi:type="vo-dml:SubsettedRole"><role>${ref(subset.ref.ref)}</role><datatype>${ref(subset.type.ref)}</datatype></constraint>`
            ).join('');
            body += element.content.map(role).join('');
        } else if (isEnumeration(element)) {
            body += element.literals.map(literal => `<literal>${preamble(literal)}</literal>`).join('');
        }
        return `${pi}<${name}${element.abstract ? ' abstract="true"' : ''}>${body}</${name}>`;
    }).join('');
}

export function generateVodml(document: LangiumDocument, documents: LangiumDocument[], lastModified: Date): string {
    if (!documents.includes(document)) throw new Error('The input document must be included in the validated model graph');
    if (documents.some(candidate => candidate.diagnostics === undefined)) {
        throw new Error('All documents must be validated before generating VO-DML');
    }
    if (documents.some(candidate => candidate.diagnostics?.some(issue => issue.severity === 1))) {
        throw new Error('Cannot generate VO-DML from documents with validation errors');
    }
    const model = document.parseResult.value;
    if (!isVoDataModel(model)) throw new Error('Input is not a VODSL model');
    if (Number.isNaN(lastModified.valueOf())) throw new Error('Invalid last-modified timestamp');
    const imports = model.includes.map(include => {
        const uri = includeUri(document.uri, include.importURI);
        const imported = documents.find(candidate => candidate.uri.toString() === uri.toString());
        if (!imported || !isVoDataModel(imported.parseResult.value)) {
            throw new Error(`Unresolved include '${include.importURI}'`);
        }
        const importedModel: VoDataModel = imported.parseResult.value;
        const file = basename(uri.path);
        const url = file.slice(0, file.length - extname(file).length) + '.vo-dml.xml';
        return `<import>${tag('name', importedModel.model.name)}${tag('version', importedModel.model.version)}${tag('url', url)}</import>`;
    }).join('');
    const header = tag('name', model.model.name) + tag('description', model.model.description) + '<uri/>'
        + tag('title', model.model.titular ?? model.model.name)
        + model.model.authors.map(author => tag('author', author)).join('')
        + tag('version', model.model.version) + tag('lastModified', lastModified.toISOString());
    return `<?xml version="1.0" encoding="UTF-8"?>\n<vo-dml:model xmlns:vo-dml="http://www.ivoa.net/xml/VODML/v1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" vodmlVersion="1.1">${header}${imports}${elements(model.elements)}</vo-dml:model>\n`;
}
