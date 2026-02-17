package com.app.common.entity;

import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springframework.data.mongodb.core.mapping.Document;

import com.app.common.model.base.Auditable;
import com.app.common.model.variable.VariableType;
import com.app.common.model.variable.VariableValue;
import com.app.common.model.task.WorkflowTask;

import org.springframework.data.annotation.Id;
import java.util.List;
import java.util.Map;
import com.app.common.constant.CollectionNames;

@Data
@EqualsAndHashCode(callSuper = true)
@Document(collection = CollectionNames.WORKFLOW_DEFINITIONS)
public class WorkflowDefinition extends Auditable {
    @Id
    private String id;
    private String name;
    private List<WorkflowTask> tasks;

    /**
     * Workflow-level variables that can be referenced via $variables.variableName.
     * Key: variable name, Value: typed variable with default value.
     */
    private Map<String, VariableValue> variables;

    /**
     * Schema defining expected trigger inputs for this workflow.
     * Used for validation and UI auto-generation.
     */
    private List<WorkflowInput> inputs;

    /**
     * Defines an expected input parameter for the workflow.
     */
    @Data
    public static class WorkflowInput {
        private String name;
        private VariableType type;
        private String description;
        private boolean required;
        private Object defaultValue;
    }
}
