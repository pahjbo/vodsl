/*
 * $Id$
 * 
 * Created on 3 Mar 2017 by Paul Harrison (paul.harrison@manchester.ac.uk)
 * Copyright 2017 Manchester University. All rights reserved.
 *
 * This software is published under the terms of the Academic 
 * Free License, a copy of which has been included 
 * with this distribution in the LICENSE.txt file.  
 *
 */ 

package net.ivoa.vodsl.standalone;

import java.util.List;

import com.google.inject.Injector;

import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.resource.Resource;
import org.eclipse.xtext.generator.GeneratorDelegate;
import org.eclipse.xtext.generator.IFileSystemAccess;
import org.eclipse.xtext.generator.JavaIoFileSystemAccess;
import org.eclipse.xtext.generator.URIBasedFileSystemAccess;
import org.eclipse.xtext.resource.XtextResource;
import org.eclipse.xtext.resource.XtextResourceSet;
import org.eclipse.xtext.util.CancelIndicator;
import org.eclipse.xtext.validation.CheckMode;
import org.eclipse.xtext.validation.IResourceValidator;
import org.eclipse.xtext.validation.Issue;

import net.ivoa.vodsl.VodslStandaloneSetup;

/**
 * A standalone parser for reading VO-DSL files and converting to VO-DML.
 *
 * @author Paul Harrison (paul.harrison@manchester.ac.uk) 3 Mar 2017
 * @version $Revision$ $date$
 */
public class ParserRunner {
private final Injector injector;
private XtextResourceSet resourceSet;

// IMPL inspired by https://typefox.io/how-and-why-use-xtext-without-the-ide
    /**
     * 
     */
    public ParserRunner() {
     injector =  new VodslStandaloneSetup().createInjectorAndDoEMFRegistration();
     resourceSet = injector.getInstance(XtextResourceSet.class);
     

    }
    
    public void parse(String[] files, String outputPath)
    {
        Resource resource = resourceSet.getResource(URI.createFileURI(files[0]), true);
        for (int i = 1; i < files.length; i++) {
            resourceSet.getResource(URI.createFileURI(files[i]), true);
        }
       
        // Validation
        IResourceValidator validator = ((XtextResource)resource).getResourceServiceProvider().getResourceValidator();
        List<Issue> issues = validator.validate(resource, CheckMode.ALL, CancelIndicator.NullImpl);
        for (Issue issue : issues) {
          System.err.println(issue.getMessage());
        }
        
     // Code Generator
        GeneratorDelegate generator = injector.getInstance(GeneratorDelegate.class);        
        JavaIoFileSystemAccess fsa = injector.getInstance(JavaIoFileSystemAccess.class);
       
		fsa.setOutputPath(outputPath);      
        generator.doGenerate(resource, fsa);

    }

    /**
     * @param args
     */
    public static void main(String[] args) {
        ParserRunner pr = new ParserRunner();
        if(args.length > 0)
           pr.parse(args, ".");
        else
            System.err.println("you must supply at least one file to parse.");

    }

}


/*
 * $Log$
 */
