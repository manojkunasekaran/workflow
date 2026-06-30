package com.app.common.model.task.parameters;

import lombok.Data;

@Data
public class HttpTaskParameters implements TaskParameters {
    private String url;
    private String method;
    private Object body;
    private java.util.Map<String, String> headers;
    private String credentialId;
}
