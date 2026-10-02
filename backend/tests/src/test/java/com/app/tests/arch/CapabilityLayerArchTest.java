package com.app.tests.arch;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.lang.ArchRule;
import org.junit.jupiter.api.Test;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

class CapabilityLayerArchTest {

    private static final JavaClasses ALL_APP_CLASSES = new ClassFileImporter()
            .importPackages("com.app");

    @Test
    void capabilityMustNotDependOnServices() {
        ArchRule rule = noClasses()
                .that().resideInAnyPackage("com.app.capability..")
                .should().dependOnClassesThat().resideInAnyPackage(
                        "com.app.core..",
                        "com.app.api..",
                        "com.app.engine..")
                .because("Capability modules are engine-agnostic and must not depend on services or engine");

        rule.check(ALL_APP_CLASSES);
    }

    @Test
    void onlyMcpApiPackageIsImportedFromOutsideCapabilityLayer() {
        ArchRule rule = noClasses()
                .that().resideOutsideOfPackage("com.app.capability..")
                .should().dependOnClassesThat().resideInAnyPackage(
                        "com.app.capability.mcp.transport..",
                        "com.app.capability.mcp.auth..",
                        "com.app.capability.mcp.spring..")
                .because("Callers outside capability/mcp must use com.app.capability.mcp.api only");

        rule.check(ALL_APP_CLASSES);
    }
}
