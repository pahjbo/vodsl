package net.ivoa.vodsl.ui.fxdiagram

import de.fxdiagram.annotations.properties.ModelNode
import de.fxdiagram.lib.nodes.RectangleBorderPane
import de.fxdiagram.mapping.IMappedElementDescriptor
import de.fxdiagram.mapping.shapes.BaseNode
import javafx.geometry.Insets
import javafx.geometry.Pos
import javafx.scene.layout.VBox
import javafx.scene.paint.Color
import javafx.scene.paint.CycleMethod
import javafx.scene.paint.LinearGradient
import javafx.scene.paint.Stop

import static extension de.fxdiagram.mapping.reconcile.MappingLabelListener.*
import javafx.scene.control.Separator

@ModelNode
class VODMLNode<T> extends BaseNode<T> {
	
	public static val STEREOTYPE = 'steretype'
	public static val CLASS_NAME = 'entityName'
	public static val ATTRIBUTE = 'attribute'
	public static val OPERATION = 'operation'
	
	
	VBox stereotypeCompartment
	VBox nameCompartment
	VBox attributeCompartment
	VBox operationsCompartment
	
	new (IMappedElementDescriptor<T> descriptor) {
		super(descriptor)
	}
	
	override protected createNode() {
		val pane = new RectangleBorderPane => [
			backgroundPaint = new LinearGradient(
				0, 0, 1, 1, 
				true, CycleMethod.NO_CYCLE,
				#[
					new Stop(0, Color.rgb(158, 188, 227)), 
					new Stop(1, Color.rgb(220, 230, 255))
				])
			backgroundRadius = 0.0
			borderRadius = 0.0
			children += new VBox => [
				padding = new Insets(10, 20, 10, 20)
				spacing = 10
				alignment = Pos.CENTER
				children += stereotypeCompartment = new VBox => [
					alignment = Pos.CENTER
					
				]
				
				children += nameCompartment = new VBox => [
					alignment = Pos.CENTER
					styleClass.add(0, "heading") // futile attempts to get this text bold...
					style = "-fx-font-weight: bolder;"
					
				]
				children += new Separator
				children += attributeCompartment = new VBox
				children += operationsCompartment = new VBox
			]
		]
		labelsProperty.addMappingLabelListener(
			STEREOTYPE -> stereotypeCompartment,
			CLASS_NAME -> nameCompartment,
			ATTRIBUTE -> attributeCompartment,
			OPERATION -> operationsCompartment)
		pane
	}
	
	
}
