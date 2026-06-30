package com.app.common.entity;

import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springframework.data.mongodb.core.mapping.Document;

import com.app.common.constant.CollectionNames;
import com.app.common.model.base.BaseModel;

import java.util.Map;

@Data
@EqualsAndHashCode(callSuper = true)
@Document(collection = CollectionNames.ORGANIZATIONS)
public class Organization extends BaseModel {
    private String name;
    private Map<String, Object> settings;
}
