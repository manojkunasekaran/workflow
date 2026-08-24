package com.app.common.connector;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FieldOption {
    private String label;
    private String value;
    private String description;
}
