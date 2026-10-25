package com.app.api.controller.admin;

import com.app.api.dto.OrgAppearanceResponse;
import com.app.api.dto.OrgAppearanceUpdateRequest;
import com.app.api.service.organization.OrganizationAdminAccess;
import com.app.api.service.settings.OrgAppearanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Organization branding update — restricted to organization administrators.
 *
 * <p>Moved from {@code /admin/settings/org-appearance} to {@code /settings/org-appearance}
 * to correctly reflect that this is an organization-level (not platform-level) operation.
 */
@RestController
@RequestMapping("/settings/org-appearance")
@RequiredArgsConstructor
public class AdminOrgAppearanceController {

    private final OrgAppearanceService orgAppearanceService;
    private final OrganizationAdminAccess orgAdminAccess;

    @PutMapping
    public OrgAppearanceResponse updateAppearance(@RequestBody OrgAppearanceUpdateRequest request) {
        orgAdminAccess.requireOrgAdmin();
        return orgAppearanceService.updateAppearance(request);
    }
}
