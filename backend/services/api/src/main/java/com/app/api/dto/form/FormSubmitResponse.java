package com.app.api.dto.form;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class FormSubmitResponse {
    private FormPublicViewDto next;
}
