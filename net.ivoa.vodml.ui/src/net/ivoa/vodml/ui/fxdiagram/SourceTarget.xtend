package net.ivoa.vodml.ui.fxdiagram

import net.ivoa.vodml.vodsl.ReferableElement
import org.eclipse.xtend.lib.annotations.Data

@Data
class SourceTarget {
	ReferableElement source
	ReferableElement target
}