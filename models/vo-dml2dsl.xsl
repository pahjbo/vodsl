<?xml version="1.0" encoding="UTF-8"?>
<!--
This XSLT script transforms a data model from the
intermediate representation to the dsl representation.
 -->

<xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
								xmlns:exsl="http://exslt.org/common"
                extension-element-prefixes="exsl"
                xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                xmlns:vo-dml="http://volute.googlecode.com/dm/vo-dml/v0.9">
  
 <xsl:output method="text" encoding="UTF-8" indent="no" />
  
  <xsl:param name="model.name"/>
  <xsl:param name="usesubgraph" select="'F'"/>
  
  <xsl:strip-space elements="*" />
  
  <xsl:key name="element" match="*//vodml-id" use="."/>
  <xsl:key name="package" match="*//package/vodml-id" use="."/>

  
  <xsl:variable name="packages" select="//package/vodml-id"/>
  <xsl:variable name="single_quote"><xsl:text>'</xsl:text></xsl:variable>
  <xsl:variable name="double_quote"><xsl:text>"</xsl:text></xsl:variable>

  <xsl:variable name="modname">
    <xsl:choose>
      <xsl:when test="/vo-dml:model/vodml-id"><xsl:value-of select="/vo-dml:model/vodml-id"  /></xsl:when>
      <xsl:otherwise><xsl:value-of select="/vo-dml:model/name"  /></xsl:otherwise>
    </xsl:choose>
  </xsl:variable>
   

  <xsl:template match="/">
  <xsl:message>Starting DSL</xsl:message>
    <xsl:apply-templates select="vo-dml:model"/>
  </xsl:template>
  
  <xsl:template match="vo-dml:model">  
  <xsl:message>Found model <xsl:value-of select="$modname"/></xsl:message>
model <xsl:value-of select="$modname"/> (<xsl:value-of select="version"/>) "<xsl:value-of select="description"/>"
	  <xsl:apply-templates select="import" />
	  <xsl:apply-templates select="* except (import|version|description|vodml-id|lastModified|name|title)"/>
  </xsl:template>
 
 <xsl:template match="import">
   <xsl:analyze-string regex="/([^/]+)\.vo-dml" select="url">
     <xsl:matching-substring>
       include "<xsl:value-of select="regex-group(1)"/>.vodsl"
     </xsl:matching-substring>
    
   </xsl:analyze-string>
   
 </xsl:template> 
  

  <xsl:template match="package">
package <xsl:value-of select="concat(vodml-id,' ')"/> <xsl:apply-templates select= "description"/>
{
      <xsl:apply-templates select="* except (vodml-id|description|name)" />
}
  </xsl:template>
  
  <xsl:template match="primitiveType">
    primitive <xsl:value-of select="concat(vodml-id, ' ')"/> <xsl:apply-templates select="description"/>
  </xsl:template>  

<xsl:template match="objectType">
  <xsl:text> </xsl:text><xsl:if test="@abstract">abstract </xsl:if>otype <xsl:value-of select="name"/><xsl:text> </xsl:text>
  <xsl:apply-templates select= "extends"/>
  <xsl:apply-templates select= "description"/>
  { 
     <xsl:apply-templates select="* except (vodml-id|description|name|extends)"/>
  }
</xsl:template>
<xsl:template match="dataType"><!-- is this really so different from object? -->
  <xsl:text> </xsl:text><xsl:if test="@abstract">abstract </xsl:if>dtype <xsl:value-of select="name"/><xsl:text> </xsl:text>
  <xsl:apply-templates select= "extends"/>
  <xsl:apply-templates select= "description"/>
  { 
     <xsl:apply-templates select="* except (vodml-id|description|name|extends)"/>
  }
</xsl:template>

<xsl:template match ="description">
  <xsl:text> "</xsl:text><xsl:if test="not(matches(text(),'^\s*TODO'))"><xsl:value-of select='translate(.,$double_quote,$single_quote)'/></xsl:if><xsl:text>"</xsl:text>
</xsl:template>

<xsl:template match="attribute">
  <xsl:text>
        </xsl:text>
  <xsl:value-of select="concat(name, ':')"/> 
  <xsl:apply-templates select="datatype"/><xsl:text> </xsl:text> 
  <xsl:apply-templates select="multiplicity"/><xsl:text> </xsl:text> 
  <xsl:apply-templates select="description"/>
  <xsl:apply-templates select="* except (description|datatype|name|vodml-id|multiplicity)"/>
  <xsl:text>;</xsl:text>
</xsl:template>
  
<xsl:template match="utype">

  <xsl:choose>
    <xsl:when test="starts-with(text(),'ivoa:')"><xsl:value-of select="substring-after(text(),'ivoa:')"/></xsl:when> <!-- assume the ivoa namespace as default -->
    <xsl:when test="starts-with(text(),concat(/vo-dml:model/vodml-id,':')) or starts-with(text(),concat(/vo-dml:model/name,':'))">
     <!-- TODO should deal with nested packages -->
     <xsl:variable name="pname" select="ancestor::package/name/text()"/>     
      <xsl:for-each select="tokenize(substring-after(text(),':'), '\.')">
      <xsl:if test=". ne $pname or position() eq last()"><xsl:sequence select="."/>
      </xsl:if>
        
      </xsl:for-each>
    
    </xsl:when>
    <xsl:otherwise><xsl:value-of select="."/></xsl:otherwise>
  </xsl:choose>
  <xsl:text> /* utype=</xsl:text><xsl:value-of select="."/><xsl:text>*/</xsl:text>
</xsl:template>

<xsl:template match="multiplicity">
   <xsl:choose>
   <xsl:when test="number(minOccurs) eq 1 and number(maxOccurs) eq 1"><!-- do nothing --></xsl:when>
   <xsl:when test="number(minOccurs) eq 0 and number(maxOccurs) eq 1"> @? </xsl:when>
   <xsl:when test="number(minOccurs) eq 0 and number(maxOccurs) eq -1"> @* </xsl:when>
   <xsl:when test="number(minOccurs) eq 1 and number(maxOccurs) eq -1"> @+ </xsl:when>
   <xsl:otherwise><xsl:value-of select="concat('@[',minOccurs,'..', maxOccurs,']')"/></xsl:otherwise>
   </xsl:choose>
</xsl:template>

<xsl:template match="enumeration">
enum <xsl:value-of select="name"/><xsl:text> </xsl:text> 
<xsl:apply-templates select="description"/>
{
<xsl:apply-templates select="literal"/>
}
</xsl:template>
<xsl:template match="literal">
<xsl:value-of select="name"/><xsl:text> </xsl:text><xsl:apply-templates select="description"/>
<xsl:if test="position() != last()">,
</xsl:if>
</xsl:template>

<xsl:template match="collection|container"> <!-- are they both present? think that want to be able to say things set list vector and whether composition or aggregation-->
  <xsl:text>
        </xsl:text>
  <xsl:value-of select="concat(name, ' : ')"/> 
  <xsl:apply-templates select="datatype,multiplicity"/>
  <xsl:text> as</xsl:text>
  <xsl:if test="@isOrdered"><xsl:text> ordered</xsl:text></xsl:if>
  <xsl:text> composition</xsl:text>
  <xsl:apply-templates select="description"/>

</xsl:template>

<xsl:template match="reference">
   <xsl:text>
        </xsl:text>
  <xsl:value-of select="concat(name, ' references ')"/> 
  <xsl:apply-templates select="datatype"/>
  <xsl:apply-templates select="description"/>
</xsl:template>


<xsl:template match="extends">
  extends <xsl:apply-templates/>
</xsl:template>

<xsl:template match="skosconcept">
 skosconcept "<xsl:value-of select="broadestSKOSConcept"/>" in "<xsl:value-of select="vocabularyURI"/>"
</xsl:template>

<xsl:template match="datatype"> <!-- just a reference... -->
  <xsl:apply-templates/>
</xsl:template>

<xsl:template match="constraints"> 
  <xsl:text> constraint</xsl:text>
  <xsl:apply-templates select="* except attribute"/>
</xsl:template>

<xsl:template match="constraints/minValue"> 
  <xsl:value-of select="concat(' min=&quot;',.,'&quot;')"/>
</xsl:template>
<xsl:template match="constraints/minLength"> 
  <xsl:value-of select="concat(' minlen=',.)"/>
</xsl:template>
<xsl:template match="constraints/maxLength"> 
<xsl:if test="number(.) ne -1">
  <xsl:value-of select="concat(' maxlen=',.)"/>
 </xsl:if>
</xsl:template>
<xsl:template match="constraints/length"> 
  <xsl:value-of select="concat(' len=',.)"/>
</xsl:template>
<xsl:template match="constraints/uniqueGlobally"> 
  <xsl:text> unique globally</xsl:text>
</xsl:template>
<xsl:template match="constraints/uniqueInCollection"> 
  <xsl:text> unique</xsl:text>
</xsl:template>


<xsl:template match="author">
  <!-- ignore for now -->
</xsl:template>
<xsl:template match="*"> <!-- catchall to indicate where there might be missed element -->
  <xsl:value-of select="concat('***',name(.),'*** ')"/>
   <xsl:apply-templates/>
</xsl:template>






<xsl:template match="text()|@*">
  <xsl:value-of select="."/>
</xsl:template>


</xsl:stylesheet>