/*
 * $Id$
 * 
 * Created on 8 May 2014 by Paul Harrison (paul.harrison@manchester.ac.uk)
 * Copyright 2014 Manchester University. All rights reserved.
 *
 * This software is published under the terms of the Academic 
 * Free License, a copy of which has been included 
 * with this distribution in the LICENSE.txt file.  
 *
 */ 

package net.ivoa.vodml.ui;

import org.eclipse.emf.ecore.EObject;
import org.eclipse.xtext.documentation.IEObjectDocumentationProvider;

/**
 * Help text provider for VODSL .
 * @author Paul Harrison (paul.harrison@manchester.ac.uk) 8 May 2014
 * @version $Revision$ $date$
 */
public class VodslEobjectDocumentationProvider implements
        IEObjectDocumentationProvider {

   /**
     * {@inheritDoc}
     * overrides @see org.eclipse.xtext.documentation.IEObjectDocumentationProvider#getDocumentation(org.eclipse.emf.ecore.EObject)
     */
    @Override
    public String getDocumentation(EObject o) {
        Object des = o.eGet(o.eClass().getEStructuralFeature("description"));
        if(des != null)
        {
           if (des instanceof String) {
            return (String) des;
           }
            
        }
        return ""; // return empty string if not found/recognised
    }

}


/*
 * $Log$
 */
