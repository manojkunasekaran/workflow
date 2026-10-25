package com.app.api.controller;

import com.app.api.dto.UserAppearancePatchRequest;
import com.app.api.dto.UserAppearanceResponse;
import com.app.api.service.settings.UserAppearanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/users/me/appearance")
@RequiredArgsConstructor
public class UserAppearanceController {

    private final UserAppearanceService userAppearanceService;

    @GetMapping
    public UserAppearanceResponse getAppearance() {
        return userAppearanceService.getAppearance();
    }

    @PatchMapping
    public UserAppearanceResponse patchAppearance(@RequestBody UserAppearancePatchRequest request) {
        return userAppearanceService.patchAppearance(request);
    }
}
