package com.app.common.connector;

import lombok.Data;
import java.util.List;

@Data
public class ConnectionSetup {
    private String buttonLabel;
    private String buttonIcon;
    private String description;
    private List<ConnectionSetupField> fields;
}
