package com.app.api.controller;

import com.app.api.dto.OrgAppearanceResponse;
import com.app.api.service.settings.OrgAppearanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/settings/org-appearance")
@RequiredArgsConstructor
public class OrgAppearanceController {

    private final OrgAppearanceService orgAppearanceService;

    @GetMapping
    public OrgAppearanceResponse getAppearance() {
        return orgAppearanceService.getAppearance();
    }
}
