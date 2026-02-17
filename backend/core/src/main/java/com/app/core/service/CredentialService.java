package com.app.core.service;

import com.app.common.entity.IntegrationCredential;
import com.app.persistence.repository.IntegrationCredentialRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.lang.NonNull;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CredentialService {

    private final IntegrationCredentialRepository credentialRepository;

    public Optional<IntegrationCredential> getCredential(@NonNull String credentialId) {
        return credentialRepository.findById(credentialId);
    }
}
