package com.app.common.model.base;

import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springframework.data.annotation.Id;

@Data
@EqualsAndHashCode(callSuper = true)
public abstract class BaseModel extends Auditable {
    @Id
    private String id;
}
