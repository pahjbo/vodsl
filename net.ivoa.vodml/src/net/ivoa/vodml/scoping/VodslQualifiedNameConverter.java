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

package net.ivoa.vodml.scoping;

import java.util.List;

import com.google.inject.Singleton;

import org.eclipse.xtext.naming.IQualifiedNameConverter;
import org.eclipse.xtext.naming.QualifiedName;
import org.eclipse.xtext.util.Strings;

/**
 * A Qualified name converter that has a : after the first part of qualified name .
 * NB the generator does not use this implicitly.
 * FIXME - really need to test that the top level element is the same as the model....
 * @author Paul Harrison (paul.harrison@manchester.ac.uk) 8 Feb 2016
 * @version $Revision$ $date$
 */
@Singleton
public class VodslQualifiedNameConverter implements IQualifiedNameConverter {

    /**
     * {@inheritDoc}
     * overrides @see org.eclipse.xtext.naming.IQualifiedNameConverter#toString(org.eclipse.xtext.naming.QualifiedName)
     */
    @Override
    public String toString(QualifiedName qualifiedName) {
        if (qualifiedName == null)
            throw new IllegalArgumentException("Qualified name cannot be null");
        char delimiter = ':';
        int segmentCount = qualifiedName.getSegmentCount();
        switch (segmentCount) {
            case 0: return "";
            case 1: return qualifiedName.getFirstSegment();
            default:
                StringBuilder builder = new StringBuilder();
                builder.append(qualifiedName.getFirstSegment());
                for (int i = 1; i < segmentCount; i++) {
                    builder.append(delimiter);
                    builder.append(qualifiedName.getSegment(i));
                    delimiter = '.';
                }
                return builder.toString();
        }

    }

    /**
     * {@inheritDoc}
     * overrides @see org.eclipse.xtext.naming.IQualifiedNameConverter#toQualifiedName(java.lang.String)
     */
    @Override
    public QualifiedName toQualifiedName(String qualifiedNameAsString) {
        if (qualifiedNameAsString == null)
            throw new IllegalArgumentException("Qualified name cannot be null");
        if (qualifiedNameAsString.equals(""))
            throw new IllegalArgumentException("Qualified name cannot be empty");
        //IMPL default Xtext implemenation worries about the inefficiency of this RE match and use org.eclipse.xtext.util.Strings
        String[] segs = qualifiedNameAsString.split(":|\\.");
        return QualifiedName.create(segs);

    }

}


/*
 * $Log$
 */
