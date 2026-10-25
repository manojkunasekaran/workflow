package com.app.core.executors;

import com.app.common.constant.TaskExecutionStatus;
import com.app.common.entity.WorkflowExecution;
import com.app.common.entity.WorkflowTaskExecution;
import com.app.common.model.form.FormFieldDefinition;
import com.app.common.model.form.FormFieldType;
import com.app.common.model.form.FormPageDefinition;
import com.app.common.model.form.FormSchema;
import com.app.common.model.task.TaskType;
import com.app.common.model.task.WorkflowTask;
import com.app.common.model.task.execution.FormExecutionData;
import com.app.common.model.task.execution.TaskExecutionResult;
import com.app.common.model.task.parameters.FormTaskParameters;
import com.app.core.model.ExecutionContext;
import com.app.persistence.repository.WorkflowTaskExecutionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FormTaskExecutorTest {

    @Mock
    private WorkflowTaskExecutionRepository taskExecutionRepository;

    private FormTaskExecutor executor;
    private WorkflowExecution execution;
    private FormSchema sampleSchema;

    @BeforeEach
    void setUp() {
        executor = new FormTaskExecutor(taskExecutionRepository);

        execution = new WorkflowExecution();
        execution.setId("exec-1");

        FormFieldDefinition nameField = new FormFieldDefinition();
        nameField.setKey("name");
        nameField.setLabel("Name");
        nameField.setType(FormFieldType.TEXT);
        nameField.setRequired(true);

        FormPageDefinition page = new FormPageDefinition();
        page.setPageId("page1");
        page.setTitle("User Info");
        page.setFields(List.of(nameField));

        sampleSchema = new FormSchema();
        sampleSchema.setPages(List.of(page));
    }

    @Test
    void canExecute_matchesOnlyForm() {
        assertTrue(executor.canExecute(TaskType.FORM));
        assertFalse(executor.canExecute(TaskType.HTTP_TASK));
    }

    @Test
    void execute_initialRunPausesForInput() {
        FormTaskParameters params = FormTaskParameters.builder()
                .page(sampleSchema)
                .build();

        WorkflowTask task = taskWith("form_input", params);
        when(taskExecutionRepository.findAllByWorkflowExecutionId("exec-1")).thenReturn(List.of());

        TaskExecutionResult result = executor.execute(task, execution, ExecutionContext.builder().build());

        assertEquals(TaskExecutionResult.Status.PAUSED, result.getStatus());
        assertTrue(result.getExecutionData() instanceof FormExecutionData);
        FormExecutionData data = (FormExecutionData) result.getExecutionData();
        assertFalse(data.isSubmitted());
        assertEquals(sampleSchema, data.getPageSchema());
    }

    @Test
    void execute_afterSubmissionCompletesWithAnswers() {
        FormTaskParameters params = FormTaskParameters.builder()
                .page(sampleSchema)
                .build();

        WorkflowTask task = taskWith("form_input", params);

        FormExecutionData submittedData = FormExecutionData.builder()
                .submitted(true)
                .answers(Map.of("name", "Ada Lovelace"))
                .build();

        WorkflowTaskExecution prior = new WorkflowTaskExecution();
        prior.setTaskDefinitionId("form_input");
        prior.setTaskType("FORM");
        prior.setStatus(TaskExecutionStatus.COMPLETED);
        prior.setEndTime(Instant.now());
        prior.setExecutionData(submittedData);

        when(taskExecutionRepository.findAllByWorkflowExecutionId("exec-1")).thenReturn(List.of(prior));

        TaskExecutionResult result = executor.execute(task, execution, ExecutionContext.builder().build());

        assertEquals(TaskExecutionResult.Status.COMPLETED, result.getStatus());
        assertEquals("Ada Lovelace", result.getOutput().get("name"));
    }

    @Test
    void execute_withCompletionConfig_completesWithAnswersAndCompletionData() {
        FormTaskParameters params = FormTaskParameters.builder()
                .page(sampleSchema)
                .endType(FormTaskParameters.EndType.MESSAGE)
                .message("Submission received!")
                .build();

        WorkflowTask task = taskWith("form_input_complete", params);

        FormExecutionData submittedData = FormExecutionData.builder()
                .submitted(true)
                .answers(Map.of("name", "Charles Babbage"))
                .build();

        WorkflowTaskExecution prior = new WorkflowTaskExecution();
        prior.setTaskDefinitionId("form_input_complete");
        prior.setTaskType("FORM");
        prior.setStatus(TaskExecutionStatus.COMPLETED);
        prior.setEndTime(Instant.now());
        prior.setExecutionData(submittedData);

        when(taskExecutionRepository.findAllByWorkflowExecutionId("exec-1")).thenReturn(List.of(prior));

        TaskExecutionResult result = executor.execute(task, execution, ExecutionContext.builder().build());

        assertEquals(TaskExecutionResult.Status.COMPLETED, result.getStatus());
        assertEquals("Charles Babbage", result.getOutput().get("name"));
        assertEquals("MESSAGE", result.getOutput().get("formEndType"));
        assertEquals("Submission received!", result.getOutput().get("message"));

        FormExecutionData executionData = (FormExecutionData) result.getExecutionData();
        assertEquals(FormTaskParameters.EndType.MESSAGE, executionData.getEndType());
        assertEquals("Submission received!", executionData.getMessage());
    }

    private static WorkflowTask taskWith(String taskId, FormTaskParameters params) {
        WorkflowTask task = new WorkflowTask();
        task.setTaskId(taskId);
        task.setType(TaskType.FORM);
        task.setParameters(params);
        return task;
    }
}
