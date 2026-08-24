package com.app.common.connector;

import lombok.Data;
import java.util.List;

@Data
public class CredentialGuide {
    private List<CredentialGuideField> fields;

    @Data
    public static class CredentialGuideField {
        private String key;
        private String label;
        private String hint;
        private String docUrl;
        private List<String> requiredScopes;
    }
}
