/*
 * $Id$
 * 
 * Created on 29 Feb 2016 by Paul Harrison (paul.harrison@manchester.ac.uk)
 * Copyright 2016 Manchester University. All rights reserved.
 *
 * This software is published under the terms of the Academic 
 * Free License, a copy of which has been included 
 * with this distribution in the LICENSE.txt file.  
 *
 */ 

package net.ivoa.vodsl.tests

import org.junit.runner.RunWith
import org.eclipse.xtext.testing.InjectWith
import org.eclipse.xtext.testing.XtextRunner
import com.google.inject.Inject
import org.eclipse.xtext.testing.formatter.FormatterTestHelper
import org.junit.Test

/**
 *  .
 * @author Paul Harrison (paul.harrison@manchester.ac.uk) 29 Feb 2016
 * @version $Revision$ $date$
 */
@RunWith(XtextRunner)
@InjectWith(VodslInjectorProvider)
class FormattingTest extends BaseTest {
	
@Inject extension FormatterTestHelper
	
@Test	def formexample1()
	{
		assertFormatted [
			toBeFormatted = example1
			
			expectation = '''
			'''
		]
	}
	
}

/*
 * $Log$
 */
