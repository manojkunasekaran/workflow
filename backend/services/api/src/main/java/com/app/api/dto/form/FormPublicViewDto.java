package com.app.api.dto.form;

import com.app.common.model.form.FormPageDefinition;
import com.app.common.model.task.parameters.FormTaskParameters;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class FormPublicViewDto {
    public enum Phase {
        LANDING,
        STEP,
        COMPLETE
    }

    private Phase phase;
    private String workflowName;
    private FormPageDefinition page;
    private String sessionToken;
    private FormTaskParameters.EndType completionType;
    private String completionMessage;
    private String redirectUrl;
    private String customHtml;
    private String executionId;
}
