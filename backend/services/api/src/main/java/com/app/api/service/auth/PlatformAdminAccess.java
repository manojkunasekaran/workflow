package com.app.api.service.auth;

import com.app.api.context.AuthContext;
import com.app.common.exception.AccessDeniedException;
import org.springframework.stereotype.Component;

@Component
public class PlatformAdminAccess {

    public void requirePlatformAdmin() {
        if (!AuthContext.isPlatformAdmin()) {
            throw new AccessDeniedException("Platform administrator access required.");
        }
    }
}
