package com.app.api.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class UserAppearanceResponse {
    String themeMode;
    String accentPresetId;
    String density;
    String radiusPreset;
}
