A DSL for VODML
===============

This directory contains a proposal (still a work in progress) for a domain specific language serialization 
for the [VODML](http://www.ivoa.net/documents/VODML) called VODSL. 
The aims of the serialization are

 - have something easier than XML to edit
 - more constrained and specific than UML
 - focused editors via eclipse [Xtext](https://eclipse.org/Xtext).
 
 Some background information and demonstration of how to use the editor can be found in [this presentation](VODSL_VODML_PAH.pdf)
 
It is possible to use the parser machinery in a stand-alone fashion (i.e. without 
having to work in eclipse) by using the jar file that is produced in the `vodsl.standalone`
sub-directory.
  
Subdirectories
--------------

 1. net.ivoa.vodml - an eclipse project for the XText grammar for the DSL
 2. net.ivoa.vodml.sdk - eclipse feature defintion the VODSL editor
 3. net.ivoa.vodml.tests - tests for the VODSL
 4. net.ivoa.vodml.ui - eclipse custom editor for the VODSL
 5. vodsl.standalone - a stand-alone validating parser that will convert VODSL files to VO-DML
 6. eclipse.target - a directory that defines the target eclipse installation
 7. eclipse.repository - the installable VODSL editor feature update site will be created in this directory.
 
 there is also a [git submodule](./models) which contains some example models expressed
 in VODSL.
 
Using the stand-alone parser
-------------------------------

The stand-alone parser is built using [maven](http://maven.apache.org). All that is necessary 
after installing maven is to run (after building the editor plugin in the top level directory)

    mvn install
    
in the `vodsl.standalone/` directory and a jar file will be produced in `target/` which can then
be run with

    java -jar vodslparser-0.4.0-SNAPSHOT.jar model.vodsl

which will produce a file `model.vo-dml.xml` of the equivalent VO-DML.
 
Developing VODSL 
----------------

There are tutorials and reference documents to guide development on the 
[Xtext site](https://eclipse.org/Xtext/documentation/102_domainmodelwalkthrough.html)

The essential steps to modifying this code and creating a plugin build

  1. edit the [grammar](./net.ivoa.vodml/src/net/ivoa/vodml/Vodsl.xtext) to add new features if desired
  2. [generate Xtext artifacts](https://eclipse.org/Xtext/documentation/102_domainmodelwalkthrough.html#generate-language-artifacts)
     by right clicking on the grammar and selecting "generate Xtext Artifacts" from the "Run As" menu.
  3. changing other behaviour of the plug-in in either the [grammar](./net.ivoa.vodml)
     or [editor ui](./net.ivoa.vodml.ui) sub-projects.
  
All of the projects have now been converted to use maven tycho and so that all of the 
editors can be build by running the following in the top level directory. 

    mvn install
    
which will produce an installable feature update site in `eclipse.repository/target/repository`

### Hints

 - It is best to use the pre-configured "Eclipse modelling bundle" as your eclipse installation.
 - to [test in place](https://eclipse.org/Xtext/documentation/102_domainmodelwalkthrough.html#run-generated-plugin)
   with the minimally configured eclipse platform it is necessary to add
   "Eclipse UI IDE Application" to the list of automatically added plugin dependencies.
   and "Views Log"
   
Prebuilt Plugins
-----------------

The VODSL editor feature is available pre-built in an update site at http://astrogrid.jb.man.ac.uk/eclipse/vodsl/ if all you want to do is use the editor rather than develop it.

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
   

    