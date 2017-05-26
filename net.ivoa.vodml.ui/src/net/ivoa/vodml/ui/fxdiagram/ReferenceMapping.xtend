package net.ivoa.vodml.ui.fxdiagram

import de.fxdiagram.core.anchors.LineArrowHead
import de.fxdiagram.mapping.ConnectionMapping
import de.fxdiagram.mapping.IMappedElementDescriptor
import de.fxdiagram.mapping.XDiagramConfig
import de.fxdiagram.mapping.shapes.BaseConnection
import javafx.scene.paint.Color

class ReferenceMapping<T> extends ConnectionMapping<T> {
	
	new(XDiagramConfig config, String id, String displayName) {
		super(config, id, displayName)
	}

	override createConnection(IMappedElementDescriptor< T > descriptor) {
			new BaseConnection(descriptor) => [
				targetArrowHead = new LineArrowHead(it, 10, 15, Color.GREEN,  false)
				stroke = Color.GREEN
			]
	}

	
}