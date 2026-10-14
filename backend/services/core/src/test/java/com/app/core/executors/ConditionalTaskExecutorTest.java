package com.app.core.executors;

import com.app.common.entity.WorkflowExecution;
import com.app.common.model.rule.EvaluationResult;
import com.app.common.model.task.TaskType;
import com.app.common.model.task.WorkflowTask;
import com.app.common.model.task.execution.ConditionalTaskExecutionData;
import com.app.common.model.task.execution.TaskExecutionResult;
import com.app.common.model.task.parameters.ConditionalTaskParameters;
import com.app.common.model.task.parameters.HttpTaskParameters;
import com.app.core.model.ExecutionContext;
import com.app.core.rule.RuleEvaluator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.doThrow;

@ExtendWith(MockitoExtension.class)
class ConditionalTaskExecutorTest {

    @Mock
    private RuleEvaluator ruleEvaluator;

    private ConditionalTaskExecutor executor;
    private WorkflowTask task;
    private ConditionalTaskParameters params;
    private ExecutionContext context;
    private WorkflowExecution execution;

    @BeforeEach
    void setUp() {
        executor = new ConditionalTaskExecutor(ruleEvaluator);

        ConditionalTaskParameters.Branch matched = new ConditionalTaskParameters.Branch();
        matched.setName("high");
        matched.setNextTaskId("task_high");
        matched.setExpression("true");

        ConditionalTaskParameters.Branch fallback = new ConditionalTaskParameters.Branch();
        fallback.setName("low");
        fallback.setNextTaskId("task_low");
        fallback.setExpression("false");

        params = new ConditionalTaskParameters();
        params.setBranches(List.of(matched, fallback));
        params.setDefaultNextTaskId("task_default");

        task = new WorkflowTask();
        task.setTaskId("cond_1");
        task.setType(TaskType.CONDITIONAL);
        task.setParameters(params);

        context = ExecutionContext.builder().build();
        execution = new WorkflowExecution();
    }

    @Test
    void execute_firstMatchingBranchSetsNextTaskId() {
        when(ruleEvaluator.evaluate(params.getBranches().get(0), context))
                .thenReturn(EvaluationResult.matched(List.of()));

        TaskExecutionResult result = executor.execute(task, execution, context);

        assertEquals(TaskExecutionResult.Status.COMPLETED, result.getStatus());
        assertEquals("task_high", result.getNextTaskId());
        ConditionalTaskExecutionData data = (ConditionalTaskExecutionData) result.getExecutionData();
        assertEquals("high", data.getMatchedBranch());
        assertEquals(1, data.getBranchesEvaluated());
    }

    @Test
    void execute_usesDefaultWhenNoBranchMatches() {
        when(ruleEvaluator.evaluate(any(ConditionalTaskParameters.Branch.class), any()))
                .thenReturn(EvaluationResult.notMatched(List.of()));

        TaskExecutionResult result = executor.execute(task, execution, context);

        assertEquals("task_default", result.getNextTaskId());
        ConditionalTaskExecutionData data = (ConditionalTaskExecutionData) result.getExecutionData();
        assertEquals("default", data.getMatchedBranch());
        assertEquals(2, data.getBranchesEvaluated());
    }

    @Test
    void execute_branchEvaluationErrorReturnsFailedWithTrace() {
        doThrow(new RuntimeException("bad expression"))
                .when(ruleEvaluator).evaluate(params.getBranches().get(0), context);

        TaskExecutionResult result = executor.execute(task, execution, context);

        assertEquals(TaskExecutionResult.Status.FAILED, result.getStatus());
        assertTrue(result.getErrorMessage().contains("bad expression"));
        ConditionalTaskExecutionData data = (ConditionalTaskExecutionData) result.getExecutionData();
        assertEquals(1, data.getEvaluations().size());
        assertTrue(data.getEvaluations().get(0).getError().contains("bad expression"));
    }

    @Test
    void execute_invalidParametersReturnsFailed() {
        task.setParameters(new HttpTaskParameters());

        TaskExecutionResult result = executor.execute(task, execution, context);

        assertEquals(TaskExecutionResult.Status.FAILED, result.getStatus());
        assertTrue(result.getErrorMessage().contains("Invalid parameters"));
    }
}
