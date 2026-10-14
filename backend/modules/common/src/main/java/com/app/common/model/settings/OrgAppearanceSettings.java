package com.app.common.model.settings;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Whitelisted org branding fields only — no arbitrary CSS.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrgAppearanceSettings {
    /** default | blue | teal | violet | slate */
    private String accentPresetId;
    private String logoUrl;
    /** When true, users cannot change accent preset or hue. */
    private boolean lockAccent;
}
