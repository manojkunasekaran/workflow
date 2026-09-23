package com.app.common.model.task.parameters;

import lombok.Data;

@Data
public class RedisTaskParameters implements TaskParameters {
    private String credentialId;
    private String command; // GET, SET, DEL
    private String key;
    private String value;
    private Long ttl;
}
