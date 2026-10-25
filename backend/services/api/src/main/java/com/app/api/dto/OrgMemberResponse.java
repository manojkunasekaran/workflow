package com.app.api.dto;

import com.app.common.auth.OrganizationRole;
import lombok.Builder;
import lombok.Value;

import java.time.Instant;

/**
 * Represents a single member of an organization, returned from member listing and management APIs.
 */
@Value
@Builder
public class OrgMemberResponse {
    /** Membership record ID (used as the key for role updates and removals). */
    String membershipId;
    String userId;
    String email;
    String displayName;
    String pictureUrl;
    OrganizationRole role;
    /** Whether this member is also a global platform administrator. */
    boolean platformAdmin;
    Instant joinedAt;
}
