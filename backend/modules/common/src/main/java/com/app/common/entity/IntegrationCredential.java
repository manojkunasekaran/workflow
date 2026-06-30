package com.app.common.entity;

import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springframework.data.mongodb.core.mapping.Document;

import com.app.common.constant.CollectionNames;
import com.app.common.model.base.BaseModel;

import java.util.Map;

@Data
@EqualsAndHashCode(callSuper = true)
@Document(collection = CollectionNames.INTEGRATION_CREDENTIALS)
public class IntegrationCredential extends BaseModel {
    private String organizationId;
    private String name;
    private String type;
    private Map<String, String> credentials;
}