package net.ivoa.vodml.ui.fxdiagram

import de.fxdiagram.eclipse.xtext.mapping.AbstractXtextDiagramConfig
import de.fxdiagram.mapping.MappingAcceptor
import de.fxdiagram.mapping.DiagramMapping
import net.ivoa.vodml.vodsl.ModelDeclaration
import net.ivoa.vodml.vodsl.PackageDeclaration
import de.fxdiagram.mapping.NodeMapping
import de.fxdiagram.mapping.NodeHeadingMapping
import de.fxdiagram.mapping.shapes.BaseDiagramNode
import de.fxdiagram.mapping.IMappedElementDescriptor
import de.fxdiagram.mapping.shapes.BaseContainerNode
import net.ivoa.vodml.vodsl.ObjectType
import de.fxdiagram.mapping.shapes.BaseClassNode

class VodslDiagramConfig extends AbstractXtextDiagramConfig {


   val vodslDiagram = new DiagramMapping<ModelDeclaration> (this, 'vodslDiagram', 'VODSL model') {
   	
   }
   
   val packageNode = new NodeMapping<PackageDeclaration>(this, 'packageNode', 'Package')
   {
   	     override createNode(IMappedElementDescriptor<PackageDeclaration> descriptor) {
			new BaseContainerNode(descriptor)
		}
   	  
   }
   
   val packageNodeName = new NodeHeadingMapping<PackageDeclaration>(this, BaseContainerNode.NODE_HEADING) {
   	   override getText(PackageDeclaration element) {
   	   	  element.name; // might want to manipulate slightly
   	   }
   }
   
   val objectNode = new NodeMapping<ObjectType>(this, 'objectNode', 'Object Type') {
   	   	     override createNode(IMappedElementDescriptor<ObjectType> descriptor) {
   	   	     	new BaseClassNode(descriptor)
   	}
   }
   
   val objectNodeName = new NodeHeadingMapping<ObjectType>(this, BaseClassNode.CLASS_NAME) {
   	    override getText(ObjectType element) {
   	    	element.name
   	    }
   }
   	
	override protected <ARG> entryCalls(ARG domainArgument, MappingAcceptor<ARG> acceptor) {
		throw new UnsupportedOperationException("TODO: auto-generated method stub")
	}
	
}