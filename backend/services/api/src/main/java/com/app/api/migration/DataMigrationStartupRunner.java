package com.app.api.migration;

import com.app.api.service.auth.DemoSignInService;
import com.app.common.auth.OrganizationRole;
import com.app.common.auth.SignInMethod;
import com.app.common.connector.ConnectorScope;
import com.app.common.entity.CredentialScope;
import com.app.common.entity.IntegrationCredential;
import com.app.common.entity.Organization;
import com.app.common.entity.OrganizationMembership;
import com.app.common.entity.UserAccount;
import com.app.common.entity.WorkflowDefinition;
import com.app.common.entity.WorkflowExecution;
import com.app.persistence.entity.ConnectorManifestEntity;
import com.app.persistence.entity.FormRegistrationEntity;
import com.app.persistence.entity.FormSubmissionEntity;
import com.app.persistence.entity.IntegrationEntity;
import com.app.common.entity.AuthSession;
import com.app.common.entity.OAuthState;
import com.app.persistence.repository.AuthSessionRepository;
import com.app.persistence.repository.ConnectorManifestRepository;
import com.app.persistence.repository.FormRegistrationRepository;
import com.app.persistence.repository.FormSubmissionRepository;
import com.app.persistence.repository.IntegrationCredentialRepository;
import com.app.persistence.repository.IntegrationRepository;
import com.app.persistence.repository.OAuthStateRepository;
import com.app.persistence.repository.OrganizationMembershipRepository;
import com.app.persistence.repository.OrganizationRepository;
import com.app.persistence.repository.UserAccountRepository;
import com.app.persistence.repository.WorkflowDefinitionRepository;
import com.app.persistence.repository.WorkflowExecutionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bson.types.ObjectId;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Startup migration runner that verifies and fixes data consistency for existing database records.
 *
 * <p>Ensures:
 * <ul>
 *   <li>A default admin organization exists and all organizations have initialized settings.</li>
 *   <li>All orphan workflows, credentials, integrations, forms, executions, sessions, and OAuth states have a valid organizationId.</li>
 *   <li>All existing users have an active organization membership (without modifying user emails or credentials).</li>
 * </ul>
 */
@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@RequiredArgsConstructor
public class DataMigrationStartupRunner {

    private final OrganizationRepository organizationRepository;
    private final OrganizationMembershipRepository membershipRepository;
    private final UserAccountRepository userAccountRepository;
    private final WorkflowDefinitionRepository workflowDefinitionRepository;
    private final IntegrationCredentialRepository credentialRepository;
    private final WorkflowExecutionRepository executionRepository;
    private final IntegrationRepository integrationRepository;
    private final FormRegistrationRepository formRegistrationRepository;
    private final FormSubmissionRepository formSubmissionRepository;
    private final ConnectorManifestRepository connectorManifestRepository;
    private final AuthSessionRepository authSessionRepository;
    private final OAuthStateRepository oauthStateRepository;

    @EventListener(ApplicationReadyEvent.class)
    public void runMigrations() {
        log.info("Starting enterprise data consistency and migration check...");
        executeMigrationStep("migrateLegacyDefaultOrgToPlatformAdminOrg", this::migrateLegacyDefaultOrgToPlatformAdminOrg);
        String defaultOrgId = resolveOrCreateDefaultAdminOrganization();

        executeMigrationStep("ensureOrganizationSettingsInitialized", this::ensureOrganizationSettingsInitialized);
        executeMigrationStep("migrateOrphanWorkflowDefinitions", () -> migrateOrphanWorkflowDefinitions(defaultOrgId));
        executeMigrationStep("migrateOrphanCredentials", () -> migrateOrphanCredentials(defaultOrgId));
        executeMigrationStep("migrateOrphanExecutions", () -> migrateOrphanExecutions(defaultOrgId));
        executeMigrationStep("migrateOrphanIntegrations", () -> migrateOrphanIntegrations(defaultOrgId));
        executeMigrationStep("migrateOrphanForms", () -> migrateOrphanForms(defaultOrgId));
        executeMigrationStep("migrateOrphanConnectors", () -> migrateOrphanConnectors(defaultOrgId));
        executeMigrationStep("migrateOrphanSessions", () -> migrateOrphanSessions(defaultOrgId));
        executeMigrationStep("migrateOrphanOAuthStates", () -> migrateOrphanOAuthStates(defaultOrgId));
        executeMigrationStep("ensureStandardDemoOrganizationsAndUsers", () -> ensureStandardDemoOrganizationsAndUsers(defaultOrgId));
        executeMigrationStep("migrateUserMemberships", () -> migrateUserMemberships(defaultOrgId));

        log.info("Enterprise data consistency and migration check completed successfully.");
    }

    private void executeMigrationStep(String name, Runnable step) {
        try {
            step.run();
        } catch (Exception ex) {
            log.error("Migration step '{}' failed: {}", name, ex.getMessage(), ex);
        }
    }

    private void migrateLegacyDefaultOrgToPlatformAdminOrg() {
        boolean legacyExists = organizationRepository.existsById("default-org");
        if (!legacyExists) {
            return;
        }

        log.info("Migrating legacy 'default-org' to 'platform-admin-org'...");

        // Ensure platform-admin-org exists
        if (!organizationRepository.existsById("platform-admin-org")) {
            Organization adminOrg = new Organization();
            adminOrg.setId("platform-admin-org");
            adminOrg.setName("Platform Admin Organization");
            Organization legacyOrg = organizationRepository.findById("default-org").orElse(null);
            adminOrg.setSettings(legacyOrg != null && legacyOrg.getSettings() != null ? legacyOrg.getSettings() : new HashMap<>());
            organizationRepository.save(adminOrg);
            log.info("Created 'platform-admin-org' for legacy migration.");
        }

        // 1. Memberships
        List<OrganizationMembership> memberships = membershipRepository.findAll();
        for (OrganizationMembership m : memberships) {
            if ("default-org".equals(m.getOrganizationId())) {
                if (membershipRepository.findByUserIdAndOrganizationId(m.getUserId(), "platform-admin-org").isPresent()) {
                    membershipRepository.deleteById(m.getId());
                } else {
                    m.setOrganizationId("platform-admin-org");
                    membershipRepository.save(m);
                }
            }
        }

        // 2. Workflows
        List<WorkflowDefinition> workflows = workflowDefinitionRepository.findAll();
        for (WorkflowDefinition w : workflows) {
            if ("default-org".equals(w.getOrganizationId())) {
                w.setOrganizationId("platform-admin-org");
                workflowDefinitionRepository.save(w);
            }
        }

        // 3. Credentials
        List<IntegrationCredential> credentials = credentialRepository.findAll();
        for (IntegrationCredential c : credentials) {
            if ("default-org".equals(c.getOrganizationId())) {
                c.setOrganizationId("platform-admin-org");
                if (c.getCredentialScope() == null) {
                    c.setCredentialScope(CredentialScope.ORG_SHARED);
                }
                credentialRepository.save(c);
            }
        }

        // 4. Executions
        List<WorkflowExecution> executions = executionRepository.findAll();
        for (WorkflowExecution e : executions) {
            if ("default-org".equals(e.getOrganizationId())) {
                e.setOrganizationId("platform-admin-org");
                executionRepository.save(e);
            }
        }

        // 5. Integrations
        List<IntegrationEntity> integrations = integrationRepository.findAll();
        for (IntegrationEntity i : integrations) {
            if ("default-org".equals(i.getOrganizationId())) {
                i.setOrganizationId("platform-admin-org");
                integrationRepository.save(i);
            }
        }

        // 6. Form Registrations
        List<FormRegistrationEntity> forms = formRegistrationRepository.findAll();
        for (FormRegistrationEntity f : forms) {
            if ("default-org".equals(f.getOrganizationId())) {
                f.setOrganizationId("platform-admin-org");
                formRegistrationRepository.save(f);
            }
        }

        // 7. Form Submissions
        List<FormSubmissionEntity> submissions = formSubmissionRepository.findAll();
        for (FormSubmissionEntity s : submissions) {
            if ("default-org".equals(s.getOrganizationId())) {
                s.setOrganizationId("platform-admin-org");
                formSubmissionRepository.save(s);
            }
        }

        // 8. Connector Manifests
        List<ConnectorManifestEntity> connectors = connectorManifestRepository.findAll();
        for (ConnectorManifestEntity c : connectors) {
            if ("default-org".equals(c.getOrganizationId())) {
                c.setOrganizationId("platform-admin-org");
                connectorManifestRepository.save(c);
            }
        }

        // 9. Auth Sessions
        List<AuthSession> sessions = authSessionRepository.findAll();
        for (AuthSession s : sessions) {
            if ("default-org".equals(s.getActiveOrganizationId())) {
                s.setActiveOrganizationId("platform-admin-org");
                authSessionRepository.save(s);
            }
        }

        // 10. OAuth States
        List<OAuthState> oauthStates = oauthStateRepository.findAll();
        for (OAuthState o : oauthStates) {
            if ("default-org".equals(o.getOrganizationId())) {
                o.setOrganizationId("platform-admin-org");
                oauthStateRepository.save(o);
            }
        }

        // Delete legacy default-org
        organizationRepository.deleteById("default-org");
        log.info("Successfully migrated legacy 'default-org' to 'platform-admin-org' and removed 'default-org'.");
    }

    private String resolveOrCreateDefaultAdminOrganization() {
        if (!organizationRepository.existsById("platform-admin-org")) {
            Organization org = new Organization();
            org.setId("platform-admin-org");
            org.setName("Platform Admin Organization");
            org.setSettings(new HashMap<>());
            organizationRepository.save(org);
            log.info("Created default Platform Admin Organization ('platform-admin-org')");
        }
        return "platform-admin-org";
    }

    private Set<String> getValidOrganizationIds() {
        return organizationRepository.findAll().stream()
                .map(Organization::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    private void migrateUserMemberships(String defaultOrgId) {
        Set<String> validOrgIds = getValidOrganizationIds();
        List<UserAccount> users = userAccountRepository.findAll();
        for (UserAccount user : users) {
            // Note: User emails and display names are NOT modified.
            // Ensure platform administrators always have ORGANIZATION_ADMIN membership in the default org
            if (user.isPlatformAdmin()) {
                boolean hasDefaultMembership = membershipRepository
                        .findByUserIdAndOrganizationId(user.getId(), defaultOrgId)
                        .isPresent();
                if (!hasDefaultMembership) {
                    OrganizationMembership membership = new OrganizationMembership();
                    membership.setId(new ObjectId());
                    membership.setUserId(user.getId());
                    membership.setOrganizationId(defaultOrgId);
                    membership.setRole(OrganizationRole.ORGANIZATION_ADMIN);
                    membershipRepository.save(membership);
                    log.info("Ensured platform admin '{}' has membership in default org '{}'", user.getId(), defaultOrgId);
                }
            }

            List<OrganizationMembership> memberships = membershipRepository.findByUserId(user.getId());
            boolean hasValidMembership = memberships.stream()
                    .anyMatch(m -> m.getOrganizationId() != null && validOrgIds.contains(m.getOrganizationId()));

            if (!hasValidMembership) {
                OrganizationMembership membership = new OrganizationMembership();
                membership.setId(new ObjectId());
                membership.setUserId(user.getId());
                membership.setOrganizationId(defaultOrgId);
                membership.setRole(user.isPlatformAdmin() ? OrganizationRole.ORGANIZATION_ADMIN : OrganizationRole.MEMBER);
                membershipRepository.save(membership);
                log.info("Assigned user '{}' to default organization '{}'", user.getId(), defaultOrgId);
            }
        }
    }

    private void ensureStandardDemoOrganizationsAndUsers(String defaultOrgId) {
        // 1. Ensure platform-admin-org exists
        if (!organizationRepository.existsById("platform-admin-org")) {
            Organization platformAdminOrg = new Organization();
            platformAdminOrg.setId("platform-admin-org");
            platformAdminOrg.setName("Platform Admin Organization");
            platformAdminOrg.setSettings(new HashMap<>());
            organizationRepository.save(platformAdminOrg);
            log.info("Created Platform Admin Organization ('platform-admin-org')");
        }

        // 2. Ensure demo-org exists
        if (!organizationRepository.existsById("demo-org")) {
            Organization demoOrg = new Organization();
            demoOrg.setId("demo-org");
            demoOrg.setName("Demo Organization");
            demoOrg.setSettings(new HashMap<>());
            organizationRepository.save(demoOrg);
            log.info("Created Demo Organization ('demo-org')");
        }

        // 3. User 1: Platform Admin (belongs to platform-admin-org only)
        UserAccount admin = userAccountRepository
                .findBySignInMethodAndProviderUserId(SignInMethod.DEMO, DemoSignInService.DEMO_ADMIN_PROVIDER_ID)
                .orElseGet(() -> {
                    UserAccount u = new UserAccount();
                    u.setId(new ObjectId());
                    u.setSignInMethod(SignInMethod.DEMO);
                    u.setProviderUserId(DemoSignInService.DEMO_ADMIN_PROVIDER_ID);
                    return u;
                });
        admin.setEmail("admin@workflow.local");
        admin.setDisplayName("Platform Admin");
        admin.setPlatformAdmin(true);
        userAccountRepository.save(admin);

        // Remove any non-platform-admin memberships for platform admin
        List<OrganizationMembership> adminMemberships = membershipRepository.findByUserId(admin.getId());
        for (OrganizationMembership m : adminMemberships) {
            if (!"platform-admin-org".equals(m.getOrganizationId())) {
                membershipRepository.deleteById(m.getId());
                log.info("Removed non-platform-admin membership '{}' (org '{}') for platform admin", m.getId(), m.getOrganizationId());
            }
        }
        if (membershipRepository.findByUserIdAndOrganizationId(admin.getId(), "platform-admin-org").isEmpty()) {
            OrganizationMembership m = new OrganizationMembership();
            m.setId(new ObjectId());
            m.setUserId(admin.getId());
            m.setOrganizationId("platform-admin-org");
            m.setRole(OrganizationRole.ORGANIZATION_ADMIN);
            membershipRepository.save(m);
        }

        // 4. User 2: Org Admin (belongs to demo-org as ORGANIZATION_ADMIN)
        UserAccount orgAdmin = userAccountRepository
                .findBySignInMethodAndProviderUserId(SignInMethod.DEMO, DemoSignInService.DEMO_ORG_ADMIN_PROVIDER_ID)
                .orElseGet(() -> {
                    UserAccount u = new UserAccount();
                    u.setId(new ObjectId());
                    u.setSignInMethod(SignInMethod.DEMO);
                    u.setProviderUserId(DemoSignInService.DEMO_ORG_ADMIN_PROVIDER_ID);
                    return u;
                });
        orgAdmin.setEmail("orgadmin@workflow.local");
        orgAdmin.setDisplayName("Org Admin");
        orgAdmin.setPlatformAdmin(false);
        userAccountRepository.save(orgAdmin);

        OrganizationMembership orgAdminMem = membershipRepository
                .findByUserIdAndOrganizationId(orgAdmin.getId(), "demo-org")
                .orElseGet(() -> {
                    OrganizationMembership m = new OrganizationMembership();
                    m.setId(new ObjectId());
                    m.setUserId(orgAdmin.getId());
                    m.setOrganizationId("demo-org");
                    return m;
                });
        orgAdminMem.setRole(OrganizationRole.ORGANIZATION_ADMIN);
        membershipRepository.save(orgAdminMem);

        // 5. User 3: Org User / Member (belongs to demo-org as MEMBER)
        UserAccount orgUser = userAccountRepository
                .findBySignInMethodAndProviderUserId(SignInMethod.DEMO, DemoSignInService.DEMO_USER_PROVIDER_ID)
                .orElseGet(() -> {
                    UserAccount u = new UserAccount();
                    u.setId(new ObjectId());
                    u.setSignInMethod(SignInMethod.DEMO);
                    u.setProviderUserId(DemoSignInService.DEMO_USER_PROVIDER_ID);
                    return u;
                });
        orgUser.setEmail("user@workflow.local");
        orgUser.setDisplayName("Org User");
        orgUser.setPlatformAdmin(false);
        userAccountRepository.save(orgUser);

        OrganizationMembership orgUserMem = membershipRepository
                .findByUserIdAndOrganizationId(orgUser.getId(), "demo-org")
                .orElseGet(() -> {
                    OrganizationMembership m = new OrganizationMembership();
                    m.setId(new ObjectId());
                    m.setUserId(orgUser.getId());
                    m.setOrganizationId("demo-org");
                    return m;
                });
        orgUserMem.setRole(OrganizationRole.MEMBER);
        membershipRepository.save(orgUserMem);
    }

    private void migrateOrphanWorkflowDefinitions(String defaultOrgId) {
        Set<String> validOrgIds = getValidOrganizationIds();
        List<WorkflowDefinition> definitions = workflowDefinitionRepository.findAll();
        int migrated = 0;
        for (WorkflowDefinition def : definitions) {
            String orgId = def.getOrganizationId();
            if (orgId == null || orgId.isBlank() || !validOrgIds.contains(orgId.trim())) {
                def.setOrganizationId(defaultOrgId);
                workflowDefinitionRepository.save(def);
                migrated++;
                log.info("Migrated workflow definition '{}' ('{}') to organization '{}'",
                        def.getId(), def.getName(), defaultOrgId);
            }
        }
        if (migrated > 0) {
            log.info("Successfully migrated {} workflow definition(s) to organization '{}'",
                    migrated, defaultOrgId);
        }
    }

    private void migrateOrphanCredentials(String defaultOrgId) {
        Set<String> validOrgIds = getValidOrganizationIds();
        List<IntegrationCredential> credentials = credentialRepository.findAll();
        int migrated = 0;
        for (IntegrationCredential cred : credentials) {
            if (cred.getCredentialScope() == CredentialScope.PLATFORM) {
                continue; // Platform credentials do not have a tenant organization
            }
            String orgId = cred.getOrganizationId();
            boolean needsUpdate = false;
            if (orgId == null || orgId.isBlank() || !validOrgIds.contains(orgId.trim())) {
                cred.setOrganizationId(defaultOrgId);
                needsUpdate = true;
            }
            if (cred.getCredentialScope() == null) {
                cred.setCredentialScope(CredentialScope.ORG_SHARED);
                needsUpdate = true;
            }
            if (needsUpdate) {
                credentialRepository.save(cred);
                migrated++;
                log.info("Migrated integration credential '{}' ('{}') to organization '{}'",
                        cred.getId(), cred.getName(), defaultOrgId);
            }
        }
        if (migrated > 0) {
            log.info("Successfully migrated {} credential(s) to organization '{}'",
                    migrated, defaultOrgId);
        }
    }

    private void migrateOrphanExecutions(String defaultOrgId) {
        Set<String> validOrgIds = getValidOrganizationIds();
        Map<String, String> workflowOrgMap = workflowDefinitionRepository.findAll().stream()
                .filter(w -> w.getId() != null && w.getOrganizationId() != null)
                .collect(Collectors.toMap(WorkflowDefinition::getId, WorkflowDefinition::getOrganizationId, (a, b) -> a));

        List<WorkflowExecution> executions = executionRepository.findAll();
        int migrated = 0;
        for (WorkflowExecution exec : executions) {
            String orgId = exec.getOrganizationId();
            if (orgId == null || orgId.isBlank() || !validOrgIds.contains(orgId.trim())) {
                String targetOrg = defaultOrgId;
                if (exec.getWorkflowDefinitionId() != null) {
                    String wfOrg = workflowOrgMap.get(exec.getWorkflowDefinitionId());
                    if (wfOrg != null && validOrgIds.contains(wfOrg)) {
                        targetOrg = wfOrg;
                    }
                }
                exec.setOrganizationId(targetOrg);
                executionRepository.save(exec);
                migrated++;
            }
        }
        if (migrated > 0) {
            log.info("Successfully migrated {} workflow execution(s) to organization '{}'",
                    migrated, defaultOrgId);
        }
    }

    private void migrateOrphanIntegrations(String defaultOrgId) {
        Set<String> validOrgIds = getValidOrganizationIds();
        List<IntegrationEntity> integrations = integrationRepository.findAll();
        int migrated = 0;
        for (IntegrationEntity integration : integrations) {
            String orgId = integration.getOrganizationId();
            if (orgId == null || orgId.isBlank() || !validOrgIds.contains(orgId.trim())) {
                integration.setOrganizationId(defaultOrgId);
                integrationRepository.save(integration);
                migrated++;
            }
        }
        if (migrated > 0) {
            log.info("Successfully migrated {} integration(s) to organization '{}'", migrated, defaultOrgId);
        }
    }

    private void migrateOrphanForms(String defaultOrgId) {
        Set<String> validOrgIds = getValidOrganizationIds();
        List<FormRegistrationEntity> registrations = formRegistrationRepository.findAll();
        int regMigrated = 0;
        for (FormRegistrationEntity reg : registrations) {
            String orgId = reg.getOrganizationId();
            if (orgId == null || orgId.isBlank() || !validOrgIds.contains(orgId.trim())) {
                reg.setOrganizationId(defaultOrgId);
                formRegistrationRepository.save(reg);
                regMigrated++;
            }
        }
        if (regMigrated > 0) {
            log.info("Successfully migrated {} form registration(s) to organization '{}'", regMigrated, defaultOrgId);
        }

        List<FormSubmissionEntity> submissions = formSubmissionRepository.findAll();
        int subMigrated = 0;
        for (FormSubmissionEntity sub : submissions) {
            String orgId = sub.getOrganizationId();
            if (orgId == null || orgId.isBlank() || !validOrgIds.contains(orgId.trim())) {
                sub.setOrganizationId(defaultOrgId);
                formSubmissionRepository.save(sub);
                subMigrated++;
            }
        }
        if (subMigrated > 0) {
            log.info("Successfully migrated {} form submission(s) to organization '{}'", subMigrated, defaultOrgId);
        }
    }

    private void migrateOrphanConnectors(String defaultOrgId) {
        Set<String> validOrgIds = getValidOrganizationIds();
        List<ConnectorManifestEntity> manifests = connectorManifestRepository.findAll();
        int migrated = 0;
        for (ConnectorManifestEntity manifest : manifests) {
            if (manifest.getScope() == ConnectorScope.ORGANIZATION) {
                String orgId = manifest.getOrganizationId();
                if (orgId == null || orgId.isBlank() || !validOrgIds.contains(orgId.trim())) {
                    manifest.setOrganizationId(defaultOrgId);
                    connectorManifestRepository.save(manifest);
                    migrated++;
                }
            }
        }
        if (migrated > 0) {
            log.info("Successfully migrated {} connector manifest(s) to organization '{}'", migrated, defaultOrgId);
        }
    }

    private void migrateOrphanSessions(String defaultOrgId) {
        Set<String> validOrgIds = getValidOrganizationIds();
        List<AuthSession> sessions = authSessionRepository.findAll();
        int migrated = 0;
        for (AuthSession session : sessions) {
            String activeOrgId = session.getActiveOrganizationId();
            boolean needsUpdate = activeOrgId == null || activeOrgId.isBlank() || !validOrgIds.contains(activeOrgId.trim());
            if (!needsUpdate && session.getUserId() != null) {
                long activeOrgWorkflows = workflowDefinitionRepository.countByOrganizationId(activeOrgId);
                long defaultOrgWorkflows = workflowDefinitionRepository.countByOrganizationId(defaultOrgId);
                if (activeOrgWorkflows == 0 && defaultOrgWorkflows > 0) {
                    needsUpdate = true;
                }
            }
            if (needsUpdate) {
                session.setActiveOrganizationId(defaultOrgId);
                authSessionRepository.save(session);
                migrated++;
            }
        }
        if (migrated > 0) {
            log.info("Successfully updated {} auth session(s) to organization '{}'", migrated, defaultOrgId);
        }
    }

    private void migrateOrphanOAuthStates(String defaultOrgId) {
        Set<String> validOrgIds = getValidOrganizationIds();
        List<OAuthState> states = oauthStateRepository.findAll();
        int migrated = 0;
        for (OAuthState state : states) {
            String orgId = state.getOrganizationId();
            if (orgId == null || orgId.isBlank() || !validOrgIds.contains(orgId.trim())) {
                state.setOrganizationId(defaultOrgId);
                oauthStateRepository.save(state);
                migrated++;
            }
        }
        if (migrated > 0) {
            log.info("Successfully updated {} in-flight OAuth state(s) to organization '{}'", migrated, defaultOrgId);
        }
    }

    private void ensureOrganizationSettingsInitialized() {
        List<Organization> orgs = organizationRepository.findAll();
        for (Organization org : orgs) {
            if (org.getSettings() == null) {
                org.setSettings(new HashMap<>());
                organizationRepository.save(org);
                log.info("Initialized settings map for organization '{}'", org.getId());
            }
        }
    }
}
