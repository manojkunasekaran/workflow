package com.app.api.service.poll;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;

import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Supplier;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PollHttpRetryPolicyTest {

    @Test
    void isRetryable_accepts429And5xx() {
        assertTrue(PollHttpRetryPolicy.isRetryable(429));
        assertTrue(PollHttpRetryPolicy.isRetryable(500));
        assertTrue(!PollHttpRetryPolicy.isRetryable(404));
    }

    @Test
    void executeWithRetry_retriesOnServerError() {
        AtomicInteger attempts = new AtomicInteger();
        Supplier<ResponseEntity<String>> supplier = () -> {
            if (attempts.incrementAndGet() < 2) {
                throw HttpServerErrorException.create(
                        HttpStatus.INTERNAL_SERVER_ERROR, "error", HttpHeaders.EMPTY, new byte[0], StandardCharsets.UTF_8);
            }
            return ResponseEntity.ok("ok");
        };

        ResponseEntity<String> response = PollHttpRetryPolicy.executeWithRetry(supplier);
        assertEquals("ok", response.getBody());
        assertEquals(2, attempts.get());
    }

    @Test
    void executeWithRetry_doesNotRetryClientError() {
        AtomicInteger attempts = new AtomicInteger();
        Supplier<ResponseEntity<String>> supplier = () -> {
            attempts.incrementAndGet();
            throw HttpClientErrorException.create(
                    HttpStatus.BAD_REQUEST, "bad", HttpHeaders.EMPTY, new byte[0], StandardCharsets.UTF_8);
        };

        assertThrows(HttpClientErrorException.class, () -> PollHttpRetryPolicy.executeWithRetry(supplier));
        assertEquals(1, attempts.get());
    }
}
