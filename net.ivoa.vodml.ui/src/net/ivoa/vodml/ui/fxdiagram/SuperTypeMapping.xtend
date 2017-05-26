package net.ivoa.vodml.ui.fxdiagram

import de.fxdiagram.mapping.ConnectionMapping
import de.fxdiagram.mapping.XDiagramConfig
import de.fxdiagram.mapping.IMappedElementDescriptor
import de.fxdiagram.mapping.shapes.BaseConnection
import de.fxdiagram.core.anchors.TriangleArrowHead
import javafx.scene.paint.Color

class SuperTypeMapping<T> extends ConnectionMapping<T> {
	
	new(XDiagramConfig config, String id, String displayName) {
		super(config, id, displayName)
	}

	override createConnection(IMappedElementDescriptor< T > descriptor) {
			new BaseConnection(descriptor) => [
				targetArrowHead = new TriangleArrowHead(it, 10, 15, Color.RED, Color.WHITE, false)
				stroke = Color.RED
			]
	}

	
}