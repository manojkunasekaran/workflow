package com.app.api.controller;

import com.app.api.dto.AssignUseCaseRequest;
import com.app.api.dto.CreateIntegrationRequest;
import com.app.api.dto.IntegrationResponse;
import com.app.api.dto.UpdateIntegrationRequest;
import com.app.api.service.IntegrationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * REST controller for managing Integrations.
 */
@RestController
@RequestMapping("/integrations")
@RequiredArgsConstructor
public class IntegrationController {

    private final IntegrationService integrationService;

    /**
     * Create a new integration.
     * @param request the create request
     * @return the created integration
     */
    @PostMapping
    public ResponseEntity<IntegrationResponse> createIntegration(@RequestBody @Valid CreateIntegrationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(integrationService.createIntegration(request));
    }

    /**
     * List all accessible integrations.
     * @return list of integrations
     */
    @GetMapping
    public ResponseEntity<List<IntegrationResponse>> listIntegrations() {
        return ResponseEntity.ok(integrationService.listIntegrations());
    }

    /**
     * Get an integration by ID.
     * @param id the integration ID
     * @return the integration
     */
    @GetMapping("/{id}")
    public ResponseEntity<IntegrationResponse> getIntegration(@PathVariable String id) {
        return ResponseEntity.ok(integrationService.getIntegration(id));
    }

    /**
     * Update an integration by ID.
     * @param id the integration ID
     * @param request the update request
     * @return the updated integration
     */
    @PutMapping("/{id}")
    public ResponseEntity<IntegrationResponse> updateIntegration(@PathVariable String id, @RequestBody @Valid UpdateIntegrationRequest request) {
        return ResponseEntity.ok(integrationService.updateIntegration(id, request));
    }

    /**
     * Delete a DRAFT integration by ID.
     * @param id the integration ID
     * @return no content
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteIntegration(@PathVariable String id) {
        integrationService.deleteIntegration(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Publish an integration, making it visible based on scope.
     * @param id the integration ID
     * @return success
     */
    @PostMapping("/{id}/publish")
    public ResponseEntity<Void> publishIntegration(@PathVariable String id) {
        integrationService.publishIntegration(id);
        return ResponseEntity.ok().build();
    }

    /**
     * Deprecate an integration.
     * @param id the integration ID
     * @return success
     */
    @PostMapping("/{id}/deprecate")
    public ResponseEntity<Void> deprecateIntegration(@PathVariable String id) {
        integrationService.deprecateIntegration(id);
        return ResponseEntity.ok().build();
    }

    /**
     * Assign a workflow as a use case for an integration.
     * @param id the integration ID
     * @param request the assignment details
     * @return the updated integration
     */
    @PostMapping("/{id}/use-cases")
    public ResponseEntity<IntegrationResponse> assignUseCase(@PathVariable String id, @RequestBody @Valid AssignUseCaseRequest request) {
        return ResponseEntity.ok(integrationService.assignUseCase(id, request));
    }

    /**
     * Remove a workflow use case from an integration.
     * @param id the integration ID
     * @param workflowId the workflow ID to remove
     * @return no content
     */
    @DeleteMapping("/{id}/use-cases/{workflowId}")
    public ResponseEntity<Void> removeUseCase(@PathVariable String id, @PathVariable String workflowId) {
        integrationService.removeUseCase(id, workflowId);
        return ResponseEntity.noContent().build();
    }
}
