package net.ivoa.vodml.ui.fxdiagram

import de.fxdiagram.eclipse.xtext.XtextDomainObjectProvider
import de.fxdiagram.mapping.AbstractMapping
import de.fxdiagram.mapping.IMappedElementDescriptor


class VodslDomainObjectProvider extends XtextDomainObjectProvider {
	
	override <T> createMappedElementDescriptor(T domainObject, AbstractMapping<? extends T> mapping) {
		var retval = super.<T>createMappedElementDescriptor(domainObject, mapping) as IMappedElementDescriptor<T>
		if (retval === null)
		{
			switch it: domainObject {
			   SourceTarget:
			     retval = new SourceTargetDescriptor(
					getSource.createXtextEObjectID,
					getTarget.createXtextEObjectID,
					mapping.ID , // probably superfluous
					mapping.config.ID, mapping.ID) as IMappedElementDescriptor<T>
			     
			   default:
			     retval = null
			}
		}
		return retval
	}
	
}