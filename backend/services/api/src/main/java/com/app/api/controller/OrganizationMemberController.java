package com.app.api.controller;

import com.app.api.dto.InviteMemberRequest;
import com.app.api.dto.OrgMemberResponse;
import com.app.api.dto.UpdateMemberRoleRequest;
import com.app.api.service.organization.OrganizationAdminAccess;
import com.app.api.service.organization.OrganizationMemberService;
import lombok.RequiredArgsConstructor;
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
 * Manages members within the caller's active organization.
 *
 * <p>All mutation operations (add, update role, remove) are restricted to organization
 * administrators. Listing members is also restricted to org admins for privacy.
 *
 * <p>Authentication and organization context are established upstream by
 * {@code SessionOrganizationContextFilter}.
 */
@RestController
@RequestMapping("/organizations/members")
@RequiredArgsConstructor
public class OrganizationMemberController {

    private final OrganizationMemberService memberService;
    private final OrganizationAdminAccess orgAdminAccess;

    /**
     * Lists all members of the active organization.
     * Restricted to organization admins and platform admins.
     */
    @GetMapping
    public List<OrgMemberResponse> listMembers() {
        orgAdminAccess.requireOrgAdmin();
        return memberService.listMembers();
    }

    /**
     * Adds an existing user to the active organization.
     * Restricted to organization admins and platform admins.
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrgMemberResponse addMember(@RequestBody InviteMemberRequest request) {
        orgAdminAccess.requireOrgAdmin();
        return memberService.addMember(request);
    }

    /**
     * Updates the role of an existing member.
     * Restricted to organization admins and platform admins.
     */
    @PutMapping("/{membershipId}/role")
    public OrgMemberResponse updateMemberRole(
            @PathVariable String membershipId,
            @RequestBody UpdateMemberRoleRequest request) {
        orgAdminAccess.requireOrgAdmin();
        return memberService.updateMemberRole(membershipId, request.getRole());
    }

    /**
     * Removes a member from the active organization.
     * Restricted to organization admins and platform admins.
     */
    @DeleteMapping("/{membershipId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeMember(@PathVariable String membershipId) {
        orgAdminAccess.requireOrgAdmin();
        memberService.removeMember(membershipId);
    }
}
