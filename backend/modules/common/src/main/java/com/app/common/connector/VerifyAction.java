package com.app.common.connector;

import lombok.Data;
import java.util.Map;

@Data
public class VerifyAction {
    private String method;
    private String path;
    private Map<String, String> headers;
}
