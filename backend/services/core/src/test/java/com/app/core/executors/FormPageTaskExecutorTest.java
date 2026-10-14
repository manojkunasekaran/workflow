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
import com.app.common.model.task.execution.FormPageExecutionData;
import com.app.common.model.task.execution.TaskExecutionResult;
import com.app.common.model.task.parameters.FormPageTaskParameters;
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
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FormPageTaskExecutorTest {

    @Mock
    private WorkflowTaskExecutionRepository taskExecutionRepository;

    private FormPageTaskExecutor executor;
    private WorkflowTask task;
    private WorkflowExecution execution;

    @BeforeEach
    void setUp() {
        executor = new FormPageTaskExecutor(taskExecutionRepository);

        FormFieldDefinition nameField = new FormFieldDefinition();
        nameField.setKey("name");
        nameField.setLabel("Name");
        nameField.setType(FormFieldType.TEXT);
        nameField.setRequired(true);

        FormPageDefinition page = new FormPageDefinition();
        page.setPageId("page1");
        page.setTitle("Tell us about you");
        page.setFields(List.of(nameField));

        FormSchema schema = new FormSchema();
        schema.setPages(List.of(page));

        FormPageTaskParameters params = new FormPageTaskParameters();
        params.setPage(schema);

        task = new WorkflowTask();
        task.setTaskId("form_page_1");
        task.setType(TaskType.FORM_PAGE);
        task.setParameters(params);

        execution = new WorkflowExecution();
        execution.setId("exec-1");
    }

    @Test
    void execute_initialRunPausesForInput() {
        when(taskExecutionRepository.findAllByWorkflowExecutionId("exec-1")).thenReturn(List.of());

        TaskExecutionResult result = executor.execute(task, execution, ExecutionContext.builder().build());

        assertEquals(TaskExecutionResult.Status.PAUSED, result.getStatus());
        FormPageExecutionData data = (FormPageExecutionData) result.getExecutionData();
        assertEquals(false, data.isSubmitted());
    }

    @Test
    void execute_afterSubmissionCompletesWithAnswers() {
        FormPageExecutionData submittedData = FormPageExecutionData.builder()
                .submitted(true)
                .answers(Map.of("name", "Ada"))
                .build();

        WorkflowTaskExecution prior = new WorkflowTaskExecution();
        prior.setTaskDefinitionId("form_page_1");
        prior.setTaskType("FORM_PAGE");
        prior.setStatus(TaskExecutionStatus.COMPLETED);
        prior.setEndTime(Instant.now());
        prior.setExecutionData(submittedData);

        when(taskExecutionRepository.findAllByWorkflowExecutionId("exec-1")).thenReturn(List.of(prior));

        TaskExecutionResult result = executor.execute(task, execution, ExecutionContext.builder().build());

        assertEquals(TaskExecutionResult.Status.COMPLETED, result.getStatus());
        assertEquals("Ada", result.getOutput().get("name"));
    }
}
