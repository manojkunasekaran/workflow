package com.app.api.controller.admin;

import com.app.api.dto.CreateOrganizationRequest;
import com.app.api.dto.OrganizationResponse;
import com.app.api.context.AuthContext;
import com.app.api.service.auth.OrganizationMembershipService;
import com.app.api.service.auth.PlatformAdminAccess;
import com.app.api.service.organization.OrganizationService;
import com.app.common.auth.OrganizationRole;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Platform admin — create and list organizations. */
@RestController
@RequestMapping("/admin/organizations")
@RequiredArgsConstructor
public class AdminOrganizationController {

    private final OrganizationService organizationService;
    private final PlatformAdminAccess platformAdminAccess;
    private final OrganizationMembershipService membershipService;

    @PostMapping
    public OrganizationResponse create(@RequestBody CreateOrganizationRequest request) {
        platformAdminAccess.requirePlatformAdmin();
        OrganizationResponse created = organizationService.createOrganization(request);
        ObjectId userId = AuthContext.requireUserId();
        membershipService.addMembership(userId, created.getId(), OrganizationRole.ORGANIZATION_ADMIN);
        return created;
    }

    @GetMapping
    public List<OrganizationResponse> list() {
        platformAdminAccess.requirePlatformAdmin();
        return organizationService.listOrganizations();
    }
}
