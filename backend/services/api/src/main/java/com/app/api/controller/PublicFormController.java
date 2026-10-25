package com.app.api.controller;

import com.app.api.dto.form.FormPublicViewDto;
import com.app.api.dto.form.FormSubmitRequest;
import com.app.api.dto.form.FormSubmitResponse;
import com.app.api.service.form.FormPublicOrchestrationService;
import com.app.common.model.trigger.FormEnvironment;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/forms/public")
@RequiredArgsConstructor
public class PublicFormController {

    private final FormPublicOrchestrationService orchestrationService;

    @GetMapping("/{slug}")
    public FormPublicViewDto getProductionForm(@PathVariable String slug) {
        return orchestrationService.getPublicForm(slug, FormEnvironment.PROD);
    }

    @PostMapping("/{slug}/submit")
    public FormSubmitResponse submitProductionLanding(@PathVariable String slug, @RequestBody FormSubmitRequest request) {
        if (request.getSessionToken() != null && !request.getSessionToken().isBlank()) {
            return orchestrationService.submitStep(slug, FormEnvironment.PROD, request);
        }
        return orchestrationService.submitLanding(slug, FormEnvironment.PROD, request);
    }

    @GetMapping("/test/{slug}")
    public FormPublicViewDto getTestForm(@PathVariable String slug) {
        return orchestrationService.getPublicForm(slug, FormEnvironment.TEST);
    }

    @PostMapping("/test/{slug}/submit")
    public FormSubmitResponse submitTest(@PathVariable String slug, @RequestBody FormSubmitRequest request) {
        if (request.getSessionToken() != null && !request.getSessionToken().isBlank()) {
            return orchestrationService.submitStep(slug, FormEnvironment.TEST, request);
        }
        return orchestrationService.submitLanding(slug, FormEnvironment.TEST, request);
    }
}
