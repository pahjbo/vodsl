"""Shared pytest fixtures – VODSL example models from BaseTest.xtend."""
from __future__ import annotations

import pytest

# ---------------------------------------------------------------------------
# Inline fixtures (from BaseTest.xtend and VodslGenerationTest.xtend)
# ---------------------------------------------------------------------------

EXAMPLE1 = (
    'model example (0.1) "an example model" author "Paul Harrison"'
    ' author "another" include "IVOA.vodsl" include "silly"'
    ' primitive float "a new primitive"'
    ' package apackage "example package"\t{\n'
    '\tdtype fq -> ivoa.quantity.AtomicValue {value : float "a new float";}\n'
    '\tabstract otype base { bv : ivoa.boolean  "Description";\n'
    '\t\t    ^author: ivoa.string "author";\n'
    '\t\t    }'
    'otype derived -> apackage.base {sv : ivoa.quantity.RealQuantity ""; }\n'
    '\totype another {\n'
    '\t\t\tf1 : apackage.fq @[6] "an array";\t\t\t'
    'f2 : apackage.derived as composition "";\n'
    ' //f2 as an otype\n'
    '\t\t}package nestedpackage{\n'
    '\t\totype another "different package"'
    '{cc : apackage.another as composition "" ;'
    'rf references apackage.derived "a reference";}\n'
    '\t}\n'
    '}\t\t\t\n'
)

IVOA = '''\
model ivoa ( 1.0 ) "This is the main reference data model containing primitive types used in other data models."
author "Gerard Lemson"

dtype Identity
\t"This datatype represents an identifier for an object in the data model. It consists of 3 attributes that each are assumed to work in a particular context or representation of a data model instance." {
\tid : integer  @?
\t\t"The id attribute is assumed to represent an object in a database storing instances of the data model. " ;
\txmlId : string  @?
\t\t"This attribute is used to support identifing of and referring to an object in an XML document using the ID/IDREF mechanism."
\t\t;
\tivoId : anyURI  @? "The ivoId attribute is assumed to represent an object in a database following the design of the data model and accessible through a standardised registration and discovery protocols."
\t\t;
\tpublisherDID : anyURI  @? "This attribute identifies an element in the context of the publisher." ;
}

\tprimitive anyURI "Represents a URI in the same way as the datatype of the same nam in XML Schema is used."
\tprimitive duration
\t"Represents an interval of time from beginning to end."
\tprimitive decimal "Represents a decimal number with exact significance such as used to denote monetary values."
\tprimitive boolean "The standard boolean, having values true or false."
\tprimitive real "A real number (from R)."
\tprimitive nonnegativeInteger "An integer number from N, therefore greater than or equal to 0."
\t primitive rational
\t"A rational number from Q."
\tprimitive datetime
\t"Represents a moment in time using a date+timestamp."
\tprimitive integer "An integer number (from Z)."
\tprimitive complex
\t"Represents a complex number."
\tprimitive string "A string."

package quantity ""
{
\t\tabstract dtype AtomicValue "" {
\t\t\tucd : string  @? "UCD." semantic
\t\t\t"" in "http://www.net/rdf/Vocabularies/vocabularies-20091007/UCD/UCD.rdf" ;
\t\t}

\t\tdtype BooleanValue -> AtomicValue  "" {
\t\t\tvalue : boolean  "" ;
\t\t}

\t\tdtype IntegerQuantity -> Quantity  "" {
\t\t\tvalue : integer  "" ;
\t\t}

\t\tabstract dtype Quantity -> AtomicValue
\t\t"Meant to represent the value of a numerical physical quantity." {
\t\t\tunit : quantity.Unit @? "" ;
\t\t}

\t\tdtype RealQuantity -> Quantity  "A real quantity" {
\t\t\tvalue : real "" ;
\t\t}

\t\tdtype StringValue -> AtomicValue  "" {
\t\t\tvalue : string  "" ;
\t\t}

\t\tprimitive Unit "Must conform to definition of unit in VOUnit spec."
}
'''

EXAMPLE2 = '''\
model example (0.1) "an example model"
author "Paul Harrison" author "another"

\tprimitive real ""
\tprimitive boolean ""
\tprimitive string ""

\tabstract dtype AtomicValue {}

\tpackage apackage "example package"
\t{
\t  dtype fq -> AtomicValue {
\t\tvalue : real "a new float";
\t\t}

\tabstract otype base
\t\t{
\t\t    bv : boolean  "Description";
\t\t    ^author: string "author";

\t\t}
\totype derived -> apackage.base
\t\t{
\t\t\tsv : fq "";
\t\t}
\totype another {
\t\t\tf1 : apackage.fq @[6] "an array";
\t\t\tf2 : apackage.derived as composition "";
 //f2 as an otype
\t\t}

\tpackage nestedpackage
\t\t{
\t\totype another "different package"
\t\t\t{
\t\t\t\tcc : apackage.another as composition "" ;
\t\t\t\trf references apackage.derived "a reference";
\t\t\t}
\t}
}
'''

EXAMPLE_WITH_PI = '''\
model example (0.1) "an example model with processing instructions"
author "Paul Harrison"

\tprimitive real ""
\tprimitive boolean ""
\tprimitive string ""

\t!meta ucd="phys.background"!
\tdtype Flux "a flux data type" {
\t\t!meta ucd="instr.background"!
\t\tvalue : real "the flux value" ;
\t}

\t!meta ucd="src.class"!
\totype Source "a source object type" {
\t\t!meta ucd="meta.id"!
\t\tname : string "source name" ;
\t}
'''

MULTIPLICITY_MODEL = '''\
model multest (0.1) "a multiplicity test"
    primitive integer ""
    otype Container {
        items : Container @[3,-1] as composition "at least 3 items, unbounded";
    }
'''

NATURAL_KEY_MODEL = '''\
model keytest (0.1) "a key ordering test"
    primitive string ""
    primitive integer ""
    otype KeyedType {
        first : string iskey "first key";
        second : integer iskey "second key";
        third : string iskey "third key";
    }
    otype RankedType {
        a : string iskey ofRank 3 "explicit rank 3";
        b : integer iskey ofRank 1 "explicit rank 1";
    }
'''


@pytest.fixture
def example2_model():
    from vodsl.parser import parse_string
    return parse_string(EXAMPLE2)


@pytest.fixture
def example_with_pi_model():
    from vodsl.parser import parse_string
    return parse_string(EXAMPLE_WITH_PI)


@pytest.fixture
def multiplicity_model():
    from vodsl.parser import parse_string
    return parse_string(MULTIPLICITY_MODEL)


@pytest.fixture
def natural_key_model():
    from vodsl.parser import parse_string
    return parse_string(NATURAL_KEY_MODEL)
