package com.app.core.executors;

import com.app.common.entity.WorkflowExecution;
import com.app.common.model.task.TaskType;
import com.app.common.model.task.WorkflowTask;
import com.app.common.model.task.execution.ScriptTaskExecutionData;
import com.app.common.model.task.execution.TaskExecutionResult;
import com.app.common.model.task.parameters.ScriptTaskParameters;
import com.app.core.model.ExecutionContext;
import com.app.core.service.TaskExecutor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import com.app.core.service.ScriptEvaluationService;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class ScriptTaskExecutor implements TaskExecutor {

    private final ScriptEvaluationService scriptEvaluationService;

    @Override
    public boolean canExecute(TaskType taskType) {
        return TaskType.SCRIPT_TASK == taskType;
    }

    @Override
    public TaskExecutionResult execute(WorkflowTask task, WorkflowExecution execution, ExecutionContext context) {
        ScriptTaskParameters params = (ScriptTaskParameters) task.getParameters();
        log.info("Executing script task: {}", task.getTaskId());

        try {
            // Build workflow context object for script using centralized method
            Map<String, Object> workflowData = context.getAllVariables();

            ScriptEvaluationService.ScriptResult scriptResult;
            if (params.getTimeoutMs() != null) {
                scriptResult = scriptEvaluationService.executeScript(params.getScript(), workflowData, params.getTimeoutMs());
            } else {
                scriptResult = scriptEvaluationService.executeScript(params.getScript(), workflowData);
            }

            Map<String, Object> output = new HashMap<>();
            output.put("result", scriptResult.data());

            return TaskExecutionResult.builder()
                    .status(TaskExecutionResult.Status.COMPLETED)
                    .output(output)
                    .executionData(ScriptTaskExecutionData.builder()
                            .language(params.getLanguage())
                            .result(scriptResult.data())
                            .logs(scriptResult.logs())
                            .build())
                    .build();

        } catch (Exception e) {
            log.error("Script execution failed for task {}: {}", task.getTaskId(), e.getMessage(), e);
            return TaskExecutionResult.builder()
                    .status(TaskExecutionResult.Status.FAILED)
                    .errorMessage("Script execution failed: " + e.getMessage())
                    .executionData(ScriptTaskExecutionData.builder()
                            .error(e.getClass().getSimpleName() + ": " + e.getMessage())
                            .build())
                    .build();
        }
    }

}
