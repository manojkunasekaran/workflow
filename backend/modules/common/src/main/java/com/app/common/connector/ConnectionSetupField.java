package com.app.common.connector;

import lombok.Data;

@Data
public class ConnectionSetupField {
    private String key;
    private String label;
    private String placeholder;
    private String hint;
    private String docUrl;
    private boolean sensitive;
}
