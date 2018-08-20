package net.ivoa.vodml.ui.fxdiagram

import com.google.inject.Inject
import de.fxdiagram.eclipse.xtext.mapping.AbstractXtextDiagramConfig
import de.fxdiagram.mapping.ConnectionLabelMapping
import de.fxdiagram.mapping.DiagramMapping
import de.fxdiagram.mapping.IMappedElementDescriptor
import de.fxdiagram.mapping.MappingAcceptor
import de.fxdiagram.mapping.NodeHeadingMapping
import de.fxdiagram.mapping.NodeLabelMapping
import de.fxdiagram.mapping.NodeMapping
import java.util.ArrayList
import java.util.List
import net.ivoa.vodml.vodsl.Attribute
import net.ivoa.vodml.vodsl.Composition
import net.ivoa.vodml.vodsl.DataType
import net.ivoa.vodml.vodsl.EnumLiteral
import net.ivoa.vodml.vodsl.Enumeration
import net.ivoa.vodml.vodsl.Multiplicity
import net.ivoa.vodml.vodsl.ObjectType
import net.ivoa.vodml.vodsl.PackageDeclaration
import net.ivoa.vodml.vodsl.PrimitiveType
import net.ivoa.vodml.vodsl.Reference
import net.ivoa.vodml.vodsl.VoDataModel
import org.eclipse.xtext.naming.IQualifiedNameConverter
import org.eclipse.xtext.naming.IQualifiedNameProvider

import static extension net.ivoa.vodml.ui.fxdiagram.ButtonExtensions.*
import static extension org.eclipse.xtext.EcoreUtil2.*
import de.fxdiagram.mapping.shapes.BaseDiagramNode
import de.fxdiagram.mapping.shapes.BaseNode
import net.ivoa.vodml.vodsl.ReferableElement

/**
 * Configuration for VODSL FX diagram
 * 
 * TODO There is a fair bit of repetition in this for Primitives, DataTypes and ObjectTypes which should be eliminated - not sure how in xtend!
 * This was induced by deliberate design decision in grammar not to have supertype at the ValueType level for instance to make the grammar naturally more validating.
 */
class VodslDiagramConfig extends AbstractXtextDiagramConfig {
	
    @Inject extension IQualifiedNameProvider	
    @Inject IQualifiedNameConverter converter 


    private def <T> List<T> packageRecursiveFilter (Iterable<?> unfiltered, Class<T> type , List<T> acc) {
    	//IMPL could not see how to make nested iterators work -  so did by accumulating into a list     	
        acc.addAll(unfiltered.filter(type))	
        val pkg = unfiltered.filter(PackageDeclaration)
        if (!pkg.isEmpty)
            pkg.map[it.elements].forEach[packageRecursiveFilter(type,acc)]          
        acc
    }
    
    def <T> Iterable<T> packageFilter (Iterable<?> unfiltered, Class<T> type) {
    	
    	 
    	 unfiltered.packageRecursiveFilter(type, new ArrayList<T>())
    	
    }
    
	val vodslDiagram = new DiagramMapping<VoDataModel>(this, 'vodslDiagram', 'VODSL model') {
	
		
      override calls() {
			// when adding a model diagram
			packageNode.nodeForEach[elements.filter(PackageDeclaration)]
			
			primitiveNode.nodeForEach[elements.packageFilter(PrimitiveType)]
			enumNode.nodeForEach[elements.packageFilter(Enumeration)]
			objectNode.nodeForEach[elements.packageFilter(ObjectType)]
			dataNode.nodeForEach[elements.packageFilter(DataType)]
			eagerly(superTypeConnection, dsuperTypeConnection, psuperTypeConnection, compositionConnection, referenceConnection)
		}
		
	}
	
	
    val packageDiagram = new DiagramMapping<PackageDeclaration>(this, 'packageDiagram', 'VODSL package') {
		override calls() {
			// when adding a model diagram
			packageNode.nodeForEach[elements.filter(PackageDeclaration)]
			primitiveNode.nodeForEach[elements.filter(PrimitiveType)]
			enumNode.nodeForEach[elements.filter(Enumeration)]
			objectNode.nodeForEach[elements.filter(ObjectType)]
			dataNode.nodeForEach[elements.filter(DataType)]
			eagerly(superTypeConnection, dsuperTypeConnection, psuperTypeConnection, compositionConnection, referenceConnection)
		}
	}
	

	val packageNode = new NodeMapping<PackageDeclaration>(this, 'packageNode', 'Package') {
		override createNode(IMappedElementDescriptor<PackageDeclaration> descriptor) {
			new BaseDiagramNode(descriptor)
		}

		override protected calls() {
			packageNodeName.labelFor[it]
			packageDiagram.nestedDiagramFor[it].onOpen

		}

	}

	val packageNodeName = new NodeHeadingMapping<PackageDeclaration>(this, BaseDiagramNode.NODE_HEADING) {
		override getText(PackageDeclaration it) {
			name; // might want to manipulate slightly
		}
	}

	val objectNode = new NodeMapping<ObjectType>(this, 'objectNode', 'Object Type') {
		override createNode(IMappedElementDescriptor<ObjectType> descriptor) {
			new VODMLNode(descriptor)
		}
		
		override protected calls() {
			nodeName.labelFor[it]
			attribute.labelForEach[content.filter(Attribute)]
			
			superTypeConnection.outConnectionFor[if (superType !== null) new SourceTarget(it, it.superType)
			].asButton[getSupertypeButton("Add supertype")]
	
			compositionConnection.outConnectionForEach[ content.filter(Composition)
			].asButton[getCompositionButton("Add compositions")]

			referenceConnection.outConnectionForEach[ content.filter(Reference)
			].asButton[getReferenceButton("Add references")]
			
		}
		
	}
	
	val nodeName = new NodeHeadingMapping<ReferableElement>(this, VODMLNode.CLASS_NAME) {
		override getText(ReferableElement it) {
			name
		}
	}
	

	val dataNode = new NodeMapping<DataType>(this, 'dataNode', 'Data Type') {
		override createNode(IMappedElementDescriptor<DataType> descriptor) {
			new VODMLNode(descriptor)
		}
		override protected calls() {
			nodeName.labelFor[it]
			dataNodeType.labelFor[it]
			attribute.labelForEach[content.filter(Attribute)]
			
			dsuperTypeConnection.outConnectionFor[if (superType !== null) new SourceTarget(it, it.superType)
			].asButton[getSupertypeButton('Add supertype')]
			
		}
	}
	
	val dataNodeType = new NodeLabelMapping<DataType>(this, VODMLNode.STEREOTYPE) {
		override getText(DataType it) {
			'''<<dataType>>'''
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
	
	val enumNode = new NodeMapping<Enumeration>(this, 'enumNode', 'Enumeration'){
		override createNode(IMappedElementDescriptor<Enumeration> descriptor) {
			new VODMLNode(descriptor)
		}
		
		override protected calls() {
			nodeName.labelFor[it]
			enumNodeType.labelFor[it]
			enumLiteral.labelForEach[literals]		
			
			psuperTypeConnection.outConnectionFor[ if (superType !== null) new SourceTarget(it, it.superType)
				].asButton[getSupertypeButton("Add supertype")]
					
		}
		
	}
	
	val enumNodeType = new NodeLabelMapping<Enumeration>(this, VODMLNode.STEREOTYPE)
	{
		
		override getText(Enumeration it) {
			'''<<enumeration>>'''
		}
		
	}
	
	

   	val attribute = new NodeLabelMapping<Attribute>(this, VODMLNode.ATTRIBUTE) {
		override getText(Attribute it) {
			'''«name»: «converter.toString(type.fullyQualifiedName)» «multiplicity?.mrep»''' // might want to make this less qualified
		}
	}
	
   	val enumLiteral = new NodeLabelMapping<EnumLiteral>(this, VODMLNode.ATTRIBUTE) {
		override getText(EnumLiteral it) {
			'''«name»'''
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
			
			PackageDeclaration: {
				add(packageNode)
				add(vodslDiagram, [domainArgument.getContainerOfType(VoDataModel)])
			}
			
			ObjectType:{
				add(objectNode, [domainArgument])
				add(vodslDiagram, [domainArgument.getContainerOfType(VoDataModel)])
			}
			
			DataType:{
				add(dataNode, [domainArgument])
				add(vodslDiagram, [domainArgument.getContainerOfType(VoDataModel)])
			}
			Enumeration:{
				add(enumNode, [domainArgument])
				add(vodslDiagram, [domainArgument.getContainerOfType(VoDataModel)])
			}
		
			
		}
	}
	
	override protected createDomainObjectProvider() {
		new VodslDomainObjectProvider
	}

}
