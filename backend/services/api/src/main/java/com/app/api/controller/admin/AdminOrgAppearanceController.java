package com.app.api.controller.admin;

import com.app.api.dto.OrgAppearanceResponse;
import com.app.api.dto.OrgAppearanceUpdateRequest;
import com.app.api.service.settings.OrgAppearanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Organization branding updates — admin-only surface (no auth layer yet; path matches admin API convention).
 */
@RestController
@RequestMapping("/admin/settings/org-appearance")
@RequiredArgsConstructor
public class AdminOrgAppearanceController {

    private final OrgAppearanceService orgAppearanceService;

    @PutMapping
    public OrgAppearanceResponse updateAppearance(@RequestBody OrgAppearanceUpdateRequest request) {
        return orgAppearanceService.updateAppearance(request);
    }
}
