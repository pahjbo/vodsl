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
import net.ivoa.vodml.vodsl.VoDataModel


import static de.fxdiagram.mapping.shapes.BaseNode.*

import static extension net.ivoa.vodml.ui.fxdiagram.ButtonExtensions.*
import static extension org.eclipse.xtext.EcoreUtil2.*
import net.ivoa.vodml.vodsl.DataType
import de.fxdiagram.mapping.NodeLabelMapping
import net.ivoa.vodml.vodsl.Attribute
import net.ivoa.vodml.vodsl.Multiplicity
import de.fxdiagram.mapping.shapes.BaseNode
import net.ivoa.vodml.vodsl.PrimitiveType
import org.eclipse.xtext.naming.IQualifiedNameConverter
import com.google.inject.Inject
import org.eclipse.xtext.naming.IQualifiedNameProvider
import net.ivoa.vodml.vodsl.ReferableElement
import net.ivoa.vodml.vodsl.Composition
import de.fxdiagram.mapping.ConnectionLabelMapping
import net.ivoa.vodml.vodsl.Reference

/**
 * Configuration for VODSL FX diagram
 * 
 * TODO There is a fair bit of repetition in this for Primitives, DataTypes and ObjectTypes which should be eliminated - not sure how in xtend!
 * This was induced by deliberate design decision in grammar not to have supertype at the ValueType level for instance to make the grammar naturally more validating.
 */
class VodslDiagramConfig extends AbstractXtextDiagramConfig {
	
    @Inject extension IQualifiedNameProvider	
    @Inject IQualifiedNameConverter converter 

	val vodslDiagram = new DiagramMapping<VoDataModel>(this, 'vodslDiagram', 'VODSL model') {
		override calls() {
			// when adding a model diagram
//			packageNode.nodeForEach[elements.filter(PackageDeclaration)]
			primitiveNode.nodeForEach[elements.filter(PrimitiveType)]
			objectNode.nodeForEach[elements.filter(ObjectType)]
			dataNode.nodeForEach[elements.filter(DataType)]
			eagerly(superTypeConnection, dsuperTypeConnection, psuperTypeConnection, compositionConnection, referenceConnection)
		}
	}

	val packageNode = new NodeMapping<PackageDeclaration>(this, 'packageNode', 'Package') {
		override createNode(IMappedElementDescriptor<PackageDeclaration> descriptor) {
			new BaseContainerNode(descriptor)
		}

		override protected calls() {
			packageNodeName.labelFor[it]

		}

	}

	val packageNodeName = new NodeHeadingMapping<PackageDeclaration>(this, BaseContainerNode.NODE_HEADING) {
		override getText(PackageDeclaration it) {
			name; // might want to manipulate slightly
		}
	}

	val objectNode = new NodeMapping<ObjectType>(this, 'objectNode', 'Object Type') {
		override createNode(IMappedElementDescriptor<ObjectType> descriptor) {
			new BaseClassNode(descriptor)
		}
		
		override protected calls() {
			objectNodeName.labelFor[it]
			attribute.labelForEach[content.filter(Attribute)]
			
			superTypeConnection.outConnectionFor[if (superType !== null) new SourceTarget(it, it.superType)
			].asButton[getSupertypeButton("Add supertype")]
	
			compositionConnection.outConnectionForEach[ content.filter(Composition)
			].asButton[getCompositionButton("Add compositions")]

			referenceConnection.outConnectionForEach[ content.filter(Reference)
			].asButton[getReferenceButton("Add references")]
			
		}
		
	}

	val objectNodeName = new NodeHeadingMapping<ObjectType>(this, BaseClassNode.CLASS_NAME) {
		override getText(ObjectType it) {
			name
		}
	}
	
	val dataNode = new NodeMapping<DataType>(this, 'dataNode', 'Data Type') {
		override createNode(IMappedElementDescriptor<DataType> descriptor) {
			new BaseClassNode(descriptor)
		}
		override protected calls() {
			dataNodeName.labelFor[it]
			attribute.labelForEach[content.filter(Attribute)]
			
			dsuperTypeConnection.outConnectionFor[if (superType !== null) new SourceTarget(it, it.superType)
			].asButton[getSupertypeButton('Add supertype')]
			
		}
	}
	
	val dataNodeName = new NodeHeadingMapping<DataType>(this, BaseClassNode.CLASS_NAME) {
		override getText(DataType it) {
			'''<<dataType>>
«name»'''
		}
	}
	
	val primitiveNode = new NodeMapping<PrimitiveType>(this, 'primNode', 'Primitive'){
		
		override protected calls() {
			primitiveNodeName.labelFor[it]
			
			psuperTypeConnection.outConnectionFor[ if (superType !== null) new SourceTarget(it, it.superType)
			].asButton[getSupertypeButton("Add supertype")]
			
		}
		
	}
	
	val primitiveNodeName = new NodeHeadingMapping<PrimitiveType>(this, BaseNode.NODE_HEADING)
	{
		
		override getText(PrimitiveType it) {
			'''<<primitive>>
«name»'''
		}
		
	}
	

   	val attribute = new NodeLabelMapping<Attribute>(this, BaseClassNode.ATTRIBUTE) {
		override getText(Attribute it) {
			'''«name»: «converter.toString(type.fullyQualifiedName)» «multiplicity?.mrep»''' // might want to make this less qualified
		}
	}
   
    def mrep(Multiplicity e)
	{
		if (e !== null)
		{
			if(e.multiplicitySpec !== null)
			{
				switch e.multiplicitySpec {
					case ATLEASTONE: {
						'''[1..*]'''
					}
					case MANY: {
						'''[0..*]'''
					}
					case OPTIONAL: {
						'''[0..1]'''
					}
					case ONE:
					{
						if(e.minOccurs != 0)
						{
							'''[«e.minOccurs»..«e.maxOccurs» ]'''
						}
						else
						{
							''''''
						}
					}
					default:
						''''''
					
				}
			}
			else
			{
				'''[«e.minOccurs»..«e.maxOccurs» ]'''
			}
		}
		else
		{
		''''''
		}
	}
	
	
	
    val compositionConnection = new CompositionMapping<Composition>(this, 'compositionConnection', 'Composition') {

		override calls() {
			compositionConnectionName.labelFor[it]
			objectNode.target[type]
			objectNode.source[eContainer as ObjectType]
		}
	}
	
	val compositionConnectionName = new ConnectionLabelMapping<Composition>(this, 'composedName') {
		override createLabel(IMappedElementDescriptor<Composition> descriptor, Composition labelElement) {
			super.createLabel(descriptor, labelElement) => [ 
					position = 0.5
			]
		}
		
		override getText(Composition it) {
			'''«name» «multiplicity?.mrep»'''
		}
	}
	
    val referenceConnection = new ReferenceMapping<Reference>(this, 'referenceConnection', 'Reference') {

		override calls() {
			referenceConnectionName.labelFor[it]
			objectNode.target[type]
			objectNode.source[eContainer as ObjectType]
		}
	}
	
	val referenceConnectionName = new ConnectionLabelMapping<Reference>(this, 'eReferenceToName') {
		override createLabel(IMappedElementDescriptor<Reference> descriptor, Reference labelElement) {
			super.createLabel(descriptor, labelElement) => [ 
					position = 0.5
			]
		}
		
		override getText(Reference it) {
			'''«name» «multiplicity?.mrep»'''
		}
	}
	
	
    val superTypeConnection = new SuperTypeMapping<SourceTarget>(this, 'superTypeConnection', 'Supertype') 
    {
		override calls() {
			objectNode.target[getTarget as ObjectType] 
		}
	}
	
   val dsuperTypeConnection = new SuperTypeMapping<SourceTarget>(this, 'dsuperTypeConnection', 'Supertype') 
    {
		override calls() {
			dataNode.target[getTarget as DataType] 
		}
	}
	
   val psuperTypeConnection = new SuperTypeMapping<SourceTarget>(this, 'psuperTypeConnection', 'Supertype') 
    {
		override calls() {
			primitiveNode.target[getTarget as PrimitiveType] 
		}
	}
	
	override protected <ARG> entryCalls(ARG domainArgument, extension MappingAcceptor<ARG> acceptor) {

		switch domainArgument {
			VoDataModel: {
				add(vodslDiagram)

			}
			ObjectType:{
				add(objectNode, [domainArgument])
				add(vodslDiagram, [domainArgument.getContainerOfType(VoDataModel)])
			}
			
			DataType:{
				add(dataNode, [domainArgument])
				add(vodslDiagram, [domainArgument.getContainerOfType(VoDataModel)])
			}
		
			
		}
	}
	
	override protected createDomainObjectProvider() {
		new VodslDomainObjectProvider
	}

}
