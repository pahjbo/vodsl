A DSL for VODML
===============


This directory contains a proposal (still a work in progress) for a domain specific language serialization 
for the [VODML](http://www.ivoa.net/documents/VODML) called VODSL. 
The aims of the serialization are

 - have something easier than XML to edit
 - more constrained and specific than UML
 - focused editors via eclipse [Xtext](https://eclipse.org/Xtext) with simultaneous graphical visualization via [FXDiagram](http://jankoehnlein.github.io/FXDiagram/) 
 
 ![VODSL eclipse desktop](vodsl-eclipse.png)
 
 Some background information and demonstration of how to use the editor can be found in [this presentation](VODSL_VODML_PAH.pdf).  
 and there is a [screencast](https://youtu.be/xzSk413raLY) showing installation and simple use of the editor.
 
In addition to be able to use some of the features of the graphical visualization via [FXDiagram](http://jankoehnlein.github.io/FXDiagram/) it is worth looking at the introductory video on that site.

Pre-built Plugins
-----------------

The VODSL editor feature is available pre-built in an update site at http://astrogrid.jb.man.ac.uk/eclipse/vodsl/ if all you want to do is use the editor rather than develop it. 

In this case there is also a [git submodule](./models) which contains some example models expressed in VODSL.
 

Building the plug-in from the command-line
------------------------------------------

All of the projects have now been converted to use [maven](http://maven.apache.org) [tycho](https://www.eclipse.org/tycho/)  so that  the 
editors can be built outside eclipse by running the following in the top level directory. 

    mvn install
    
which will produce an installable feature update site in `eclipse.repository/target/repository`.

The plug-in can then be installed in the usual fashion for eclipse by adding the above directory as a "local repository"

   
Using the stand-alone parser
-------------------------------

It is possible to use the parser machinery in a stand-alone fashion (i.e. without 
having to work in eclipse) by using the jar file that is produced in the `vodsl.standalone`
sub-directory.

The stand-alone parser is built using [maven](http://maven.apache.org). All that is necessary 
(after building the editor plugins in the top level directory as described in the previous section)
is to run 

    mvn install
    
in the `vodsl.standalone/` directory and a jar file will be produced in `target/` which can then
be run with

    java -jar vodslparser-0.4.0-SNAPSHOT.jar model.vodsl

which will produce a file `model.vo-dml.xml` of the equivalent VO-DML.

This jar (only) is also published to maven central if you do not want to have to build it.

[![Maven Central](https://img.shields.io/maven-central/v/org.javastro.vodsl/vodslparser.svg?label=Maven%20Central)](https://search.maven.org/search?q=g:%22org.javastro.vodsl%22%20AND%20a:%22vodslparser%22)

 
Developing VODSL 
----------------

[![Build Status](https://travis-ci.org/pahjbo/vodsl.svg?branch=master)](https://travis-ci.org/pahjbo/vodsl)

There are tutorials and reference documents to guide development on the 
[Xtext site](https://eclipse.org/Xtext/documentation/102_domainmodelwalkthrough.html)

The content of the various subdirectories is as follows;

 1. net.ivoa.vodsl - an eclipse project for the XText grammar for the DSL
 2. net.ivoa.vodsl.sdk - eclipse feature definition the VODSL editor
 3. net.ivoa.vodsl.tests - tests for the VODSL
 4. net.ivoa.vodsl.ui - eclipse custom editor for the VODSL
 5. vodsl.standalone - a stand-alone validating parser that will convert VODSL files to VO-DML
 6. eclipse.target - a directory that defines the target eclipse installation
 7. eclipse.repository - the installable VODSL editor feature update site will be created in this directory.
 

The essential steps to modifying this code and creating a plugin build

  1. edit the [grammar](./net.ivoa.vodsl/src/net/ivoa/vodml/Vodsl.xtext) to add new features if desired
  2. [generate Xtext artifacts](https://eclipse.org/Xtext/documentation/102_domainmodelwalkthrough.html#generate-language-artifacts)
     by right clicking on the grammar and selecting "generate Xtext Artifacts" from the "Run As" menu.
  3. changing other behaviour of the plug-in in either the [grammar](./net.ivoa.vodsl)
     or [editor ui](./net.ivoa.vodsl.ui) sub-projects.


## new release

### updating the version

see https://stackoverflow.com/questions/27857153/how-do-i-create-an-eclipse-plugin-release-using-maven-and-tycho

    mvn org.eclipse.tycho:tycho-versions-plugin:set-version -DnewVersion="0.4.0"
    mvn org.eclipse.tycho:tycho-versions-plugin:update-eclipse-metadata

### Hints

 - It is best to use the pre-configured "Eclipse modelling bundle" (or DSL tools) as your eclipse installation.
 - to [test in place](https://eclipse.org/Xtext/documentation/102_domainmodelwalkthrough.html#run-generated-plugin)
   with the minimally configured eclipse platform it is necessary to add
   "Eclipse UI IDE Application" to the list of automatically added plugin dependencies.
   and "Views Log"

#£ fxdiagram EOL

fxdiagram is not being developed any more, and along with the death of bintray, and java 9+ modularisation there are several consequences;

* will only run/build on jdk 1.8 max -> eclipse 2020-06 is also the last platform that will work.
* need local build of fxdiagram to create a local p2 repository
* need https://github.com/itemis/xtext-reference-projects/pull/186
   
 
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
* the FXDiagram implementation has some quirks that sometimes require shutting down the view and reopening to stop the strange behaviour.


    
