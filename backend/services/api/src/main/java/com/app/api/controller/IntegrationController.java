package com.app.api.controller;

import com.app.api.dto.AssignUseCaseRequest;
import com.app.api.dto.CreateIntegrationRequest;
import com.app.api.dto.IntegrationInsightsResponse;
import com.app.api.dto.IntegrationInsightsRetryResponse;
import com.app.api.dto.IntegrationResponse;
import com.app.api.dto.UseCaseInsightsResponse;
import com.app.api.dto.UpdateIntegrationRequest;
import com.app.api.service.IntegrationInsightsOperationsService;
import com.app.api.service.IntegrationInsightsService;
import com.app.api.service.IntegrationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;

/**
 * REST controller for managing Integrations.
 */
@RestController
@RequestMapping("/integrations")
@RequiredArgsConstructor
public class IntegrationController {

    private final IntegrationService integrationService;
    private final IntegrationInsightsService integrationInsightsService;
    private final IntegrationInsightsOperationsService integrationInsightsOperationsService;

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
     * Run volume and reliability metrics for an integration and its use cases.
     * Studio test runs (targetTaskId set) are excluded.
     */
    @GetMapping("/{id}/insights")
    public ResponseEntity<IntegrationInsightsResponse> getIntegrationInsights(@PathVariable String id) {
        return ResponseEntity.ok(integrationInsightsService.getInsights(id));
    }

    /**
     * Run metrics and recent executions for a single use case on an integration.
     */
    @GetMapping("/{id}/use-cases/{workflowId}/insights")
    public ResponseEntity<UseCaseInsightsResponse> getUseCaseInsights(
            @PathVariable String id,
            @PathVariable String workflowId) {
        return ResponseEntity.ok(integrationInsightsService.getUseCaseInsights(id, workflowId));
    }

    /**
     * Download metrics and recent runs for a single use case as CSV (studio test runs excluded).
     */
    @GetMapping(value = "/{id}/use-cases/{workflowId}/insights/export", produces = "text/csv")
    public ResponseEntity<byte[]> exportUseCaseInsights(
            @PathVariable String id,
            @PathVariable String workflowId) {
        byte[] body = integrationInsightsOperationsService.exportUseCaseInsightsCsv(id, workflowId);
        String filename = integrationInsightsOperationsService.exportUseCaseFilename(id, workflowId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(new MediaType("text", "csv", java.nio.charset.StandardCharsets.UTF_8))
                .body(body);
    }

    /**
     * Download integration and per–use-case insight metrics as CSV (studio test runs excluded).
     */
    @GetMapping(value = "/{id}/insights/export", produces = "text/csv")
    public ResponseEntity<byte[]> exportIntegrationInsights(@PathVariable String id) {
        byte[] body = integrationInsightsOperationsService.exportInsightsCsv(id);
        String filename = integrationInsightsOperationsService.exportFilename(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(new MediaType("text", "csv", java.nio.charset.StandardCharsets.UTF_8))
                .body(body);
    }

    /**
     * Re-queue failed workflow executions for this integration (most recent first, bounded batch).
     * Each retry creates a new execution with the same trigger inputs as the failed run.
     */
    @PostMapping("/{id}/insights/retry-failed")
    public ResponseEntity<IntegrationInsightsRetryResponse> retryFailedExecutions(
            @PathVariable String id,
            @RequestParam(required = false) String workflowDefinitionId) {
        IntegrationInsightsRetryResponse response = integrationInsightsOperationsService.retryFailedExecutions(
                id,
                Optional.ofNullable(workflowDefinitionId));
        return ResponseEntity.ok(response);
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
