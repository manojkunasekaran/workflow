package com.app.api.dto;

import com.app.common.auth.OrganizationRole;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuthOrganizationSummary {
    private String id;
    private String name;
    private OrganizationRole role;
}
