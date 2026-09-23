package com.app.common.model.task.parameters;

import lombok.Data;

@Data
public class MongoTaskParameters implements TaskParameters {
    private String credentialId;
    private String operation; // FIND, INSERT, UPDATE, DELETE
    private String collection;
    private String filter;
    private String document;
}
