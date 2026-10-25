package com.app.api.dto;

import lombok.Data;

@Data
public class OrgAppearanceUpdateRequest {
    private String accentPresetId;
    private String logoUrl;
    private Boolean lockAccent;
}
