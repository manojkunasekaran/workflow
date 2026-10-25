package com.app.api.oauth;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

import java.util.Map;

/** Builds {@code application/x-www-form-urlencoded} bodies for OAuth2 token endpoints. */
public final class OAuthHttpForm {

    private OAuthHttpForm() {}

    public static HttpEntity<MultiValueMap<String, String>> postEntity(Map<String, String> fields) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        if (fields != null) {
            fields.forEach((key, value) -> {
                if (value != null && !value.isBlank()) {
                    form.add(key, value);
                }
            });
        }
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.setAccept(java.util.List.of(MediaType.APPLICATION_JSON));
        return new HttpEntity<>(form, headers);
    }
}
