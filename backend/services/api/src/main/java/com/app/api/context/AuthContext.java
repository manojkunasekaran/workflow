package com.app.api.context;

import org.bson.types.ObjectId;

public final class AuthContext {

    private static final ThreadLocal<Holder> CURRENT = new ThreadLocal<>();

    private AuthContext() {
    }

    public static void set(ObjectId userId, ObjectId sessionId, boolean platformAdmin) {
        CURRENT.set(new Holder(userId, sessionId, platformAdmin));
    }

    public static ObjectId requireUserId() {
        Holder holder = CURRENT.get();
        if (holder == null || holder.userId() == null) {
            throw new IllegalStateException("No authenticated user in context.");
        }
        return holder.userId();
    }

    public static ObjectId getSessionId() {
        Holder holder = CURRENT.get();
        return holder != null ? holder.sessionId() : null;
    }

    public static boolean isPlatformAdmin() {
        Holder holder = CURRENT.get();
        return holder != null && holder.platformAdmin();
    }

    public static void clear() {
        CURRENT.remove();
    }

    private record Holder(ObjectId userId, ObjectId sessionId, boolean platformAdmin) {
    }
}
