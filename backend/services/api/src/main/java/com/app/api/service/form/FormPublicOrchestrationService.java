package com.app.api.service.form;

import com.app.api.context.OrganizationContext;
import com.app.api.dto.form.FormPublicViewDto;
import com.app.api.dto.form.FormSubmitRequest;
import com.app.api.dto.form.FormSubmitResponse;
import com.app.api.service.WorkflowExecutionService;
import com.app.common.constant.TaskExecutionStatus;
import com.app.common.constant.WorkflowExecutionStatus;
import com.app.common.entity.WorkflowDefinition;
import com.app.common.entity.WorkflowExecution;
import com.app.common.entity.WorkflowTaskExecution;
import com.app.common.exception.ResourceNotFoundException;
import com.app.common.exception.ValidationException;
import com.app.common.model.form.FormAnswerValidator;
import com.app.common.model.form.FormPageDefinition;
import com.app.common.model.form.FormSlugUtils;
import com.app.common.model.task.TaskType;
import com.app.common.model.task.WorkflowTask;
import com.app.common.model.task.execution.FormExecutionData;
import com.app.common.model.task.parameters.FormTaskParameters;
import com.app.common.model.trigger.FormEnvironment;
import com.app.common.model.trigger.FormTriggerConfig;
import com.app.common.model.trigger.TriggerConfig;
import com.app.common.model.trigger.TriggerType;
import com.app.common.model.variable.VariableType;
import com.app.common.model.variable.VariableValue;
import com.app.persistence.entity.FormRegistrationEntity;
import com.app.persistence.entity.FormSubmissionEntity;
import com.app.persistence.repository.FormRegistrationRepository;
import com.app.persistence.repository.WorkflowDefinitionRepository;
import com.app.persistence.repository.WorkflowExecutionRepository;
import com.app.persistence.repository.WorkflowTaskExecutionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class FormPublicOrchestrationService {

    private final FormRegistrationRepository registrationRepository;
    private final WorkflowDefinitionRepository definitionRepository;
    private final WorkflowExecutionRepository executionRepository;
    private final WorkflowTaskExecutionRepository taskExecutionRepository;
    private final WorkflowExecutionService executionService;
    private final FormSessionTokenService sessionTokenService;
    private final FormStepResponseService formStepResponseService;
    private final FormSubmissionStoreService submissionStoreService;

    public FormPublicViewDto getPublicForm(String slug, FormEnvironment environment) {
        ResolvedForm resolved = resolveActiveRegistration(slug, environment);
        WorkflowDefinition definition = loadDefinition(resolved.registration());
        FormTriggerConfig form = requireFormTrigger(definition).getForm();

        FormPageDefinition landing = form.getLandingPage() != null ? form.getLandingPage().firstPage() : null;
        if (landing == null) {
            throw new ValidationException("Form landing page is not configured");
        }

        return FormPublicViewDto.builder()
                .phase(FormPublicViewDto.Phase.LANDING)
                .workflowName(definition.getName())
                .page(landing)
                .build();
    }

    public FormSubmitResponse submitLanding(String slug, FormEnvironment environment, FormSubmitRequest request) {
        ResolvedForm resolved = resolveActiveRegistration(slug, environment);
        WorkflowDefinition definition = loadDefinition(resolved.registration());
        FormTriggerConfig form = requireFormTrigger(definition).getForm();
        FormPageDefinition landing = form.getLandingPage().firstPage();
        FormAnswerValidator.validatePage(landing, request.getAnswers());

        Map<String, VariableValue> inputs = toVariableMap(request.getAnswers());
        try {
            OrganizationContext.setOrganizationId(resolved.registration().getOrganizationId());
            WorkflowExecution execution = executionService.triggerExecutionForOrganization(
                    definition.getId(),
                    resolved.registration().getOrganizationId(),
                    inputs,
                    com.app.common.constant.ExecutionType.ASYNC,
                    TriggerType.FORM);
            execution = waitForSettle(execution.getId());

            FormSubmissionEntity submission = submissionStoreService.ensureSubmission(
                    resolved.registration().getOrganizationId(),
                    definition.getId(),
                    execution.getId(),
                    environment.name());
            submissionStoreService.appendStep(
                    submission,
                    FormSubmissionStoreService.stepIdForLanding(),
                    null,
                    request.getAnswers());

            FormPublicViewDto view = buildViewForExecution(execution, definition, resolved.registration());
            return FormSubmitResponse.builder().next(view).build();
        } finally {
            OrganizationContext.clear();
        }
    }

    public FormSubmitResponse submitStep(String slug, FormEnvironment environment, FormSubmitRequest request) {
        ResolvedForm resolved = resolveActiveRegistration(slug, environment);
        FormSessionTokenService.ParsedFormSession session =
                sessionTokenService.parseAndValidate(resolved.registration().getSessionSigningSecret(), request.getSessionToken());

        WorkflowExecution execution = executionRepository.findById(session.executionId())
                .orElseThrow(() -> new ResourceNotFoundException("WorkflowExecution", session.executionId()));
        if (!resolved.registration().getOrganizationId().equals(execution.getOrganizationId())) {
            throw new ValidationException("Invalid form session");
        }
        if (!WorkflowExecutionStatus.PAUSED.equals(execution.getStatus())) {
            throw new ValidationException("Form execution is not waiting for input");
        }
        if (!session.currentTaskId().equals(execution.getCurrentTaskId())) {
            throw new ValidationException("Form session does not match current step");
        }

        WorkflowDefinition definition = loadDefinition(resolved.registration());
        WorkflowTask task = findTask(definition, session.currentTaskId());
        if (task.getType() != TaskType.FORM || !(task.getParameters() instanceof FormTaskParameters params)) {
            throw new ValidationException("Current step is not a form task");
        }
        if (params.getPage() == null) {
            throw new ValidationException("Form task page is not configured");
        }
        FormPageDefinition page = params.getPage().firstPage();
        if (page == null) {
            throw new ValidationException("Form task page is not configured");
        }

        WorkflowTaskExecution pausedExecution = findPausedFormTaskExecution(execution.getId(), session.currentTaskId());

        try {
            OrganizationContext.setOrganizationId(resolved.registration().getOrganizationId());
            formStepResponseService.recordFormPageSubmission(
                    execution.getId(), pausedExecution.getId(), page, request.getAnswers());
            executionService.resumeAfterFormStep(execution.getId(), pausedExecution.getId());
            execution = waitForSettle(execution.getId());

            FormSubmissionEntity submission = submissionStoreService.ensureSubmission(
                    resolved.registration().getOrganizationId(),
                    definition.getId(),
                    execution.getId(),
                    environment.name());
            submissionStoreService.appendStep(
                    submission,
                    FormSubmissionStoreService.stepIdForPage(page),
                    session.currentTaskId(),
                    request.getAnswers());

            FormPublicViewDto view = buildViewForExecution(execution, definition, resolved.registration());
            return FormSubmitResponse.builder().next(view).build();
        } finally {
            OrganizationContext.clear();
        }
    }

    private FormPublicViewDto buildViewForExecution(
            WorkflowExecution execution,
            WorkflowDefinition definition,
            FormRegistrationEntity registration) {

        if (WorkflowExecutionStatus.PAUSED.equals(execution.getStatus())) {
            String currentTaskId = execution.getCurrentTaskId();
            if (currentTaskId != null) {
                WorkflowTask task = findTask(definition, currentTaskId);
                if (task.getType() == TaskType.FORM && task.getParameters() instanceof FormTaskParameters params) {
                    if (params.getPage() != null && params.getPage().firstPage() != null) {
                        FormPageDefinition page = params.getPage().firstPage();
                        String token = sessionTokenService.issueToken(
                                registration.getSessionSigningSecret(), execution.getId(), currentTaskId);
                        return FormPublicViewDto.builder()
                                .phase(FormPublicViewDto.Phase.STEP)
                                .workflowName(definition.getName())
                                .page(page)
                                .sessionToken(token)
                                .executionId(execution.getId())
                                .build();
                    }
                }
            }
        }

        FormExecutionData completion = findLatestFormCompletion(execution.getId());
        if (completion != null) {
            return FormPublicViewDto.builder()
                    .phase(FormPublicViewDto.Phase.COMPLETE)
                    .workflowName(definition.getName())
                    .completionType(completion.getEndType())
                    .completionMessage(completion.getMessage())
                    .redirectUrl(completion.getRedirectUrl())
                    .customHtml(completion.getCustomHtml())
                    .executionId(execution.getId())
                    .build();
        }

        if (WorkflowExecutionStatus.COMPLETED.equals(execution.getStatus())
                || WorkflowExecutionStatus.FAILED.equals(execution.getStatus())) {
            FormTriggerConfig form = requireFormTrigger(definition).getForm();
            return FormPublicViewDto.builder()
                    .phase(FormPublicViewDto.Phase.COMPLETE)
                    .workflowName(definition.getName())
                    .completionMessage(form.getCompletionMessage())
                    .redirectUrl(form.getRedirectUrl())
                    .executionId(execution.getId())
                    .build();
        }

        throw new ValidationException("Form is processing, retry shortly");
    }

    private FormExecutionData findLatestFormCompletion(String executionId) {
        List<WorkflowTaskExecution> tasks = taskExecutionRepository.findAllByWorkflowExecutionId(executionId);
        for (int i = tasks.size() - 1; i >= 0; i--) {
            WorkflowTaskExecution te = tasks.get(i);
            if ("FORM".equals(te.getTaskType()) && te.getExecutionData() instanceof FormExecutionData data) {
                if (data.getEndType() != null) {
                    return data;
                }
            }
        }
        return null;
    }

    private WorkflowTaskExecution findPausedFormTaskExecution(String executionId, String taskDefinitionId) {
        return taskExecutionRepository.findAllByWorkflowExecutionId(executionId).stream()
                .filter(te -> taskDefinitionId.equals(te.getTaskDefinitionId()))
                .filter(te -> "FORM".equals(te.getTaskType()))
                .filter(te -> TaskExecutionStatus.PAUSED.equals(te.getStatus()))
                .findFirst()
                .orElseThrow(() -> new ValidationException("No paused form step found"));
    }

    private WorkflowExecution waitForSettle(String executionId) {
        for (int i = 0; i < 25; i++) {
            WorkflowExecution current = executionRepository.findById(executionId)
                    .orElseThrow(() -> new ResourceNotFoundException("WorkflowExecution", executionId));
            if (WorkflowExecutionStatus.PAUSED.equals(current.getStatus())
                    || WorkflowExecutionStatus.COMPLETED.equals(current.getStatus())
                    || WorkflowExecutionStatus.FAILED.equals(current.getStatus())) {
                return current;
            }
            try {
                Thread.sleep(200);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
        return executionRepository.findById(executionId)
                .orElseThrow(() -> new ResourceNotFoundException("WorkflowExecution", executionId));
    }

    private static Map<String, VariableValue> toVariableMap(Map<String, Object> answers) {
        Map<String, VariableValue> inputs = new HashMap<>();
        if (answers == null) {
            return inputs;
        }
        for (Map.Entry<String, Object> entry : answers.entrySet()) {
            Object value = entry.getValue();
            VariableType type = VariableType.STRING;
            if (value instanceof Number) {
                type = VariableType.NUMBER;
            } else if (value instanceof Boolean) {
                type = VariableType.BOOLEAN;
            } else if (value != null && !(value instanceof String)) {
                type = VariableType.OBJECT;
            }
            inputs.put(entry.getKey(), VariableValue.builder()
                    .name(entry.getKey())
                    .type(type)
                    .value(value)
                    .build());
        }
        return inputs;
    }

    private WorkflowTask findTask(WorkflowDefinition definition, String taskId) {
        return definition.getTasks().stream()
                .filter(t -> taskId.equals(t.getTaskId()))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("WorkflowTask", taskId));
    }

    private TriggerConfig requireFormTrigger(WorkflowDefinition definition) {
        if (definition.getTrigger() == null || definition.getTrigger().getType() != TriggerType.FORM) {
            throw new ValidationException("Workflow is not a form workflow");
        }
        return definition.getTrigger();
    }

    private WorkflowDefinition loadDefinition(FormRegistrationEntity registration) {
        return definitionRepository.findById(registration.getWorkflowDefinitionId())
                .orElseThrow(() -> new ResourceNotFoundException("WorkflowDefinition", registration.getWorkflowDefinitionId()));
    }

    private ResolvedForm resolveActiveRegistration(String slug, FormEnvironment environment) {
        String registrationSlug = FormSlugUtils.registrationSlug(slug, environment);
        FormRegistrationEntity registration = registrationRepository
                .findByEnvironmentAndSlugAndActiveTrue(environment, registrationSlug)
                .orElseThrow(() -> new ResourceNotFoundException("FormRegistration", slug));
        return new ResolvedForm(registration);
    }

    private record ResolvedForm(FormRegistrationEntity registration) {}
}
