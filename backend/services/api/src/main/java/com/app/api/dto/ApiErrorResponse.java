package com.app.api.dto;

import com.app.common.constant.ResponseStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApiErrorResponse {
    private ResponseStatus status;
    private String errorCode;
    private String error;
    private String message;
}
