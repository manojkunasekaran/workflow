package com.app.common.model.settings;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserAppearanceSettings {
    private String themeMode;
    private String accentPresetId;
    private String density;
    private String radiusPreset;
}
