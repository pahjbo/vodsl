import { AstUtils, inject, type AstNode, type Module, type ValidationAcceptor, type ValidationChecks } from 'langium';
import {
    createDefaultModule, createDefaultSharedModule,
    type DefaultSharedModuleContext, type LangiumServices, type LangiumSharedServices,
    type PartialLangiumServices, type PartialLangiumSharedServices
} from 'langium/lsp';
import {
    isComplexType, isEnumeration, isPrimitiveType, isVoDataModel,
    type ComplexType, type Constraint, type Element, type Enumeration, type Multiplicity,
    type NaturalKey, type PackageDeclaration, type PrimitiveType, type ProcessingInstruction,
    type IncludeDeclaration, type Property, type Reference, type SubSet, type VoDataModel, type VodslAstType
} from './generated/ast.js';
import { VodslGeneratedModule, VodslGeneratedSharedModule } from './generated/module.js';
import { includeUri, VodslLinker, VodslScopeProvider } from './scope.js';
import { VodslDocumentBuilder } from './document-builder.js';
import { VodslValueConverter } from './value-converter.js';

type VodslServices = LangiumServices & { validation: { VodslValidator: VodslValidator } };

const VodslModule: Module<VodslServices, PartialLangiumServices & { validation: { VodslValidator: VodslValidator } }> = {
    parser: { ValueConverter: () => new VodslValueConverter() },
    references: {
        ScopeProvider: services => new VodslScopeProvider(services),
        Linker: services => new VodslLinker(services)
    },
    validation: {
        VodslValidator: services => new VodslValidator(services.shared)
    }
};

export function createVodslServices(context: DefaultSharedModuleContext): {
    shared: LangiumSharedServices;
    vodsl: VodslServices;
} {
    const sharedModule: Module<LangiumSharedServices, PartialLangiumSharedServices> = {
        workspace: { DocumentBuilder: services => new VodslDocumentBuilder(services) }
    };
    const shared = inject(createDefaultSharedModule(context), VodslGeneratedSharedModule, sharedModule);
    const vodsl = inject(createDefaultModule({ shared }), VodslGeneratedModule, VodslModule);
    shared.ServiceRegistry.register(vodsl);
    const checks: ValidationChecks<VodslAstType> = {
        ComplexType: vodsl.validation.VodslValidator.checkComplexType,
        Property: vodsl.validation.VodslValidator.checkProperty,
        Reference: vodsl.validation.VodslValidator.checkReference,
        PrimitiveType: vodsl.validation.VodslValidator.checkSimpleType,
        Enumeration: vodsl.validation.VodslValidator.checkSimpleType,
        SubSet: vodsl.validation.VodslValidator.checkSubset,
        PackageDeclaration: vodsl.validation.VodslValidator.checkPackage,
        VoDataModel: vodsl.validation.VodslValidator.checkModel,
        IncludeDeclaration: vodsl.validation.VodslValidator.checkInclude,
        Multiplicity: vodsl.validation.VodslValidator.checkBounds,
        NaturalKey: vodsl.validation.VodslValidator.checkNaturalKey,
        Constraint: vodsl.validation.VodslValidator.checkConstraint,
        ProcessingInstruction: vodsl.validation.VodslValidator.checkInstruction
    };
    vodsl.validation.ValidationRegistry.register(checks, vodsl.validation.VodslValidator);
    if (!context.connection) {
        shared.workspace.ConfigurationProvider.initialized({});
    }
    return { shared, vodsl };
}

class VodslValidator {
    constructor(private readonly shared: LangiumSharedServices) {}

    checkInclude(include: IncludeDeclaration, accept: ValidationAcceptor): void {
        const document = AstUtils.getDocument(include);
        const builder = this.shared.workspace.DocumentBuilder;
        if (!(builder instanceof VodslDocumentBuilder)) return;
        const error = builder.includeErrors.get(`${document.uri.toString()}\n${include.importURI}`);
        if (error) {
            accept('error', `Cannot load include '${include.importURI}': ${error}`, { node: include, property: 'importURI' });
            return;
        }
        let target;
        try {
            target = includeUri(document.uri, include.importURI);
        } catch (cause) {
            accept('error', `Invalid include: ${cause instanceof Error ? cause.message : String(cause)}`, { node: include, property: 'importURI' });
            return;
        }
        const imports = include.$container.includes;
        if (imports.slice(0, imports.indexOf(include)).some(other => {
            try {
                return includeUri(document.uri, other.importURI).toString() === target.toString();
            } catch {
                return false;
            }
        })) {
            accept('error', `Duplicate include '${include.importURI}'`, { node: include, property: 'importURI' });
        }
        const documents = this.shared.workspace.LangiumDocuments;
        const imported = documents.getDocument(target)?.parseResult.value;
        if (isVoDataModel(imported) && imported.model?.name) {
            const name = imported.model.name;
            const clashes = include.$container.model?.name === name || imports.slice(0, imports.indexOf(include)).some(other => {
                try {
                    const earlier = documents.getDocument(includeUri(document.uri, other.importURI))?.parseResult.value;
                    return isVoDataModel(earlier) && earlier.model?.name === name;
                } catch {
                    return false;
                }
            });
            if (clashes) {
                accept('error', `Imported model name '${name}' is not unique`, { node: include, property: 'importURI' });
            }
        }
        const visited = new Set<string>();
        const reaches = (uri: typeof target): boolean => {
            if (uri.toString() === document.uri.toString()) return true;
            if (visited.has(uri.toString())) return false;
            visited.add(uri.toString());
            const imported = documents.getDocument(uri)?.parseResult.value;
            if (!isVoDataModel(imported)) return false;
            return imported.includes.some(child => {
                try {
                    return reaches(includeUri(uri, child.importURI));
                } catch {
                    return false;
                }
            });
        };
        if (reaches(target)) {
            accept('error', `Cyclic include '${include.importURI}'`, { node: include, property: 'importURI' });
        }
    }

    checkModel(model: VoDataModel, accept: ValidationAcceptor): void {
        if (model.model?.name && !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(model.model.name)) {
            accept('error', 'Model name is not a valid VO-DML model name', { node: model.model, property: 'name' });
        }
        this.checkNames(model.elements, accept);
    }

    checkBounds(node: Multiplicity, accept: ValidationAcceptor): void {
        if (node.minOccurs !== undefined && !Number.isSafeInteger(node.minOccurs)) {
            accept('error', 'Minimum multiplicity is too large to represent safely', { node, property: 'minOccurs' });
        }

        if (node.maxOccurs !== undefined && (!Number.isSafeInteger(node.maxOccurs) || node.maxOccurs > 2147483647)) {
            accept('error', 'Maximum multiplicity is outside the VO-DML integer range', { node, property: 'maxOccurs' });
        }
        if (node.minOccurs !== undefined && node.maxOccurs === undefined && node.minOccurs > 2147483647) {
            accept('error', 'Multiplicity exceeds the VO-DML maximum integer range', { node, property: 'minOccurs' });
        }
    }

    checkNaturalKey(node: NaturalKey, accept: ValidationAcceptor): void {
        if (node.position !== undefined && !Number.isSafeInteger(node.position)) {
            accept('error', 'Natural-key rank is too large to represent safely', { node, property: 'position' });
        }
    }

    checkConstraint(node: Constraint, accept: ValidationAcceptor): void {
        if (node.language && node.language !== 'Natural') {
            accept('error', `Constraint language '${node.language}' cannot be represented in VO-DML 1.1`, { node, property: 'language' });
        }
    }

    checkInstruction(node: ProcessingInstruction, accept: ValidationAcceptor): void {
        const inner = node.pitext.slice(1, -1).trim();
        const match = /^([A-Za-z_:][A-Za-z0-9_.:-]*)(?:\s+([\s\S]*))?$/.exec(inner);
        if (!match || match[1].toLowerCase() === 'xml' || match[2]?.includes('?>')) {
            accept('error', 'Invalid XML processing instruction', { node, property: 'pitext' });
        }
    }

    checkPackage(node: PackageDeclaration, accept: ValidationAcceptor): void {
        this.checkNames(node.elements, accept);
    }

    private checkNames(nodes: Array<Element | Property | Reference>, accept: ValidationAcceptor): void {
        const seen = new Set<string>();
        for (const node of nodes) {
            if (seen.has(node.name)) {
                accept('error', `Duplicate name '${node.name}'`, { node, property: 'name' });
            }
            seen.add(node.name);
            if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(node.name)) {
                accept('error', 'Name is not a valid VO-DML identifier', { node, property: 'name' });
            }
        }
    }

    private checkCycle(type: ComplexType | PrimitiveType | Enumeration, accept: ValidationAcceptor): void {
        const seen = new Set<AstNode>([type]);
        let current: ComplexType | PrimitiveType | Enumeration | undefined = type.superType?.ref;
        while (current) {
            if (seen.has(current)) {
                accept('error', 'Cyclic inheritance is not allowed', { node: type, property: 'superType' });
                return;
            }
            seen.add(current);
            current = current.superType?.ref;
        }
    }

    checkSimpleType(type: PrimitiveType | Enumeration, accept: ValidationAcceptor): void {
        this.checkCycle(type, accept);
        if (isEnumeration(type)) {
            const names = new Set<string>();
            for (const literal of type.literals) {
                if (names.has(literal.name)) accept('error', `Duplicate literal '${literal.name}'`, { node: literal, property: 'name' });
                names.add(literal.name);
                if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(literal.name)) {
                    accept('error', 'Name is not a valid VO-DML identifier', { node: literal, property: 'name' });
                }
            }
        }
    }

    checkComplexType(type: ComplexType, accept: ValidationAcceptor): void {
        this.checkCycle(type, accept);
        this.checkNames(type.content, accept);
        const parent = type.superType?.ref;
        if (parent && parent.kind !== type.kind) {
            accept('error', `${type.kind} must extend the same kind of type`, { node: type, property: 'superType' });
        }
    }

    checkSubset(subset: SubSet, accept: ValidationAcceptor): void {
        const role = subset.ref?.ref;
        const narrowed = subset.type?.ref;
        if (!role || !narrowed) return;
        let ancestor = subset.$container.superType?.ref;
        const seen = new Set<ComplexType>();
        while (ancestor && ancestor !== role.$container && !seen.has(ancestor)) {
            seen.add(ancestor);
            ancestor = ancestor.superType?.ref;
        }
        if (!ancestor || ancestor !== role.$container) {
            accept('error', 'A subset must refer to a role inherited from a supertype', { node: subset, property: 'ref' });
        }
        const original = role.type?.ref;
        if (!original) return;
        if (isPrimitiveType(original)) {
            accept('error', 'An inherited primitive role cannot be subsetted', { node: subset, property: 'type' });
            return;
        }
        const typesSeen = new Set<AstNode>();
        let current: typeof narrowed | undefined = narrowed;
        while (current && !typesSeen.has(current)) {
            typesSeen.add(current);
            current = current.superType?.ref;
            if (current === original) return;
        }
        accept('error', 'Subset datatype must be a subtype of the inherited role datatype', { node: subset, property: 'type' });
    }

    checkProperty(property: Property, accept: ValidationAcceptor): void {
        const target = property.type?.ref;
        if (target) {
            if (property.composition && (!isComplexType(target) || target.kind !== 'otype')) {
                accept('error', 'A composition must have an object type', { node: property, property: 'type' });
            } else if (!property.composition && isComplexType(target) && target.kind === 'otype') {
                accept('error', `Attribute '${property.name}' should be a value type`, { node: property, property: 'type' });
            }
        }
        if (property.composition && property.$container.kind !== 'otype') {
            accept('error', 'A composition must belong to an object type', { node: property, property: 'composition' });
        }
        if (property.composition && property.pis.length) {
            accept('error', 'Processing instructions are not allowed on compositions', { node: property, property: 'pis' });
        }
        if (property.composition && (property.semanticConcept || property.constraints.length)) {
            accept('error', 'VO-DML does not support semantic concepts or constraints on compositions', { node: property, property: 'name' });
        }
        if (!property.composition && property.constraints.length + Number(!!property.key) > 1) {
            accept('error', 'VO-DML permits at most one constraint on an attribute', { node: property, property: 'name' });
        }
        const multiplicity = property.multiplicity;
        if (!multiplicity) return;
        if (!property.composition && (multiplicity.spec === '*' || multiplicity.spec === '+')) {
            accept('error', `Multiplicity '${multiplicity.spec}' is strongly discouraged for an attribute`, { node: multiplicity, property: 'spec' });
        }
        if (multiplicity.minOccurs !== undefined && multiplicity.maxOccurs !== undefined) {
            const min = multiplicity.minOccurs;
            const max = multiplicity.maxOccurs;
            if (max < -1 || (max !== -1 && max < min)) {
                accept('error', 'Maximum multiplicity is less than minimum', { node: multiplicity, property: 'maxOccurs' });
            } else if (!property.composition && max !== min) {
                accept('error', 'Attribute multiplicity should specify an array size with min=max', { node: multiplicity, property: 'maxOccurs' });
            }
        }
    }

    checkReference(reference: Reference, accept: ValidationAcceptor): void {
        if (reference.type?.ref && reference.type.ref.kind !== 'otype') {
            accept('error', 'A reference must have an object type', { node: reference, property: 'type' });
        }
        const multiplicity = reference.multiplicity;
        if (multiplicity?.spec === '*') {
            accept('error', "Multiplicity '*' is not advised for a reference", { node: multiplicity, property: 'spec' });
        } else if (multiplicity?.spec === '+') {
            accept('warning', "Multiplicity '+' is not advised for a reference unless it is pure aggregation", { node: multiplicity, property: 'spec' });
        } else if (multiplicity?.minOccurs !== undefined) {
            const max = multiplicity.maxOccurs ?? multiplicity.minOccurs;
            if (max < -1 || (max !== -1 && max < multiplicity.minOccurs)) {
                accept('error', 'Maximum multiplicity is less than minimum', { node: multiplicity, property: 'maxOccurs' });
            } else if (max !== 1 || multiplicity.minOccurs !== 1) {
                accept('warning', 'Reference multiplicity other than 1 is not advised', { node: multiplicity, property: 'maxOccurs' });
            }
        }
    }
}
