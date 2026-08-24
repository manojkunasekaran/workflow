package com.app.common.connector;

import lombok.Data;
import java.util.List;

@Data
public class OAuth2Config {
    private String authorizationUrl;
    private String tokenUrl;
    private List<String> defaultScopes;
}
