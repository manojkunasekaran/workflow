package com.app.api.service.poll;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.HttpStatusCodeException;

import java.util.List;
import java.util.function.Supplier;

/**
 * Bounded HTTP retry policy for poll fetches (429 / 5xx with exponential backoff).
 */
public final class PollHttpRetryPolicy {

    public static final int MAX_RETRIES = 3;
    private static final long INITIAL_DELAY_MS = 1000L;
    private static final long MAX_DELAY_MS = 8000L;

    private PollHttpRetryPolicy() {
    }

    public static <T> ResponseEntity<T> executeWithRetry(Supplier<ResponseEntity<T>> request) {
        long delayMs = INITIAL_DELAY_MS;
        HttpStatusCodeException lastError = null;

        for (int attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
            try {
                return request.get();
            } catch (HttpStatusCodeException e) {
                int statusCode = e.getStatusCode().value();
                if (!isRetryable(statusCode) || attempt > MAX_RETRIES) {
                    throw e;
                }
                lastError = e;
                long waitMs = resolveWaitMs(statusCode, e.getResponseHeaders(), delayMs);
                sleepBounded(waitMs);
                delayMs = Math.min(delayMs * 2, MAX_DELAY_MS);
            }
        }

        if (lastError != null) {
            throw lastError;
        }
        throw new IllegalStateException("Retry loop exited without result");
    }

    static boolean isRetryable(int statusCode) {
        return statusCode == 429 || statusCode >= 500;
    }

    private static long resolveWaitMs(int statusCode, HttpHeaders headers, long defaultDelayMs) {
        if (statusCode != 429 || headers == null) {
            return defaultDelayMs;
        }
        List<String> retryAfter = headers.get("Retry-After");
        if (retryAfter == null || retryAfter.isEmpty()) {
            return defaultDelayMs;
        }
        try {
            return Long.parseLong(retryAfter.get(0)) * 1000L;
        } catch (NumberFormatException ignored) {
            return defaultDelayMs;
        }
    }

    private static void sleepBounded(long waitMs) {
        try {
            Thread.sleep(Math.min(waitMs, MAX_DELAY_MS));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
