package com.app.api.controller;

import com.app.api.service.IntegrationCredentialService;
import com.app.common.entity.IntegrationCredential;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// Should read the rules before creating/updating the test files
@WebMvcTest(IntegrationCredentialController.class)
@AutoConfigureMockMvc(addFilters = false) // Bypass security for unit test
public class IntegrationCredentialControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private IntegrationCredentialService service;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void getAllCredentials_shouldReturnList() throws Exception {
        IntegrationCredential cred = new IntegrationCredential();
        cred.setId("cred-123");
        cred.setName("Test");
        
        when(service.getAllCredentials()).thenReturn(List.of(cred));

        mockMvc.perform(get("/credentials"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("cred-123"))
                .andExpect(jsonPath("$[0].name").value("Test"));
    }

    @Test
    void getCredential_shouldReturnCredential() throws Exception {
        IntegrationCredential cred = new IntegrationCredential();
        cred.setId("cred-123");
        
        when(service.getCredentialById("cred-123")).thenReturn(Optional.of(cred));

        mockMvc.perform(get("/credentials/cred-123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("cred-123"));
    }

    @Test
    void createCredential_shouldReturnCreated() throws Exception {
        IntegrationCredential req = new IntegrationCredential();
        req.setName("New Cred");

        IntegrationCredential res = new IntegrationCredential();
        res.setId("cred-123");
        res.setName("New Cred");
        
        when(service.createCredential(any(IntegrationCredential.class))).thenReturn(res);

        mockMvc.perform(post("/credentials")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("cred-123"));
    }

    @Test
    void updateCredential_shouldReturnUpdated() throws Exception {
        IntegrationCredential req = new IntegrationCredential();
        req.setId("cred-123"); req.setName("Updated Cred");

        IntegrationCredential res = new IntegrationCredential();
        res.setId("cred-123");
        res.setName("Updated Cred");
        
        when(service.updateCredential(eq("cred-123"), any(IntegrationCredential.class))).thenReturn(res);

        mockMvc.perform(post("/credentials")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Updated Cred"));
    }

    @Test
    void deleteCredential_shouldReturnNoContent() throws Exception {
        when(service.getCredentialById("cred-123")).thenReturn(Optional.of(new IntegrationCredential()));mockMvc.perform(delete("/credentials/cred-123"))
                .andExpect(status().isOk());
    }
}


