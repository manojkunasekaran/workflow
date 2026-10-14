package com.app.persistence.entity;

import com.app.common.constant.CollectionNames;
import com.app.common.model.trigger.FormEnvironment;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Document(collection = CollectionNames.FORM_REGISTRATIONS)
@CompoundIndexes({
        @CompoundIndex(name = "env_slug", def = "{'environment': 1, 'slug': 1}", unique = true),
        @CompoundIndex(name = "workflow_env", def = "{'workflowDefinitionId': 1, 'environment': 1}", unique = true)
})
public class FormRegistrationEntity {
    @Id
    private String id;
    private String organizationId;
    private String workflowDefinitionId;
    private FormEnvironment environment;
    private String slug;
    private boolean active;
    private String sessionSigningSecret;
    private Instant updatedAt;
}
