grammar Vodsl

entry VoDataModel:
    model=ModelDeclaration includes+=IncludeDeclaration* elements+=Element+;

ModelDeclaration:
    'model' name=ID '(' version=Version ')' description=STRING
    ('author' authors+=STRING)* ('title' titular=STRING)?;

Version returns string: INT ('.' INT)?;
IncludeDeclaration: 'include' importURI=STRING;
QualifiedName returns string: ID (':' ID)? ('.' ID)*;

Element: PackageDeclaration | DefinitionType;
DefinitionType: ComplexType | PrimitiveType | Enumeration;
type Role = Property | Reference;

PackageDeclaration:
    'package' name=ID description=STRING? '{' elements+=Element+ '}';

PrimitiveType:
    abstract?='abstract'? 'primitive' name=ID
    ('->' superType=[PrimitiveType:QualifiedName])?
    description=STRING constraints+=Constraint*;

ComplexType:
    pis+=ProcessingInstruction* abstract?='abstract'? kind=('dtype' | 'otype') name=ID
    ('->' superType=[ComplexType:QualifiedName])? description=STRING?
    constraints+=Constraint* '{' subsets+=SubSet* content+=(Property | Reference)* '}';

Enumeration:
    abstract?='abstract'? 'enum' name=ID
    ('->' superType=[Enumeration:QualifiedName])? description=STRING?
    constraints+=Constraint* '{' literals+=EnumLiteral (',' literals+=EnumLiteral)* '}';

EnumLiteral: name=ID description=STRING?;
Property:
    pis+=ProcessingInstruction* name=ID ':' type=[DefinitionType:QualifiedName]
    multiplicity=Multiplicity? ('as' ordered?='ordered'? composition?='composition' | key=NaturalKey)? description=STRING
    (semanticConcept=SemanticConcept constraints+=Constraint* |
        constraints+=Constraint+ semanticConcept=SemanticConcept? constraints+=Constraint*)? ';';
Reference:
    name=ID multiplicity=Multiplicity? 'references' type=[ComplexType:QualifiedName] description=STRING ';';
Multiplicity:
    '@' ('[' minOccurs=INT (',' maxOccurs=SignedInt)? ']' | spec=('*' | '?' | '+' | 'ONE'));
SignedInt returns number: '-'? INT;
NaturalKey: 'iskey' ('ofRank' position=INT)?;
Constraint: '<' expr=STRING ('as' language=('Natural' | 'Regex' | 'OCL'))? '>';
SemanticConcept: 'semantic' broadestConcept=STRING? 'in' vocabularyURI=STRING;
SubSet: 'subset' ref=[Role:QualifiedName] 'as' type=[DefinitionType:QualifiedName] ';';
ProcessingInstruction: pitext=PI_TEXT;

hidden terminal WS: /\s+/;
hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;
terminal PI_TEXT: /![^!]*!/;
terminal ID: /\^?[a-zA-Z_][a-zA-Z_0-9]*/;
terminal INT returns number: /[0-9]+/;
terminal STRING: /"(\\(?:[btnfr"'\\]|u[0-9a-fA-F]{4})|[^"\\])*"|'(\\(?:[btnfr"'\\]|u[0-9a-fA-F]{4})|[^'\\])*'/;
