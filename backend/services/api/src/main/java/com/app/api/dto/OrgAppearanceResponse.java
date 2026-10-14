package com.app.api.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class OrgAppearanceResponse {
    String accentPresetId;
    String logoUrl;
    boolean lockAccent;
}
