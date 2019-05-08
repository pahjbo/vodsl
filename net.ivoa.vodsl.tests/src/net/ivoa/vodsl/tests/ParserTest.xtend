/*
 * $Id$
 * 
 * Created on 1 May 2014 by Paul Harrison (paul.harrison@manchester.ac.uk)
 * Copyright 2014 Manchester University. All rights reserved.
 *
 * This software is published under the terms of the Academic 
 * Free License, a copy of which has been included 
 * with this distribution in the LICENSE.txt file.  
 *
 */ 

package net.ivoa.vodsl.tests

import org.eclipse.xtext.testing.util.ParseHelper
import static org.junit.Assert.*
import org.eclipse.xtext.testing.XtextRunner
import org.junit.runner.RunWith
import org.eclipse.xtext.testing.InjectWith
import com.google.inject.Inject
import org.junit.Test
import net.ivoa.vodsl.vodsl.VoDataModel
import net.ivoa.vodsl.vodsl.ModelDeclaration

@RunWith(XtextRunner)
@InjectWith(VodslInjectorProvider)
/**
 *  .
 * @author Paul Harrison (paul.harrison@manchester.ac.uk) 1 May 2014
 * @version $Revision$ $date$
 */
class ParserTest {
		
@Inject
ParseHelper<VoDataModel> parser
 
@Test 
def void parseVodmlmodel() {
  val model = parser.parse(
    "model test (1.x) 'this is a test'")
  val moddecl = model.model as ModelDeclaration
  assertNotNull(moddecl)
}
	
}

/*
 * $Log$
 */
