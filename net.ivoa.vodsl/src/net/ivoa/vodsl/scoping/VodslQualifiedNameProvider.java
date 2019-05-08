/*
 * $Id$
 * 
 * Created on 8 Feb 2016 by Paul Harrison (paul.harrison@manchester.ac.uk)
 * Copyright 2016 Manchester University. All rights reserved.
 *
 * This software is published under the terms of the Academic 
 * Free License, a copy of which has been included 
 * with this distribution in the LICENSE.txt file.  
 *
 */ 

package net.ivoa.vodsl.scoping;

import org.eclipse.xtext.naming.DefaultDeclarativeQualifiedNameProvider;
import org.eclipse.xtext.naming.IQualifiedNameProvider;
import org.eclipse.xtext.naming.QualifiedName;

import net.ivoa.vodsl.vodsl.impl.VoDataModelImpl;

/**
 * A Qualified name provider that picks up the model name.
 * @author Paul Harrison (paul.harrison@manchester.ac.uk) 8 Feb 2016
 * @version $Revision$ $date$
 */
public class VodslQualifiedNameProvider extends DefaultDeclarativeQualifiedNameProvider implements IQualifiedNameProvider {

    protected QualifiedName qualifiedName(VoDataModelImpl ele){
        return QualifiedName.create(ele.getModel().getName());
    }

    
}


/*
 * $Log$
 */
