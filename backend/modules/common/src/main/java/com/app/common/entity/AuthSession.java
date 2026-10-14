package com.app.common.entity;

import lombok.Data;
import org.bson.types.ObjectId;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import com.app.common.constant.CollectionNames;

import java.time.Instant;

@Data
@Document(collection = CollectionNames.AUTH_SESSIONS)
public class AuthSession {
    @Id
    private ObjectId id;

    private ObjectId userId;
    private String activeOrganizationId;
    private Instant expiresAt;

    @CreatedDate
    private Instant createdAt;
}
