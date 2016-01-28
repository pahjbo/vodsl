A DSL for VODML
===============

This directory contains a proposal (still a work in progress) for a domain specific language serialization 
for the [VODML](http://www.ivoa.net/documents/VODML) called VODSL. 
The aims of the serialization are

 - have something easier than XML to edit
 - more constrained and specific than UML
 - focused editors via eclipse [Xtext](https://eclipse.org/Xtext).
 
The 
 
Subdirectories
--------------

 0. models - the models defined in VODSL - these have been derived using
    [this XSLT](models/vo-dml2dsl.xsl) from the VODML that can be found in 
    https://volute.g-vo.org/viewvc/volute/trunk/projects/dm/
 1. net.ivoa.vodml - an eclipse project for the XText grammar for the DSL
 2. net.ivoa.vodml.sdk - eclipse package for distributing the VODSL editor
 3. net.ivoa.vodml.tests - tests for the VODSL
 4. net.ivoa.vodml.ui - eclipse custom editor for the VODSL
 
Development Hints
-----------------

 - it seems that in more recent versions of XText that there is unwelcome dependence
   on org.eclipse.equinox.common when running mwe for grammar compilation
   that is not picked up in the DSL plugin config -
   a workaround is to add the dependence in the "automated management of dependencies"
   section (so that it does not actually get written into the manifiest) 
   of the manifest editor
   
Language Issues
---------------

 - package name scoping.
    - should all files have an enclosing package?
    - if not are the top level ones in the "global" scope
    - or do we try to have a scope that is part of the name of the model
    