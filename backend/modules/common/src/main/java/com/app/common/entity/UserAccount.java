package com.app.common.entity;

import lombok.Data;
import org.bson.types.ObjectId;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;

import com.app.common.auth.SignInMethod;
import com.app.common.constant.CollectionNames;

import java.time.Instant;

@Data
@Document(collection = CollectionNames.USER_ACCOUNTS)
public class UserAccount {
    @Id
    private ObjectId id;

    private SignInMethod signInMethod;
    /** Stable id from the OAuth provider (e.g. OpenID `sub`). */
    private String providerUserId;

    private String email;
    private String displayName;
    private String pictureUrl;

    /** Global platform operator — not tied to a single organization. */
    private boolean platformAdmin;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}
