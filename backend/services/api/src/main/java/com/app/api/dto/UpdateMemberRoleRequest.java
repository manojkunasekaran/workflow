package com.app.api.dto;

import com.app.common.auth.OrganizationRole;
import lombok.Data;

import jakarta.validation.constraints.NotNull;

/**
 * Request body for updating a member's role within an organization.
 */
@Data
public class UpdateMemberRoleRequest {
    @NotNull
    private OrganizationRole role;
}
