package com.app.api.controller;

import com.app.api.dto.form.FormSubmissionDto;
import com.app.api.service.form.FormSubmissionQueryService;
import com.app.api.service.organization.OrganizationAccess;
import com.app.persistence.repository.FormSubmissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/workflows/{workflowDefinitionId}/form-submissions")
@RequiredArgsConstructor
public class FormSubmissionController {

    private final OrganizationAccess organizationAccess;
    private final FormSubmissionRepository submissionRepository;
    private final FormSubmissionQueryService submissionQueryService;

    @GetMapping
    public Page<FormSubmissionDto> listSubmissions(
            @PathVariable String workflowDefinitionId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        String organizationId = organizationAccess.requireOrganizationId();
        return submissionQueryService.mapPage(submissionRepository.findByOrganizationIdAndWorkflowDefinitionId(
                organizationId, workflowDefinitionId, pageable));
    }
}
