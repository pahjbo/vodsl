/*
* generated by Xtext
*/
package net.ivoa.vodml;

/**
 * Initialization support for running Xtext languages 
 * without equinox extension registry
 */
public class VodslStandaloneSetup extends VodslStandaloneSetupGenerated{

	public static void doSetup() {
		new VodslStandaloneSetup().createInjectorAndDoEMFRegistration();
	}
}

