package com.app.api.dto;

import lombok.Data;

@Data
public class DemoSignInRequest {
    /** {@code admin} or {@code user} */
    private String role;
}
