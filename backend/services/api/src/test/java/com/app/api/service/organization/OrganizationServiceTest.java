package com.app.api.service.organization;

import com.app.api.dto.CreateOrganizationRequest;
import com.app.persistence.repository.OrganizationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class OrganizationServiceTest {

    private OrganizationRepository organizationRepository;
    private OrganizationService service;

    @BeforeEach
    void setUp() {
        organizationRepository = mock(OrganizationRepository.class);
        service = new OrganizationService(organizationRepository);
    }

    @Test
    void createAssignsIdAndName() {
        when(organizationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        CreateOrganizationRequest req = new CreateOrganizationRequest();
        req.setName("Acme");
        var response = service.createOrganization(req);
        assertThat(response.getName()).isEqualTo("Acme");
        assertThat(response.getId()).isNotBlank();
    }
}
