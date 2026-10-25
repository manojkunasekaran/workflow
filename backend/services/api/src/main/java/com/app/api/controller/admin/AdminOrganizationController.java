package com.app.api.controller.admin;

import com.app.api.dto.CreateOrganizationRequest;
import com.app.api.dto.OrganizationResponse;
import com.app.api.dto.UpdateOrganizationRequest;
import com.app.api.context.AuthContext;
import com.app.api.service.auth.OrganizationMembershipService;
import com.app.api.service.auth.PlatformAdminAccess;
import com.app.api.service.organization.OrganizationService;
import com.app.common.auth.OrganizationRole;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Platform administrator endpoints for managing the organization fleet.
 */
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

    @GetMapping("/{id}")
    public OrganizationResponse get(@PathVariable String id) {
        platformAdminAccess.requirePlatformAdmin();
        return organizationService.getOrganization(id);
    }

    @PutMapping("/{id}")
    public OrganizationResponse update(@PathVariable String id, @RequestBody UpdateOrganizationRequest request) {
        platformAdminAccess.requirePlatformAdmin();
        return organizationService.updateOrganization(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        platformAdminAccess.requirePlatformAdmin();
        organizationService.deleteOrganization(id);
    }
}
