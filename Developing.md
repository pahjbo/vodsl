
Developing VODSL 
================

Building the plug-in from the command-line
------------------------------------------

All of the projects have now been converted to use [maven](http://maven.apache.org) [tycho](https://www.eclipse.org/tycho/)  so that  the 
editors can be built outside eclipse by running the following in the top level directory. 

    mvn install
    
which will produce an installable feature update site in `eclipse.repository/target/repository`.

The plug-in can then be installed in the usual fashion for eclipse by adding the above directory as a "local repository"



[![Build Status](https://travis-ci.org/pahjbo/vodsl.svg?branch=master)](https://travis-ci.org/pahjbo/vodsl)


Deploying stand alone parser to maven central
---------------------------------------------

after the maven build in the top level, then in the `vodsl.standalone` directory

    mvn deploy -P release


if this is successful then


    mvn nexus-staging:release -P release



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

### fxdiagram EOL

fxdiagram is not being developed any more, and along with the death of bintray, and java 9+ modularisation there are several consequences, which make building difficult;

* to install javafx need to follow https://tomsondev.bestsolution.at/2020/01/28/setting-up-efxclipse-rcp-development-for-java11-and-pde/
  - note that it is now quite hard to get hold of javafx 11 sdk (the closest to when fxdiagram finished development)
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

Graphical Visualization
-----------------------

https://www.eclipse.org/elk/
https://www.slideshare.net/schwurbel/diagrams-xtext-and-ux
https://github.com/JanKoehnlein/FXDiagram


need -Dorg.osgi.framework.bundle.parent=ext -Dosgi.framework.extensions=org.eclipse.fx.osgi	 as VM argument to get javafx to load in debugger

Update
------


* build to create the update site does not seem to be completely working. need to do a build in eclipse and then upload

* note that the build product oomph https://gitlab.cs.man.ac.uk/emerlin/eclipse-setups

* https://wiki.eclipse.org/Equinox_p2_Repository_Mirroring - to get all of the Kieler stuff.

 ~/eclipse/DSL-2020-06/Eclipse.app/Contents/MacOS/eclipse -nosplash -verbose -application org.eclipse.equinox.p2.artifact.repository.mirrorApplication -source http://rtsys.informatik.uni-kiel.de/~kieler/updatesite/release_pragmatics_2015-02 -destination file:`pwd`/kielermirror/
  
 
 * transfer to metis:/data/vo/eclipse/vodsleditor/ - for site http://vo.jb.man.ac.uk/eclipse/vodsleditor/
 
 JDK 11
 
* https://git.fortiss.org/af3/org.fortiss.openjfx.git 
* https://github.com/reficio/p2-maven-plugin used this...
