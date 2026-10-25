package com.app.common.entity;

import lombok.Data;
import org.bson.types.ObjectId;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import com.app.common.auth.OrganizationRole;
import com.app.common.constant.CollectionNames;

import java.time.Instant;

@Data
@Document(collection = CollectionNames.ORGANIZATION_MEMBERSHIPS)
public class OrganizationMembership {
    @Id
    private ObjectId id;

    private ObjectId userId;
    private String organizationId;
    private OrganizationRole role;

    @CreatedDate
    private Instant createdAt;
}
