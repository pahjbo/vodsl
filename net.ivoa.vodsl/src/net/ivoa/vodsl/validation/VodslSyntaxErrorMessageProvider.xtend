/*
 * $Id$
 * 
 * Created on 20 Apr 2017 by Paul Harrison (paul.harrison@manchester.ac.uk)
 * Copyright 2017 Manchester University. All rights reserved.
 *
 * This software is published under the terms of the Academic 
 * Free License, a copy of which has been included 
 * with this distribution in the LICENSE.txt file.  
 *
 */ 

package net.ivoa.vodsl.validation

import org.eclipse.xtext.parser.antlr.SyntaxErrorMessageProvider
import javax.inject.Inject
import org.eclipse.xtext.IGrammarAccess
import org.eclipse.xtext.GrammarUtil
import org.eclipse.xtext.nodemodel.SyntaxErrorMessage

/**
 *  .
 * @author Paul Harrison (paul.harrison@manchester.ac.uk) 20 Apr 2017
 * @version $Revision$ $date$
 * see https://tomkutz.wordpress.com/2013/06/13/xtext-customizing-error-messages-unordered-group/
 * see https://www.eclipse.org/forums/index.php/t/452636/
 * @todo - need to improve this message provider...
 */
class VodslSyntaxErrorMessageProvider extends SyntaxErrorMessageProvider {

	public static final String USED_RESERVED_KEYWORD = "USED_RESERVED_KEYWORD";

@Inject
IGrammarAccess grammarAccess;
		
	  override getSyntaxErrorMessage(IParserErrorContext context) {
		if (context.getRecognitionException() !== null
				&& context.getRecognitionException().token !== null) {
		   var token = context.getRecognitionException().token;
			var unexpectedText = token
					.getText();
					
         if (GrammarUtil.getAllKeywords(grammarAccess.getGrammar())
					.contains(unexpectedText)) {
				return new SyntaxErrorMessage(
						unexpectedText
								+ "  is a reserved keyword which is not allowed as Identifier",
						USED_RESERVED_KEYWORD);
			}
		
			
		}
		return super.getSyntaxErrorMessage(context);
  }
  
  
	
//	 def dispatch handleException(IParserErrorContext context) {
//    // fall back behavior => call super class
//    super.getSyntaxErrorMessage(context)
//  }
 
}

/*
 * $Log$
 */
