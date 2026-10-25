package com.app.api.dto;

import lombok.Data;

@Data
public class UserAppearancePatchRequest {
    private String themeMode;
    private String accentPresetId;
    private String density;
    private String radiusPreset;
}
