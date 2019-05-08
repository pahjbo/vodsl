/**
 * $Id$
 * 
 * Created on 20 May 2014 by Paul Harrison (paul.harrison@manchester.ac.uk)
 * Copyright 2014 Manchester University. All rights reserved.
 * 
 * This software is published under the terms of the Academic
 * Free License, a copy of which has been included
 * with this distribution in the LICENSE.txt file.
 */
package net.ivoa.vodsl;

import java.util.Collections;
import java.util.Map;
import java.util.Set;
import net.ivoa.vodsl.vodsl.ReferableElement;
import org.eclipse.xtext.xbase.lib.CollectionLiterals;

/**
 * .
 * @author Paul Harrison (paul.harrison@manchester.ac.uk) 20 May 2014
 * @version $Revision$ $date$
 */
@SuppressWarnings("all")
public class VodslExtensions {
  /**
   * Returns all (proper) sub entities of the given {@link ReferableElement}, recursively.
   */
  public Set<ReferableElement> allSubElements(final ReferableElement superEntity) {
    Set<ReferableElement> _xblockexpression = null;
    {
      final Map<ReferableElement, Set<ReferableElement>> subEntitiesMap = CollectionLiterals.<ReferableElement, Set<ReferableElement>>newHashMap();
      final Set<ReferableElement> result = subEntitiesMap.get(superEntity);
      _xblockexpression = Collections.<ReferableElement>unmodifiableSet(result);
    }
    return _xblockexpression;
  }
}
