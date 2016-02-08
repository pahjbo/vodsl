A DSL for VODML
===============

This directory contains a proposal (still a work in progress) for a domain specific language serialization 
for the [VODML](http://www.ivoa.net/documents/VODML) called VODSL. 
The aims of the serialization are

 - have something easier than XML to edit
 - more constrained and specific than UML
 - focused editors via eclipse [Xtext](https://eclipse.org/Xtext).
 
 Some background information can be found in [this presentation](VODSL_VODML_PAH.pdf)
  
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
 - It is best to start with the preconfigured "Eclipse modelling bundle" 
 - to test with the minimally configured eclipse platform it is necessary to add
 "Eclipse UI IDE Application" to the list of automatically added plugin dependencies.
 and "Views Log"
   
Prebuilt Plugins
-----------------

The VODSL editor feature is available prebuillt from download site

It is necessary to have  http://download.eclipse.org/modeling/tmf/xtext/updates/composite/releases/
as an additional download site configured to resolve missing dependencies if starting
from a vanilla version of eclipse.
 
Known issues with the Eclipse editor
------------------------------------

* fully qualified names should have the model name followed by ':' and the rest of the packages delimited by '.' -
   This works for a full name, but the scoping sometimes allows a shorter name to be used - sometimes (when an auto-suggested model
   element is inserted) just the first part of the name (even when this is not a model name) is mistakenly delimited by ':'. 
   In fact this does not matter internally as no distinction is made between the 
   parts of the fully qualified name when it is split into its component parts.
   It does however make the VODSL slightly confusing to read in some cases.   
* some of the VO-DML validation rules are not yet implemented  
  - the "unique composition" rule, where an object type cannot be the target of 
      two compositions.
  - the subset rules.
   
The models
----------

The models in the repository are mainly the result of the application of the XSLT
to the VO-DML models from volute with a little hand editing to remove some of the 
gross errors - however, in general there are many errors remaining in these models.


    