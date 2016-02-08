/*
 * $Id$
 * 
 * Created on 1 Mar 2016 by Paul Harrison (paul.harrison@manchester.ac.uk)
 * Copyright 2016 Manchester University. All rights reserved.
 *
 * This software is published under the terms of the Academic 
 * Free License, a copy of which has been included 
 * with this distribution in the LICENSE.txt file.  
 *
 */ 

package net.ivoa.vodml.tests

/**
 * Base Test to contain the examples .
 * @author Paul Harrison (paul.harrison@manchester.ac.uk) 1 Mar 2016
 * @version $Revision$ $date$
 */
class BaseTest {
	protected val example1 = '''
model example (0.1) "an example model" author "Paul Harrison" author "another" include "IVOA.vodsl" include "silly" primitive float "a new primitive" package apackage "example package"	{
	dtype fq -> ivoa.quantity.AtomicValue {value : float "a new float";}
	abstract otype base { bv : ivoa.boolean  "Description";
		    ^author: ivoa.string "author"; // note use of ^ to be able to re-use reserved word. 
		    }otype derived -> apackage.base {sv : ivoa.quantity.RealQuantity ""; }
	otype another {
			f1 : apackage.fq @[6] "an array";			f2 : apackage.derived as composition "";
 //f2 as an otype
		}package nestedpackage{
		otype another "different package"{cc : apackage.another as composition "" ;rf references apackage.derived "a reference";}
	}
}			
'''
//TODO better to read these from files
  protected val ivoa = '''
model ivoa ( 1.0 ) "This is the main reference data model containing primitive types used in other data models."
author "Gerard Lemson"

dtype Identity 
	"This datatype represents an identifier for an object in the data model. It consists of 3 attributes that each are assumed to work in a particular context or representation of a data model instance." {
	id : integer  @?
		"The id attribute is assumed to represent an object in a database storing instances of the data model. " ;
	xmlId : string  @?
		"This attribute is used to support identifing of and referring to an object in an XML document using the ID/IDREF mechanism."
		;
	ivoId : anyURI  @? "The ivoId attribute is assumed to represent an object in a database following the design of the data model and accessible through a standardised registration and discovery protocols.
It is assumed to be unique within the IVOA and its format follows (a generalisation of) the IVO Resource Identifier standard (see http://www.net/Documents/REC/Identifiers/Identifiers-20070302.html).
Since the ivoId is assumed to represent the resource as registered in a standard database for the data model, it is assumed to be allocated by such a database service. This is in contrast to the use of the IVO Identifier in resource registries, where the id is assumed to be allocated by the publisher. We have the publisherDID attribute for that purpose. Also in contrast to that usage is the fact that each object in the model is assigned this identifier, not only the root resources.
We suggest as algorithm for assigning these ivoId to use as root the ivoId of the registered database service, and to append to this a # then the UTYPE of the element and finally its id attribute, separetd from the UTYPE by a forward slash." ;
	publisherDID : anyURI  @? "This attribute identifies an element in the context of the publisher. 
It is supposed to be unique in the IVO context and should likely be constrained to have the publisher's authority IVO id. This may need to be rediscussed when protocols for accessing a database built around a data model are to be designed." ;
}

	primitive anyURI "Represents a URI in the same way as the datatype of the same nam in XML Schema is used."
	primitive duration
	"Represents an interval of time from beginning to end. Is not equivalent to a simple real value indicating the number of seconds (for example). In general a custom mapping to a particular serialisation context must be provided."
	primitive decimal "Represents a decimal number with exact significance such as used to denote monetary values."
	primitive boolean "The standard boolean, having values true or false."
	primitive real "A real number (from R)."
	primitive nonnegativeInteger "An integer number from N, therefore greater than or equal to 0."
	 primitive rational
	"A rational number from Q, represented by two integers, a numerator and a denominator. A native mapping to a serialisation context does in general not exists."
	primitive datetime
	"Represents a moment in time using a date+timestamp. Coordinate reference systems must be defined by the context serialisation."
	primitive integer "An integer number (from Z)."
	primitive complex
	"Represents a complex number, consisting of a real and imaginary component, both of which are reals. Note that in many contexts there is no native mapping for this type and it must be treated with a custom mapping."
	primitive string "A string, represented as an array of characters treated as a single, primitive value. Ala Java, a string can not be updated, that is any update leads to a different string. However in contrast to Java we assume that two strings that are identical in all their constitutent characters are the same.
I.e. string has value type semantics."

package quantity ""
{
		abstract dtype AtomicValue "" {
			ucd : string  @? "This attribute should hold on to a valid UCD.
For that purpose the attribute isa skosconcept, but a proper SKOS vocabulary for UCDs would be required to formalize this further." semantic
			"" in "http://www.net/rdf/Vocabularies/vocabularies-20091007/UCD/UCD.rdf" ;
		}

		dtype BooleanValue -> AtomicValue  "" {
			value : boolean  "" ;
		}

		dtype IntegerQuantity -> Quantity  "" {
			value : integer  "" ;
		}

		abstract dtype Quantity -> AtomicValue 
		"Meant to represent the value of a numerical physical quantity.  May be integer, what units can apply there?" {
			unit : quantity.Unit @? "" ;
		}

		dtype RealQuantity -> Quantity  "A real quantity" {
			value : real "" ;
		}

		dtype StringValue -> AtomicValue  "" {
			value : string  "" ;
		}

		primitive Unit "Must conform to definition of unit in VOUnit spec."
}  
  '''
  protected val example2 = '''
  model example (0.1) "an example model"
  author "Paul Harrison" author "another"
  
  	primitive real ""
  	primitive boolean ""
  	primitive string ""
  	
  	abstract dtype AtomicValue {}
  	
  	package apackage "example package"
  	{
  	  dtype fq -> AtomicValue {
  		value : real "a new float";
  		}	
  		
  	abstract otype base 
  		{
  		    bv : boolean  "Description";
  		    ^author: string "author"; // note use of ^ to be able to re-use reserved word.
  		    
  		}
  	otype derived -> apackage.base
  		{
  			sv : fq "";
  		}
  	otype another {
  			f1 : apackage.fq @[6] "an array";
  			f2 : apackage.derived as composition "";
   //f2 as an otype
  		}
  
  	package nestedpackage
  		{
  		otype another "different package"
  			{
  				cc : apackage.another as composition "" ;
  				rf references apackage.derived "a reference";
  			}
  	}
  }
  '''
}

/*
 * $Log$
 */
