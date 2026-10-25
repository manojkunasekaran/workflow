package com.app.api.dto;

import com.app.common.auth.OrganizationRole;
import lombok.Data;

import jakarta.validation.constraints.NotBlank;

/**
 * Request body for adding an existing user to an organization by their user ID.
 *
 * <p>Note: In a full production system this would be an email-based invite flow.
 * For now it accepts a userId directly, assuming the user already has an account.
 */
@Data
public class InviteMemberRequest {
    /** ID of the existing user account to add to the organization. */
    @NotBlank
    private String userId;
    /** Role to assign. Defaults to MEMBER if not provided. */
    private OrganizationRole role = OrganizationRole.MEMBER;
}
