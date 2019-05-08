package net.ivoa.vodsl.ui.fxdiagram

import net.ivoa.vodsl.vodsl.ReferableElement
import org.eclipse.xtend.lib.annotations.Data

@Data
class SourceTarget {
	ReferableElement source
	ReferableElement target
}