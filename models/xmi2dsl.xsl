<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:xmi="http://schema.omg.org/spec/XMI/2.1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:uml="http://www.eclipse.org/uml2/3.0.0/UML" 
>
<!-- basic stylesheet to take a xmi file to dsl directly
is rather "inexact" on purpose - only to catch the essence of a model -->

  <xsl:output method="text"  />
  
  <xsl:variable name="xmi_ns" select="'http://schema.omg.org/spec/XMI/2.1'" />
  <xsl:variable name="uml_ns" select="'http://www.eclipse.org/uml2/3.0.0/UML'" />

  <xsl:variable name="sq"><xsl:text>'</xsl:text></xsl:variable>
  <xsl:variable name="dq"><xsl:text>"</xsl:text></xsl:variable>
  <xsl:variable name='cr'><xsl:text>
</xsl:text></xsl:variable>

   <!-- xml index on xml:id -->
  <!-- problem with match="*" is that MagicDraw creates a <proxy> for Resource (for example) when it uses a stereotype and Resource shows then up twice with the same xmi:id. -->
  <xsl:key name="classid" match="/uml:Model//*" use="@xmi:id" />
  
  <xsl:template match="/uml:Model">
   <xsl:value-of select="concat('model ',@name)"/>
<!--       <xsl:apply-templates select="./*[@xmi:type='uml:Package']" mode="modelimport"/> -->
      <xsl:apply-templates select="./packagedElement[@xmi:type='uml:PrimitiveType']" />
      <xsl:apply-templates select="./packagedElement[@xmi:type='uml:Enumeration']" />
      <xsl:apply-templates select="./packagedElement[@xmi:type='uml:DataType']"/>
      <xsl:apply-templates select="./packagedElement[@xmi:type='uml:Class']"/>
      <xsl:apply-templates select="./*[@xmi:type='uml:Package']"/>
  </xsl:template>
  
	<xsl:template match="packagedElement[@xmi:type='uml:PrimitiveType']">
      <xsl:value-of select="concat($cr,'primitive ',@name)"/>
   </xsl:template>
   
   <xsl:template match="packagedElement[@xmi:type='uml:Enumeration']">
      <xsl:value-of select="concat($cr,'enum ',@name)"/>
      <xsl:value-of select="concat($cr,'{',$cr)"/>
      <xsl:apply-templates select="ownedLiteral"/>
      <xsl:value-of select="concat($cr,'}')"/>
   </xsl:template>
   
   <xsl:template match="packagedElement[@xmi:type='uml:DataType']">
      <xsl:value-of select="concat($cr,'dtype ',@name)"/>
      <xsl:value-of select="concat($cr,'{',$cr)"/>
      <xsl:apply-templates/>
      <xsl:value-of select="concat($cr,'}')"/>
   </xsl:template>

   <xsl:template match="packagedElement[@xmi:type='uml:Class']">
      <xsl:value-of select="concat($cr,'otype ',@name)"/>
      <xsl:if test="generalization/@general">
         <xsl:text> extends </xsl:text>
         <xsl:apply-templates select="key('classid',generalization/@general)" mode="qualify"/>
      </xsl:if>
      <xsl:text> ""</xsl:text>
      <xsl:value-of select="concat($cr,'{',$cr)"/>
        <xsl:apply-templates/>
      <xsl:value-of select="concat($cr,'}')"/>
   </xsl:template>
   
   <xsl:template match="ownedAttribute">
        <xsl:value-of select="concat($cr,@name,' :')"/>
        <xsl:choose>
           <xsl:when test="@type">
             <xsl:apply-templates select="key('classid',@type)" mode="qualify"/>
           </xsl:when>
           <xsl:otherwise><xsl:text>string</xsl:text></xsl:otherwise>
           
        </xsl:choose>
        <xsl:text> </xsl:text>
        <xsl:apply-templates select="." mode="multiplicity"/>
      
        <xsl:text> "";</xsl:text>
   </xsl:template>
 
    <xsl:template match="ownedLiteral">
        <xsl:value-of select="concat($cr,@name,' ',$dq,$dq)"/>
        <xsl:if test="position() != last()"><xsl:value-of select="','"/></xsl:if>
   </xsl:template>
 
   <xsl:template match="*" mode="qualify">
       <xsl:value-of separator=".">
          <xsl:sequence select="ancestor::packagedElement[@xmi:type='uml:Package']/@name"/>
          <xsl:value-of select="@name"/>
       </xsl:value-of>
   </xsl:template>
   
   <xsl:template match="*" mode="multiplicity">
      <xsl:choose>
         <xsl:when test="lowerValue and not(upperValue)"><xsl:text>@?</xsl:text></xsl:when>
         <xsl:when test="lowerValue and upperValue">
            <xsl:choose >
                <xsl:when test="lowerValue/@value and upperValue[@value != '*']">
                   <xsl:value-of select="concat('@[',lowerValue/@value,'..',upperValue/@value,']')"/>
                </xsl:when>
                <xsl:when test="not(lowerValue/@value) and upperValue[@value = '*']">
                   <xsl:text>@*</xsl:text>
                </xsl:when>
                 <xsl:when test="lowerValue/@value = 1 and upperValue[@value = '*']">
                   <xsl:text>@+</xsl:text>
                </xsl:when>
            </xsl:choose>
         </xsl:when>
      </xsl:choose>
   </xsl:template>
 
 <xsl:template match="*[@xmi:type='uml:Package']">
<!-- test that the Package is not a modelimport -->
    <xsl:variable name="xmiid" select="@xmi:id"/>


<xsl:choose>
<xsl:when test="not(/xmi:XMI/*[local-name()='modelImport' and @base_Package = $xmiid])">
<xsl:message>found no modelimport for package <xsl:value-of select="@name"/></xsl:message>

    <!-- check if a name is defined -->
    <xsl:if test="count(@name) > 0 and not(starts-with(@name,'_') and not(/xmi:XMI/*[local-name()='modelImport' and @base_Package = $xmiid]))">
<xsl:message>Generating package <xsl:value-of select="@name"/></xsl:message>
      
     <xsl:value-of select="concat('package ',@name,$cr,'{',$cr)"/>
     
          <xsl:apply-templates select="./packagedElement[@xmi:type='uml:PrimitiveType']" />
          <xsl:apply-templates select="./packagedElement[@xmi:type='uml:Enumeration']" />
          <xsl:apply-templates select="./packagedElement[@xmi:type='uml:DataType']" />
          <xsl:apply-templates select="./packagedElement[@xmi:type='uml:Class']" />
        <xsl:apply-templates select="./packagedElement[@xmi:type='uml:Package']" />
      <xsl:value-of select="concat($cr,'}')"/>
     
    </xsl:if>
</xsl:when>
<xsl:otherwise>
<xsl:message>found modelimport for package <xsl:value-of select="@name"/>, not creating Package</xsl:message>
</xsl:otherwise>
</xsl:choose>
  </xsl:template>  
  
 
   
	<!-- standard copy template -->
	<xsl:template match="@*|node()">
		<xsl:copy>
			<xsl:apply-templates select="@*"/>
			<xsl:apply-templates/>
		</xsl:copy>
	</xsl:template>	
</xsl:stylesheet>