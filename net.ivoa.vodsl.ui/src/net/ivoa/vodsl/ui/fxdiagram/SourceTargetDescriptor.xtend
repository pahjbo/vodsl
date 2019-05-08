package net.ivoa.vodsl.ui.fxdiagram

import de.fxdiagram.annotations.properties.FxProperty
import de.fxdiagram.annotations.properties.ModelNode
import de.fxdiagram.eclipse.xtext.ids.XtextEObjectID
import java.util.NoSuchElementException
import org.eclipse.emf.ecore.EObject
import org.eclipse.emf.ecore.EPackage
import org.eclipse.emf.ecore.EReference
import org.eclipse.xtext.ui.editor.XtextEditor

import static extension org.eclipse.emf.common.util.URI.*
import static extension org.eclipse.emf.ecore.util.EcoreUtil.*
import de.fxdiagram.eclipse.xtext.AbstractXtextDescriptor
import net.ivoa.vodsl.vodsl.ReferableElement

@ModelNode('sourceID', 'targetID')
class SourceTargetDescriptor extends AbstractXtextDescriptor<SourceTarget> {
	
	@FxProperty(readOnly=true) XtextEObjectID sourceID
	@FxProperty(readOnly=true) XtextEObjectID targetID
	
	String kind
	

	new(XtextEObjectID sourceID, XtextEObjectID targetID, String kind, String mappingConfigID, String mappingID) {
		super(mappingConfigID, mappingID)
		sourceIDProperty.set(sourceID)
		targetIDProperty.set(targetID)
		this.kind = kind
	}
	
	override <U> withDomainObject((SourceTarget)=>U lambda) {
		val editor = provider.getCachedEditor(sourceID, false, false)
		if(editor instanceof XtextEditor) {
			editor.document.readOnly [ 
				val source = sourceID.resolve(resourceSet) as ReferableElement
				val storedTarget = targetID.resolve(resourceSet) as ReferableElement
				val st = new SourceTarget(source, storedTarget)
				lambda.apply(st)
			]
		} else 
			throw new NoSuchElementException('Cannot open an Xtext editor for ' + sourceID)

	}
	
	override openInEditor(boolean select) {
		provider.getCachedEditor(sourceID, select, select)
	}
	
	override getName() {
		sourceID.qualifiedName.lastSegment + '--' + kind  + '-->' + targetID.qualifiedName.lastSegment  
	}
	
	
	
	override equals(Object obj) {
		if(obj instanceof SourceTargetDescriptor) 
			return super.equals(obj) 
				&& sourceID == obj.sourceID && targetID == obj.targetID
				&& kind == obj.kind
		else
			return false
	}
	
	override hashCode() {
		super.hashCode() + 13 * sourceID.hashCode + 23 * targetID.hashCode + 31 * kind.hashCode 
	}
	
	override protected getResourceServiceProvider() {
		sourceID.resourceServiceProvider
	}
	
}